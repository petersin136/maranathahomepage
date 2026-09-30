"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { BOOKING_STATUS_OPTIONS } from "@/lib/admin/booking-labels";
import type { BookingRow, BookingStatus } from "@/lib/bookings/types";

const PAGE_SIZE = 12;

type StaffCard = {
  id: string;
  label: string;
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: "#8A847C",
  confirmed: "#1F9D62",
  completed: "#1F9D62",
  cancelled: "#E24B4B",
  noshow: "#E24B4B"
};

function Icon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain"
      }}
    />
  );
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatDate(ymd: string) {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${y.slice(2)}. ${m}. ${d}`;
}

function shortTime(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<BookingStatus[]>([]);
  const [artists, setArtists] = useState<string[]>([]);
  const [staff, setStaff] = useState<StaffCard[]>([]);
  const [artistTab, setArtistTab] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [openFilter, setOpenFilter] = useState<"status" | "artist" | "service" | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
      setBookings(data.bookings ?? []);
    } catch (e) {
      setBookings([]);
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok || !Array.isArray(d.artists)) return;
        setStaff(
          d.artists.map((a: { id: string; name_kr?: string; name_en?: string }) => ({
            id: a.id,
            label: (a.name_kr || a.name_en || a.id).trim()
          }))
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!openFilter) return;
    const onDown = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setOpenFilter(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openFilter]);

  const artistOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of bookings) {
      const name = row.artist_name || row.artist_id;
      if (name) set.add(name);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ko"));
  }, [bookings]);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of bookings) {
      for (const name of row.service_names || []) if (name) set.add(name);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ko"));
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((row) => {
      if (q) {
        const phone = row.customer_phone.replace(/\D/g, "");
        const qDigits = q.replace(/\D/g, "");
        const hit =
          row.customer_name.toLowerCase().includes(q) ||
          row.customer_phone.toLowerCase().includes(q) ||
          (qDigits.length > 0 && phone.includes(qDigits));
        if (!hit) return false;
      }
      if (statuses.length && !statuses.includes(row.status)) return false;
      if (artistTab) {
        const person = staff.find((s) => s.id === artistTab);
        const name = row.artist_name || "";
        const hit =
          row.artist_id === artistTab ||
          (person != null &&
            (name === person.label || name.startsWith(`${person.label} `)));
        if (!hit) return false;
      }
      if (artists.length && !artists.includes(row.artist_name || row.artist_id)) return false;
      if (services.length && !(row.service_names || []).some((name) => services.includes(name))) {
        return false;
      }
      return true;
    });
  }, [bookings, query, statuses, artists, services, artistTab, staff]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, statuses, artists, services, artistTab]);

  const resetFilters = () => {
    setQuery("");
    setStatuses([]);
    setArtists([]);
    setArtistTab(null);
    setServices([]);
    setOpenFilter(null);
    void load();
  };

  const emptyDirectory = !loading && bookings.length === 0;
  const noMatch = !loading && bookings.length > 0 && filtered.length === 0;

  return (
    <div className="flex flex-col font-sans-kr text-[#1C1C1C] min-[1440px]:h-[calc(100dvh-5rem)]">
      <div className="flex items-center justify-between gap-6 pt-6">
        <h1 className="flex items-baseline gap-2 text-[30px] font-bold leading-none tracking-[-0.02em]">
          예약관리
          <span className="text-[15px] font-normal text-[#8A847C]">
            총 {bookings.length.toLocaleString("ko-KR")}건
          </span>
        </h1>
        <label className="flex h-[36px] w-[300px] items-center gap-2 rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3">
          <Icon src="/admin-icons/lnb/search-bold.png" className="h-[16px] w-[16px] text-[#9A948C]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="고객명, 연락처 검색"
            className="w-full bg-transparent text-[15px] font-bold text-[#9A948C] outline-none placeholder:text-[#9A948C]"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}

      <div ref={filterRef} className="mt-12 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          icon="/admin-icons/lnb/filter.png"
          label="예약 상태"
          count={statuses.length}
          open={openFilter === "status"}
          onToggle={() => setOpenFilter((v) => (v === "status" ? null : "status"))}
        >
          {BOOKING_STATUS_OPTIONS.map((opt) => (
            <FilterCheck
              key={opt.value}
              label={opt.label}
              checked={statuses.includes(opt.value)}
              onChange={() =>
                setStatuses((cur) =>
                  cur.includes(opt.value) ? cur.filter((x) => x !== opt.value) : [...cur, opt.value]
                )
              }
            />
          ))}
        </FilterChip>
        <FilterChip
          icon="/admin-icons/lnb/filter.png"
          label="담당자"
          count={artists.length}
          open={openFilter === "artist"}
          onToggle={() => setOpenFilter((v) => (v === "artist" ? null : "artist"))}
        >
          {artistOptions.length === 0 ? (
            <p className="px-5 py-2 text-[14px] text-[#8A847C]">담당자 없음</p>
          ) : (
            artistOptions.map((name) => (
              <FilterCheck
                key={name}
                label={name}
                checked={artists.includes(name)}
                onChange={() =>
                  setArtists((cur) =>
                    cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]
                  )
                }
              />
            ))
          )}
        </FilterChip>
        <FilterChip
          icon="/admin-icons/lnb/filter.png"
          label="시술명"
          count={services.length}
          open={openFilter === "service"}
          onToggle={() => setOpenFilter((v) => (v === "service" ? null : "service"))}
        >
          {serviceOptions.length === 0 ? (
            <p className="px-5 py-2 text-[14px] text-[#8A847C]">시술 없음</p>
          ) : (
            serviceOptions.map((name) => (
              <FilterCheck
                key={name}
                label={name}
                checked={services.includes(name)}
                onChange={() =>
                  setServices((cur) =>
                    cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]
                  )
                }
              />
            ))
          )}
        </FilterChip>
        <button
          type="button"
          aria-label="필터 초기화"
          onClick={resetFilters}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border-[1.5px] border-[#9A948C] text-[#9A948C] hover:bg-[#F6F4F0]"
        >
          <Icon src="/admin-icons/lnb/refresh.png" className="h-[16px] w-[16px]" />
        </button>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {staff.map((person) => {
            const on = artistTab === person.id;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => setArtistTab((cur) => (cur === person.id ? null : person.id))}
                className={clsx(
                  "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold",
                  on
                    ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                    : "border-[#9A948C] bg-white text-[#1C1C1C]"
                )}
              >
                {person.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 min-h-0 flex-1 min-[1440px]:overflow-auto">
        <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]">
              <th className="py-3 font-bold">예약일</th>
              <th className="py-3 font-bold">시간</th>
              <th className="py-3 font-bold">고객명</th>
              <th className="py-3 font-bold">연락처</th>
              <th className="py-3 font-bold">담당</th>
              <th className="py-3 font-bold">시술</th>
              <th className="py-3 font-bold">상태</th>
              <th className="py-3 text-right font-bold">관리</th>
            </tr>
          </thead>
          {!emptyDirectory && !noMatch ? (
            <tbody>
              {pageRows.map((row) => {
                const color = STATUS_COLOR[row.status] || "#8A847C";
                const label =
                  BOOKING_STATUS_OPTIONS.find((opt) => opt.value === row.status)?.label || row.status;
                return (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/admin/bookings/${row.id}`)}
                    className="cursor-pointer border-b border-[#F3EFEA] bg-white hover:bg-[#F6F4F0]"
                  >
                    <td className="truncate py-[15px] pr-3">{formatDate(row.booking_date)}</td>
                    <td className="truncate py-[15px] pr-3">{shortTime(row.booking_time)}</td>
                    <td className="truncate py-[15px] pr-3">{row.customer_name}</td>
                    <td className="truncate py-[15px] pr-3 text-[#3A3A3A]">{formatPhone(row.customer_phone)}</td>
                    <td className="truncate py-[15px] pr-3">{row.artist_name || "—"}</td>
                    <td className="truncate py-[15px] pr-3">{(row.service_names || []).join(" / ") || "—"}</td>
                    <td className="py-[15px]">
                      <span className="inline-flex items-center gap-1.5 font-medium" style={{ color }}>
                        <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
                        {label}
                      </span>
                    </td>
                    <td className="py-[15px] text-right font-normal text-[#8A847C]">상세보기</td>
                  </tr>
                );
              })}
            </tbody>
          ) : null}
        </table>

        {loading && bookings.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-[#8A847C]">불러오는 중…</p>
        ) : null}
        {emptyDirectory ? (
          <p className="py-16 text-center text-[14px] font-medium text-[#8A847C]">등록된 예약이 없습니다.</p>
        ) : null}
        {noMatch ? (
          <p className="py-16 text-center text-[14px] font-medium text-[#8A847C]">일치하는 예약이 없습니다.</p>
        ) : null}
      </div>

      <div className="mt-auto flex shrink-0 items-center justify-end gap-1 pt-5 text-[14px] text-[#8A847C]">
        <PageBtn disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} label="이전">
          <Icon src="/admin-icons/lnb/chevron-left.png" className="h-[14px] w-[14px]" />
        </PageBtn>
        {pageButtons(safePage, pageCount).map((item, i) =>
          item === "…" ? (
            <span key={`e-${i}`} className="px-1">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => setPage(item)}
              className={clsx(
                "h-[28px] min-w-[28px] rounded-[6px] px-1",
                item === safePage ? "font-medium text-[#1C1C1C]" : "hover:text-[#1C1C1C]"
              )}
            >
              {item}
            </button>
          )
        )}
        <PageBtn
          disabled={safePage >= pageCount}
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          label="다음"
        >
          <Icon src="/admin-icons/lnb/chevron-right.png" className="h-[14px] w-[14px]" />
        </PageBtn>
      </div>
    </div>
  );
}

