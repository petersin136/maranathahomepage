"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { BOOKING_STATUS_OPTIONS } from "@/lib/admin/booking-labels";
import type { BookingRow, BookingStatus } from "@/lib/bookings/types";
import BookingCreateModal from "@/components/admin/BookingCreateModal";

const PAGE_SIZE = 12;
const DEPOSIT_WINDOW_MS = 3 * 60 * 60 * 1000;

type TabKey = "pending" | "confirmed" | "completed" | "cancelled_noshow";
type PeriodKey = "all" | "today" | "week" | "month" | "day";
type SortKey = "date" | "name";

type Artist = { id: string; name: string; role: string };

const TABS: { key: TabKey; label: string; statuses: BookingStatus[]; empty: string }[] = [
  { key: "pending", label: "대기", statuses: ["pending"], empty: "대기 중인 예약이 없습니다." },
  { key: "confirmed", label: "확정", statuses: ["confirmed"], empty: "확정된 예약이 없습니다." },
  { key: "completed", label: "완료", statuses: ["completed"], empty: "완료된 예약이 없습니다." },
  {
    key: "cancelled_noshow",
    label: "취소·노쇼",
    statuses: ["cancelled", "noshow"],
    empty: "취소·노쇼 내역이 없습니다."
  }
];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "all", label: "전체 기간" },
  { key: "today", label: "오늘" },
  { key: "week", label: "이번 주" },
  { key: "month", label: "이번 달" }
];

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: "#8A847C",
  confirmed: "#3A5476",
  completed: "#2A744B",
  cancelled: "#B16242",
  noshow: "#B16242"
};

const STATUS_LABEL: Record<BookingStatus, string> = Object.fromEntries(
  BOOKING_STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<BookingStatus, string>;

const TRIM_KR = "[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";
const TRIM_LATIN = "[text-box-edge:text_alphabetic] [text-box-trim:trim-both]";
// overflow:hidden would clip glyph ink outside the trimmed cap box
const CELL = `block whitespace-nowrap text-ellipsis [overflow-x:clip] ${TRIM_KR}`;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type CancelReason = "customer_request" | "admin_cancel";

const CANCEL_REASONS: { value: CancelReason; label: string }[] = [
  { value: "customer_request", label: "고객 요청 취소" },
  { value: "admin_cancel", label: "관리자 취소" }
];

function reasonLabel(row: BookingRow) {
  if (row.status === "noshow") return "당일 노쇼";
  if (row.cancel_reason === "deposit_timeout") return "입금기한 만료";
  if (row.cancel_reason === "customer_request") return "고객 요청 취소";
  if (row.cancel_reason === "admin_cancel") return "관리자 취소";
  return row.cancel_reason || "취소";
}

const PAYMENT_LABEL: Record<string, string> = { card: "카드결제", transfer: "계좌이체", cash: "현금결제" };

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
  const dow = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return `${y.slice(2)}. ${m}. ${d} (${dow})`;
}

function formatTime(time: string) {
  const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
  const hour = Number(hhmm.split(":")[0]);
  return `${hour >= 12 ? "PM" : "AM"} ${hhmm}`;
}