function pageButtons(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current > 5 && current < total) {
    const around: Array<number | "…"> = [1, "…", current - 1, current, current + 1, "…", total];
    return around.filter((n, i, arr) => n !== "…" || arr[i - 1] !== "…");
  }
  return [1, 2, 3, 4, 5, "…", total];
}

function FilterChip({
  icon,
  label,
  count,
  open,
  onToggle,
  children
}: {
  icon: string;
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-max">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-[36px] w-max items-center gap-2 rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
      >
        <Icon src={icon} className="h-[15px] w-[15px] text-[#9A948C]" />
        <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">{label}</span>
        <span className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-[4px] bg-[#F3EFEA] px-1 text-[12px] font-semibold leading-none text-[#9A948C]">
          <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">{count}</span>
        </span>
        <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] text-[#1C1C1C]">선택</span>
        <Icon
          src={open || count > 0 ? "/admin-icons/lnb/chevron-down-bold.png" : "/admin-icons/lnb/chevron-down.png"}
          className={clsx("h-[16px] w-[16px] text-[#9A948C]", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="absolute left-0 top-[42px] z-30 max-h-[280px] w-max min-w-full overflow-auto rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function FilterCheck({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center gap-4 px-5 py-2 text-left text-[14px] text-[#1C1C1C] hover:bg-[#F6F4F0]"
    >
      <span
        className={clsx(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] border",
          checked ? "border-[#1C1C1C] bg-[#1C1C1C] text-white" : "border-[#D5D0CA]"
        )}
      >
        {checked ? <Icon src="/admin-icons/lnb/check.png" className="h-[10px] w-[10px]" /> : null}
      </span>
      {label}
    </button>
  );
}

function PageBtn({
  disabled,
  onClick,
  label,
  children
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[28px] w-[28px] items-center justify-center disabled:opacity-30"
    >
      {children}
    </button>
  );
}