function ymdOf(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatWon(amount: number | null) {
  return amount != null ? `${amount.toLocaleString("ko-KR")}원` : "—";
}

function formatDayChip(ymd: string) {
  const [y, m, d] = ymd.split("-");
  const dow = WEEKDAYS_EN[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return `${y}. ${m}. ${d}. ${dow}`;
}

function inPeriod(ymd: string, period: PeriodKey, day: string) {
  if (period === "all") return true;
  if (period === "day") return ymd === day;
  const now = new Date();
  const today = ymdOf(now);
  if (period === "today") return ymd === today;
  if (period === "month") return ymd.slice(0, 7) === today.slice(0, 7);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return ymd >= ymdOf(monday) && ymd <= ymdOf(sunday);
}

function formatRemaining(ms: number) {
  const total = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
}

type StatusMenu = {
  target: string;
  current: BookingStatus | null;
  left: number;
  top: number;
  picked: string | null;
  step: "status" | "cancel";
};

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [tab, setTab] = useState<TabKey>("pending");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [day, setDay] = useState(() => ymdOf(new Date()));
  const [artistFilter, setArtistFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "asc" });
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [openFilter, setOpenFilter] = useState<"period" | "artist" | null>(null);
  const [statusMenu, setStatusMenu] = useState<StatusMenu | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const filterRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
        setArtists(
          d.artists.map((a: { id: string; name_kr?: string; name_en?: string; role?: string }) => ({
            id: a.id,
            name: (a.name_kr || a.name_en || a.id).trim(),
            role: (a.role || "").trim()
          }))
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!openFilter) return;
    const onDown = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setOpenFilter(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openFilter]);

  useEffect(() => {
    if (!statusMenu) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (menuRef.current?.contains(el) || el.closest("[data-status-trigger]")) return;
      setStatusMenu(null);
    };
    const close = () => setStatusMenu(null);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [statusMenu]);

  const artistById = useMemo(() => new Map(artists.map((a) => [a.id, a])), [artists]);

  const artistLabel = (row: BookingRow) => {
    const a = artistById.get(row.artist_id);
    const name = row.artist_name || a?.name || "";
    return [name, a?.role].filter(Boolean).join(" ") || "—";
  };

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return bookings.filter((row) => {
      if (q) {
        const phone = row.customer_phone.replace(/\D/g, "");
        const hit =
          row.customer_name.toLowerCase().includes(q) ||
          row.customer_phone.toLowerCase().includes(q) ||
          (qDigits.length > 0 && phone.includes(qDigits));
        if (!hit) return false;
      }
      if (!inPeriod(row.booking_date, period, day)) return false;
      if (artistFilter.length && !artistFilter.includes(row.artist_id)) return false;
      return true;
    });
  }, [bookings, query, period, day, artistFilter]);

  const counts = useMemo(() => {
    const out = {} as Record<TabKey, number>;
    for (const t of TABS) out[t.key] = base.filter((row) => t.statuses.includes(row.status)).length;
    return out;
  }, [base]);

  const activeTab = TABS.find((t) => t.key === tab)!;

  const rows = useMemo(() => {
    const list = base.filter((row) => activeTab.statuses.includes(row.status));
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort.key === "name") return a.customer_name.localeCompare(b.customer_name, "ko") * dir;
      const ak = `${a.booking_date} ${a.booking_time}`;
      const bk = `${b.booking_date} ${b.booking_time}`;
      return ak < bk ? -dir : ak > bk ? dir : 0;
    });
  }, [base, activeTab, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [tab, query, period, day, artistFilter]);

  const pageIds = pageRows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected = pageIds.some((id) => selected.includes(id));

  const togglePage = () =>
    setSelected((cur) =>
      allPageSelected ? cur.filter((id) => !pageIds.includes(id)) : [...new Set([...cur, ...pageIds])]
    );

  const toggleSort = (key: SortKey) =>
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const openStatusMenu = (target: string, current: BookingStatus | null, el: HTMLElement) => {
    if (statusMenu?.target === target) {
      setStatusMenu(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setStatusMenu({ target, current, left: rect.left, top: rect.bottom + 6, picked: null, step: "status" });
  };

  const applyStatus = async (status: BookingStatus, cancelReason?: CancelReason) => {
    if (!statusMenu) return;
    const ids = statusMenu.target === "__bulk" ? selected : [statusMenu.target];
    setStatusMenu({ ...statusMenu, picked: cancelReason ?? status });
    setError(null);
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/admin/bookings/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cancelReason ? { status, cancel_reason: cancelReason } : { status })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.error || "상태 변경 실패");
          return { id, booking: (data.booking ?? null) as BookingRow | null };
        } catch (e) {
          setError(e instanceof Error ? e.message : "상태 변경 실패");
          return null;
        }
      })
    );
    const done = new Map(results.filter(Boolean).map((r) => [r!.id, r!.booking]));
    setBookings((cur) => cur.map((row) => (done.has(row.id) ? (done.get(row.id) ?? { ...row, status, cancel_reason: cancelReason ?? null }) : row)));
    setSelected((cur) => cur.filter((id) => !done.has(id)));
    setStatusMenu(null);
  };

  const resetFilters = () => {
    setQuery("");
    setPeriod("all");
    setArtistFilter([]);
    setOpenFilter(null);
    void load();
  };

  const deadlineCell = (row: BookingRow) => {
    if (tab === "cancelled_noshow") return { text: row.deposit_paid ? "예약금 입금" : "미입금", color: "#8A847C" };
    if (tab === "completed") {
      return { text: (row.payment_method && PAYMENT_LABEL[row.payment_method]) || "—", color: "#8A847C" };
    }
    if (tab !== "pending") return { text: row.deposit_paid ? "예약금 완료" : "미입금", color: "#8A847C" };
    if (row.deposit_paid) return { text: "입금 완료", color: undefined };
    if (row.status !== "pending") return { text: "—", color: undefined };
    const remaining = new Date(row.created_at).getTime() + DEPOSIT_WINDOW_MS - now;
    if (remaining <= 0) return { text: "기한 초과", color: "#E24B4B" };
    return { text: `${formatRemaining(remaining)} 남음`, color: undefined };
  };

  const empty = !loading && rows.length === 0;

  return (
    <div className="flex flex-col pl-[6px] pr-[8px] font-sans-kr text-[#1C1C1C] min-[1440px]:h-[calc(100dvh-5rem)]">
      <div className="flex items-center justify-between pt-6">
        <h1 className="text-[30px] font-bold leading-none tracking-[-0.02em]">예약관리</h1>
        <label className="flex h-[35px] w-[280px] items-center gap-2 rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3">
          <Icon src="/admin-icons/lnb/search-bold.png" className="h-[16px] w-[16px] text-[#9A948C]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="고객명, 연락처 검색"
            className="w-full bg-transparent text-[15px] font-bold text-[#9A948C] outline-none placeholder:text-[#9A948C]"
          />
        </label>
      </div>

      <div className="mt-[66px] flex border-b border-[#E6E1DA]">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "-mb-px flex items-end border-b-2 px-[18px] pb-[14px] text-[16px] leading-none",
                on ? "border-[#1C1C1C] text-[#1C1C1C]" : "border-transparent text-[#8A847C]"
              )}
            >
              <span className={clsx(TRIM_KR, on ? "font-bold" : "font-normal")}>{t.label}</span>
              <span className={clsx(TRIM_KR, "ml-[7px] font-normal", on && "text-[#3A3A3A]")}>
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}

      <div ref={filterRef} className="mt-[34px] flex items-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenFilter((v) => (v === "period" ? null : "period"))}
            className="flex h-[34px] w-[202px] items-center rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
          >
            <CalendarIcon />
            {period === "day" ? (
              <span className={clsx(TRIM_LATIN, "ml-2")}>{formatDayChip(day)}</span>
            ) : (
              <span className={clsx(TRIM_KR, "ml-2")}>{PERIODS.find((p) => p.key === period)?.label}</span>
            )}
            <Icon
              src={openFilter === "period" ? "/admin-icons/lnb/chevron-down-bold.png" : "/admin-icons/lnb/chevron-down.png"}
              className={clsx("ml-auto h-[16px] w-[16px] text-[#9A948C]", openFilter === "period" && "rotate-180")}
            />
          </button>
          {openFilter === "period" ? (
            <Panel>
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setPeriod(p.key);
                    setOpenFilter(null);
                  }}
                  className="flex w-full items-center justify-between px-5 py-2 text-left text-[14px] text-[#1C1C1C] hover:bg-[#F6F4F0]"
                >
                  {p.label}
                  {period === p.key ? <Icon src="/admin-icons/lnb/check.png" className="ml-4 h-[12px] w-[12px]" /> : null}
                </button>
              ))}
              <label className="flex w-full items-center justify-between px-5 py-2 text-[14px] text-[#1C1C1C] hover:bg-[#F6F4F0]">
                날짜 선택
                <input
                  type="date"
                  value={day}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setDay(e.target.value);
                    setPeriod("day");
                    setOpenFilter(null);
                  }}
                  className="ml-4 bg-transparent text-[14px] text-[#1C1C1C] outline-none"
                />
              </label>
            </Panel>
          ) : null}
        </div>

        <div className="relative ml-[6px]">
          <button
            type="button"
            onClick={() => setOpenFilter((v) => (v === "artist" ? null : "artist"))}
            className="flex h-[34px] w-[186px] items-center rounded-[8px] border-[1.5px] border-[#9A948C] bg-white pl-3 pr-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
          >
            <Icon src="/admin-icons/lnb/filter.png" className="h-[15px] w-[15px] text-[#9A948C]" />
            <span className={clsx(TRIM_KR, "ml-2")}>담당자</span>
            <span className="ml-2 inline-flex h-[28px] w-[29px] items-center justify-center bg-[#F3EFEA] text-[12px] font-semibold text-[#9A948C]">
              <span className={TRIM_KR}>{artistFilter.length}</span>
            </span>
            <span className={clsx(TRIM_KR, "ml-2")}>선택</span>
            <Icon
              src={
                openFilter === "artist" || artistFilter.length > 0
                  ? "/admin-icons/lnb/chevron-down-bold.png"
                  : "/admin-icons/lnb/chevron-down.png"
              }
              className={clsx("ml-auto h-[16px] w-[16px] text-[#9A948C]", openFilter === "artist" && "rotate-180")}
            />
          </button>
          {openFilter === "artist" ? (
            <Panel>
              {artists.length === 0 ? (
                <p className="px-5 py-2 text-[14px] text-[#8A847C]">담당자 없음</p>
              ) : (
                artists.map((a) => {
                  const checked = artistFilter.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setArtistFilter((cur) => (checked ? cur.filter((x) => x !== a.id) : [...cur, a.id]))
                      }
                      className="flex w-full items-center gap-4 px-5 py-2 text-left text-[14px] text-[#1C1C1C] hover:bg-[#F6F4F0]"
                    >
                      <CheckMark checked={checked} />
                      {[a.name, a.role].filter(Boolean).join(" ")}
                    </button>
                  );
                })
              )}
            </Panel>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="필터 초기화"
          onClick={resetFilters}
          className="ml-[7px] flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border-[1.5px] border-[#9A948C] text-[#9A948C] hover:bg-[#F6F4F0]"
        >
          <Icon src="/admin-icons/lnb/refresh.png" className="h-[16px] w-[16px]" />
        </button>

        <div className="ml-auto flex items-center">
          {selected.length > 0 ? (
            <>
              <span className={clsx(TRIM_KR, "text-[14px] font-medium text-[#8A847C]")}>
                {selected.length}건 선택
              </span>
              <button
                type="button"
                data-status-trigger
                onClick={(e) => openStatusMenu("__bulk", null, e.currentTarget)}
                className="ml-3 mr-2 flex h-[34px] items-center rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
              >
                <span className={TRIM_KR}>상태 일괄 변경</span>
                <PillChevron up={statusMenu?.target === "__bulk"} className="ml-2" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex h-[34px] w-[136px] items-center justify-center rounded-[8px] bg-[#2F3A2F] text-[14px] font-bold leading-none text-white"
          >
            <Icon src="/admin-icons/lnb/plus.png" className="h-[14px] w-[14px]" />
            <span className={clsx(TRIM_KR, "ml-2")}>새 예약</span>
          </button>
        </div>
      </div>

      <div className="mt-[33px] min-h-0 flex-1 pt-[4px] min-[1440px]:overflow-auto">
        <div className="px-[var(--booking-table-inset)]">
        <table className="w-full table-fixed text-left text-[16px] font-medium">
          <colgroup>
            <col className="w-[var(--booking-col-check)]" />
            <col className="w-[var(--booking-col-date)]" />
            <col className="w-[var(--booking-col-name)]" />
            <col className="w-[var(--booking-col-phone)]" />
            <col className="w-[var(--booking-col-artist)]" />
            <col />
            <col
              className={
                tab === "cancelled_noshow" ? "w-[var(--booking-col-reason)]" : "w-[var(--booking-col-pay)]"
              }
            />
            <col className="w-[var(--booking-col-status)]" />
            <col className="w-[var(--booking-col-manage)]" />
          </colgroup>
          <thead>
            <tr className="border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold leading-none text-[#9A948C]">
              <th className="px-[var(--booking-cell-padx)] pt-0 pb-[14px] text-left align-bottom font-bold">
                <div className="flex h-[10px] items-center">
                <CheckBox
                  checked={allPageSelected}
                  mixed={!allPageSelected && somePageSelected}
                  onChange={togglePage}
                  label="현재 페이지 전체 선택"
                />
                </div>
              </th>
              <th className="px-[var(--booking-cell-padx)] pt-0 pb-[14px] text-left align-bottom font-bold">
                <button type="button" onClick={() => toggleSort("date")} className="flex items-center">
                  <span className={TRIM_KR}>예약일시</span>
                  <SortIcon state={sort.key === "date" ? sort.dir : null} />
                </button>
              </th>
              <th className="px-[var(--booking-cell-padx)] pt-0 pb-[14px] text-left align-bottom font-bold">
                <button type="button" onClick={() => toggleSort("name")} className="flex items-center">
                  <span className={TRIM_KR}>고객명</span>
                  <SortIcon state={sort.key === "name" ? sort.dir : null} />
                </button>
              </th>
              <th className="px-[var(--booking-cell-padx)] pt-0 pb-[14px] text-left align-bottom font-bold">
                <span className={CELL}>연락처</span>
              </th>
              <th className="px-[var(--booking-cell-padx)] pt-0 pb-[14px] text-left align-bottom font-bold">
                <span className={CELL}>담당자</span>
              </th>
              <th className="px-[var(--booking-cell-padx)] pt-0 pb-[14px] text-left align-bottom font-bold">
                <span className={CELL}>예약 시술</span>
              </th>
              <th
                className={clsx(
                  "px-[var(--booking-cell-padx)] pt-0 pb-[14px] align-bottom font-bold",
                  tab === "cancelled_noshow" ? "text-left" : "text-right"
                )}
              >
                <span className={CELL}>
                  {tab === "pending"
                    ? "예약금 / 마감"
                    : tab === "completed"
                      ? "결제금액"
                      : tab === "cancelled_noshow"
                        ? "사유"
                        : "예약금 / 결제"}
                </span>
              </th>
              <th className="px-[var(--booking-cell-padx)] pt-0 pb-[14px] text-center align-bottom font-bold">
                <span className={CELL}>상태변경</span>
              </th>
              <th className="px-[var(--booking-cell-padx)] pt-0 pb-[14px] text-center align-bottom font-bold">
                <span className={CELL}>관리</span>
              </th>
            </tr>
          </thead>
          {!empty ? (
            <tbody>
              {pageRows.map((row) => {
                const checked = selected.includes(row.id);
                const deadline = deadlineCell(row);
                const open = statusMenu?.target === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/admin/bookings/${row.id}`)}
                    className="cursor-pointer border-b border-[#F3EFEA] bg-white hover:bg-[#F6F4F0]"
                  >
                    <td className="h-[73px] px-[var(--booking-cell-padx)] py-0 text-left align-middle" onClick={(e) => e.stopPropagation()}>
                      <CheckBox
                        checked={checked}
                        onChange={() =>
                          setSelected((cur) => (checked ? cur.filter((id) => id !== row.id) : [...cur, row.id]))
                        }
                        label={`${row.customer_name} 선택`}
                      />
                    </td>
                    <td className="h-[73px] px-[var(--booking-cell-padx)] py-0 text-left align-middle">
                      <p className={clsx(CELL, "leading-[23px]")}>
                        {formatDate(row.booking_date)}
                        <br />
                        {formatTime(row.booking_time)}
                      </p>
                    </td>
                    <td className="h-[73px] px-[var(--booking-cell-padx)] py-0 text-left align-middle font-semibold">
                      <span className={CELL}>{row.customer_name}</span>
                    </td>
                    <td className="h-[73px] px-[var(--booking-cell-padx)] py-0 text-left align-middle">
                      <span className={CELL}>{formatPhone(row.customer_phone)}</span>
                    </td>
                    <td className="h-[73px] px-[var(--booking-cell-padx)] py-0 text-left align-middle">
                      <span className={CELL}>{artistLabel(row)}</span>
                    </td>
                    <td className="h-[73px] px-[var(--booking-cell-padx)] py-0 text-left align-middle">
                      <span className={CELL}>{(row.service_names || []).join(" / ") || "—"}</span>
                    </td>
                    <td
                      className={clsx(
                        "h-[73px] px-[var(--booking-cell-padx)] py-0 align-middle text-[15px]",
                        tab === "cancelled_noshow" ? "text-left" : "text-right"
                      )}
                    >
                      <p className={clsx(CELL, "leading-[23px]")}>
                        {tab === "cancelled_noshow"
                          ? reasonLabel(row)
                          : formatWon(tab === "completed" ? row.final_amount : row.deposit_amount)}
                        <br />
                        <span style={deadline.color ? { color: deadline.color } : undefined}>{deadline.text}</span>
                      </p>
                    </td>
                    <td className="h-[73px] px-[var(--booking-cell-padx)] py-0 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        data-status-trigger
                        onClick={(e) => openStatusMenu(row.id, row.status, e.currentTarget)}
                        className="mx-auto flex h-[30px] w-[80px] items-center rounded-[4px] border border-[#C6C6C6] bg-white pl-[10px] text-[15px] font-medium leading-none"
                        style={{ color: STATUS_COLOR[row.status] }}
                      >
                        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: STATUS_COLOR[row.status] }} />
                        <span className={clsx(TRIM_KR, "ml-[9px]")}>{STATUS_LABEL[row.status]}</span>
                        <PillChevron up={open} className="ml-[8px]" />
                      </button>
                    </td>
                    <td className="h-[73px] px-[var(--booking-cell-padx)] py-0 text-center align-middle text-[14px] font-normal text-[#8A847C]">
                      <span className={CELL}>상세보기</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ) : null}
        </table>
        </div>

        {loading && bookings.length === 0 ? (
          <p className={clsx(TRIM_KR, "pt-[156px] text-center text-[13px] text-[#8A847C]")}>불러오는 중…</p>
        ) : null}
        {empty ? (
          <div className="pt-[156px] text-center">
            <p className={clsx(TRIM_KR, "text-[16px] font-semibold text-[#1C1C1C]")}>{activeTab.empty}</p>
            {period === "day" ? (
              <p className={clsx(TRIM_KR, "mt-[15px] text-[14px] text-[#8A847C]")}>
                {tab === "completed"
                  ? "선택하신 날짜에 완료된 시술 내역이 없습니다."
                  : tab === "cancelled_noshow"
                    ? "선택하신 날짜에 취소되거나 노쇼 처리된 예약이 없습니다."
                    : "선택하신 날짜에 예정된 시술 일정이 없습니다."}
              </p>
            ) : tab === "pending" ? (
              <p className={clsx(TRIM_KR, "mt-[15px] text-[14px] text-[#8A847C]")}>
                고객이 카카오톡이나 예약 페이지에서 신청하면 자동으로 등록됩니다.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-16 mt-auto flex shrink-0 items-center justify-end gap-2 pt-5 text-[14px] text-[#8A847C]">
        <PageBtn disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} label="이전">
          <PagerChevron dir="left" />
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
          <PagerChevron dir="right" strong />
        </PageBtn>
      </div>

      {statusMenu ? (
        <div
          ref={menuRef}
          className="fixed z-40 w-[183px] rounded-[12px] border border-[#EFEBE6] bg-white px-[3px] py-[3px] shadow-[0_8px_24px_rgba(28,28,28,0.08)]"
          style={{ left: statusMenu.left, top: statusMenu.top }}
        >
          {(statusMenu.step === "cancel"
            ? CANCEL_REASONS.map((r) => ({ value: "cancelled" as BookingStatus, key: r.value, label: r.label, reason: r.value }))
            : BOOKING_STATUS_OPTIONS.map((o) => ({ value: o.value, key: o.value as string, label: o.label, reason: undefined }))
          ).map((opt, i) => (
            <button
              key={opt.key}
              type="button"
              disabled={statusMenu.picked != null}
              onClick={() => {
                if (statusMenu.step === "status" && opt.value === "cancelled") {
                  setStatusMenu({ ...statusMenu, step: "cancel" });
                  return;
                }
                void applyStatus(opt.value, opt.reason);
              }}
              className={clsx(
                "flex h-[37px] w-full items-center rounded-[2px] pl-[11px] pr-[17px] text-left text-[16px] font-medium leading-none hover:bg-[#F9F8F4]",
                i > 0 && "mt-[4px]"
              )}
              style={{ color: STATUS_COLOR[opt.value] }}
            >
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: STATUS_COLOR[opt.value] }} />
              <span className={clsx(TRIM_KR, "ml-[8px]")}>{opt.label}</span>
              {statusMenu.picked === opt.key ? (
                <Icon src="/admin-icons/lnb/check.png" className="ml-auto h-[15px] w-[15px] text-[#1C1C1C]" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {createOpen ? (
        <BookingCreateModal
          artists={artists.map((a) => ({ id: a.id, label: [a.name, a.role].filter(Boolean).join(" ") }))}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            setTab("pending");
            void load();
          }}
        />
      ) : null}
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

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 top-[40px] z-30 max-h-[280px] w-max min-w-full overflow-auto rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
      {children}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-[17px] w-[17px] shrink-0 text-[#9A948C]" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4" />
      <path d="M5 9.6h.01M8 9.6h.01M11 9.6h.01" strokeWidth={1.8} />
    </svg>
  );
}

function SortIcon({ state }: { state: "asc" | "desc" | null }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="-my-[2px] ml-[8px] h-[12px] w-[12px]" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      {state === "asc" ? <path d="M3 7.5 6 4.5l3 3" /> : null}
      {state === "desc" ? <path d="M3 4.5 6 7.5l3-3" /> : null}
      {state === null ? <path d="M3.5 4.5 6 2l2.5 2.5M3.5 7.5 6 10l2.5-2.5" /> : null}
    </svg>
  );
}

function PillChevron({ up, className }: { up: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 10 6" className={clsx("h-[6px] w-[10px] shrink-0 text-[#9A948C]", className)} fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
      {up ? <path d="M1 5 5 1l4 4" /> : <path d="M1 1l4 4 4-4" />}
    </svg>
  );
}

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={clsx(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] border",
        checked ? "border-[#1C1C1C] bg-[#1C1C1C] text-white" : "border-[#D5D0CA]"
      )}
    >
      {checked ? <Icon src="/admin-icons/lnb/check.png" className="h-[10px] w-[10px]" /> : null}
    </span>
  );
}

function CheckBox({
  checked,
  mixed,
  onChange,
  label
}: {
  checked: boolean;
  mixed?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "flex h-[18px] w-[18px] items-center justify-center rounded-[3px] border",
        checked || mixed ? "border-[#1C1C1C] bg-[#1C1C1C] text-white" : "border-[#D5D0CA] bg-white"
      )}
    >
      {checked ? <Icon src="/admin-icons/lnb/check.png" className="h-[12px] w-[12px]" /> : null}
      {mixed && !checked ? <span className="h-[2px] w-[8px] bg-white" /> : null}
    </button>
  );
}

function PagerChevron({ dir, strong }: { dir: "left" | "right"; strong?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={clsx("h-[20px] w-[20px]", strong ? "text-[#111111]" : "text-[#C8C3BB]")}
      fill="none"
      stroke="currentColor"
      strokeWidth={strong ? 2.6 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "left" ? <path d="M10.5 3.2 5.2 8l5.3 4.8" /> : <path d="M5.5 3.2 10.8 8 5.5 12.8" />}
    </svg>
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
      className="flex h-[28px] w-[28px] items-center justify-center disabled:opacity-60"
    >
      {children}
    </button>
  );
}
