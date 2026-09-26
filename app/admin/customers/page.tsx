"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import type {
  CustomerDirectoryRow,
  CustomerSendStatus,
  CustomersDashboard
} from "@/lib/admin/customers-data";

const PAGE_SIZE = 12;

const STATUS_META: Record<
  CustomerSendStatus,
  { label: string; color: string }
> = {
  pending: { label: "발송 대기", color: "#8A847C" },
  sent: { label: "발송 완료", color: "#1F9D62" },
  failed: { label: "발송 실패", color: "#E24B4B" },
  alert: { label: "알림 발송", color: "#3B6FE0" }
};

const DAY_OPTIONS = [
  { id: "0-7", label: "7일 이내", min: 0, max: 7 },
  { id: "8-30", label: "8–30일", min: 8, max: 30 },
  { id: "31-60", label: "31–60일", min: 31, max: 60 },
  { id: "61+", label: "61일 이상", min: 61, max: 99999 }
] as const;

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

function formatVisit(date: string | null, days: number | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  const head = `${y.slice(2)}. ${m}. ${d}`;
  if (days == null) return head;
  if (days === 0) return `${head} (D-day)`;
  if (days > 0) return `${head} (D+${days})`;
  return `${head} (D${days})`;
}

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<CustomerDirectoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [dayIds, setDayIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<CustomerSendStatus[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"name" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openFilter, setOpenFilter] = useState<"service" | "day" | "status" | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers");
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      const data = json as CustomersDashboard;
      setRows(data.directory ?? []);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openFilter) return;
    const onDown = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setOpenFilter(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openFilter]);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) for (const name of row.services) if (name) set.add(name);
    return [...set].sort((a, b) => a.localeCompare(b, "ko"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (q) {
        const phone = row.phone.replace(/\D/g, "");
        const qDigits = q.replace(/\D/g, "");
        const hit =
          row.name.toLowerCase().includes(q) ||
          row.phone.toLowerCase().includes(q) ||
          (qDigits.length > 0 && phone.includes(qDigits));
        if (!hit) return false;
      }
      if (services.length && !row.services.some((name) => services.includes(name))) return false;
      if (dayIds.length) {
        const days = row.daysSince ?? -1;
        const ok = DAY_OPTIONS.some(
          (opt) => dayIds.includes(opt.id) && days >= opt.min && days <= opt.max
        );
        if (!ok) return false;
      }
      if (statuses.length && !statuses.includes(row.sendStatus)) return false;
      return true;
    });
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name, "ko") * dir;
      return (a.lastVisitDate || "").localeCompare(b.lastVisitDate || "") * dir;
    });
    return list;
  }, [rows, query, services, dayIds, statuses, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row.phone));
  const somePageSelected = pageRows.some((row) => selected.has(row.phone));

  useEffect(() => {
    setPage(1);
  }, [query, services, dayIds, statuses, sortKey, sortDir]);

  const toggleSort = (key: "name" | "date") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const togglePage = () => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (allPageSelected) pageRows.forEach((row) => next.delete(row.phone));
      else pageRows.forEach((row) => next.add(row.phone));
      return next;
    });
  };

  const toggleRow = (phone: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const resetFilters = () => {
    setQuery("");
    setServices([]);
    setDayIds([]);
    setStatuses([]);
    setOpenFilter(null);
    void load();
  };

  const emptyDirectory = !loading && rows.length === 0;
  const noMatch = !loading && rows.length > 0 && filtered.length === 0;

  return (
    <div className="flex flex-col font-sans-kr text-[#1C1C1C] min-[1440px]:h-[calc(100dvh-5rem)]">
      <div className="flex items-center justify-between gap-6 pt-6">
        <h1 className="flex items-baseline gap-2 text-[22px] font-bold leading-none tracking-[-0.02em]">
          고객관리
          <span className="text-[12px] font-normal text-[#8A847C]">
            총 {rows.length.toLocaleString("ko-KR")}명
          </span>
        </h1>
        <label className="flex h-[36px] w-[300px] items-center gap-2 rounded-[8px] border-2 border-[#4D4744] bg-white px-3">
          <Icon src="/admin-icons/lnb/search-bold.png" className="h-[16px] w-[16px] text-[#3A3532]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="고객명, 연락처 검색"
            className="w-full bg-transparent text-[12px] font-normal outline-none placeholder:text-[#B0AAA4]"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-[13px] text-[#9b4a4a]">{error}</p> : null}

      <div ref={filterRef} className="mt-12 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            icon="/admin-icons/lnb/filter.png"
            label="시술명"
            count={services.length}
            open={openFilter === "service"}
            onToggle={() => setOpenFilter((v) => (v === "service" ? null : "service"))}
          >
            {serviceOptions.length === 0 ? (
              <p className="px-3 py-2 text-[13px] text-[#8A847C]">시술 없음</p>
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
          <FilterChip
            icon="/admin-icons/lnb/filter.png"
            label="시술후 경과일"
            count={dayIds.length}
            open={openFilter === "day"}
            onToggle={() => setOpenFilter((v) => (v === "day" ? null : "day"))}
          >
            {DAY_OPTIONS.map((opt) => (
              <FilterCheck
                key={opt.id}
                label={opt.label}
                checked={dayIds.includes(opt.id)}
                onChange={() =>
                  setDayIds((cur) =>
                    cur.includes(opt.id) ? cur.filter((x) => x !== opt.id) : [...cur, opt.id]
                  )
                }
              />
            ))}
          </FilterChip>
          <FilterChip
            icon="/admin-icons/lnb/filter.png"
            label="발송 상태"
            count={statuses.length}
            open={openFilter === "status"}
            onToggle={() => setOpenFilter((v) => (v === "status" ? null : "status"))}
          >
            {(Object.keys(STATUS_META) as CustomerSendStatus[]).map((key) => (
              <FilterCheck
                key={key}
                label={STATUS_META[key].label}
                checked={statuses.includes(key)}
                onChange={() =>
                  setStatuses((cur) =>
                    cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key]
                  )
                }
              />
            ))}
          </FilterChip>
          <button
            type="button"
            aria-label="필터 초기화"
            onClick={resetFilters}
            className="flex h-[40px] w-[40px] items-center justify-center rounded-[8px] border border-[#E4E0DA] text-[#8A847C] hover:text-[#1C1C1C]"
          >
            <Icon src="/admin-icons/lnb/refresh.png" className="h-[16px] w-[16px]" />
          </button>
        </div>
        <div className="flex w-[300px] items-center gap-2">
          <button
            type="button"
            className="inline-flex h-[40px] flex-1 items-center justify-center rounded-[8px] border border-[#E4E0DA] bg-white px-3 text-[14px] font-normal text-[#3A3A3A]"
          >
            메시지 발송
          </button>
          <button
            type="button"
            className="inline-flex h-[40px] flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#2F3A2F] px-3 text-[14px] font-medium text-white"
          >
            <Icon src="/admin-icons/lnb/plus.png" className="h-[14px] w-[14px]" />
            신규 등록
          </button>
        </div>
      </div>

      <div className="mt-8 min-h-0 flex-1 min-[1440px]:overflow-auto">
        <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
          <colgroup>
            <col className="w-[5.7%]" />
            <col className="w-[8.7%]" />
            <col className="w-[14.4%]" />
            <col className="w-[16%]" />
            <col className="w-[18.2%]" />
            <col className="w-[16.2%]" />
            <col className="w-[11.5%]" />
            <col className="w-[9.3%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#EFEBE6] text-[14px] font-normal text-[#9A948C]">
              <th className="py-3 pl-1 font-normal">
                <CheckBox
                  checked={allPageSelected}
                  mixed={!allPageSelected && somePageSelected}
                  onChange={togglePage}
                  label="현재 페이지 전체 선택"
                />
              </th>
              <th className="py-3 font-normal">
                <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1">
                  고객명
                  <Icon src="/admin-icons/lnb/chevron-down.png" className="h-[12px] w-[12px]" />
                </button>
              </th>
              <th className="py-3 font-normal">연락처</th>
              <th className="py-3 font-normal">담당자</th>
              <th className="py-3 font-normal">최근 시술</th>
              <th className="py-3 font-normal">
                <button type="button" onClick={() => toggleSort("date")} className="inline-flex items-center gap-1">
                  최근 시술일
                  <Icon src="/admin-icons/lnb/chevron-down.png" className="h-[12px] w-[12px]" />
                </button>
              </th>
              <th className="py-3 font-normal">발송 상태</th>
              <th className="py-3 font-normal">관리</th>
            </tr>
          </thead>
          {!emptyDirectory && !noMatch ? (
            <tbody>
              {pageRows.map((row) => {
                const on = selected.has(row.phone);
                const status = STATUS_META[row.sendStatus];
                return (
                  <tr
                    key={row.phone}
                    className={clsx(
                      "border-b border-[#F3EFEA]",
                      on ? "bg-[#F4EFE9]" : "bg-white"
                    )}
                  >
                    <td className="py-[15px] pl-1">
                      <CheckBox
                        checked={on}
                        onChange={() => toggleRow(row.phone)}
                        label={`${row.name} 선택`}
                      />
                    </td>
                    <td className="truncate py-[15px] pr-3 font-medium">{row.name}</td>
                    <td className="truncate py-[15px] pr-3 font-medium text-[#3A3A3A]">{formatPhone(row.phone)}</td>
                    <td className="truncate py-[15px] pr-3 font-medium">{row.artistName}</td>
                    <td className="truncate py-[15px] pr-3 font-medium">{row.services.join(" / ") || "—"}</td>
                    <td className="truncate py-[15px] pr-3 font-medium">{formatVisit(row.lastVisitDate, row.daysSince)}</td>
                    <td className="py-[15px]">
                      <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: status.color }}>
                        <span className="h-[7px] w-[7px] rounded-full" style={{ background: status.color }} />
                        {status.label}
                      </span>
                    </td>
                    <td className="py-[15px] font-normal text-[#8A847C]">상세보기</td>
                  </tr>
                );
              })}
            </tbody>
          ) : null}
        </table>

        {loading && rows.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-[#8A847C]">불러오는 중…</p>
        ) : null}

        {emptyDirectory ? (
          <div className="py-16 text-center">
            <p className="text-[14px] font-medium">등록된 고객이 없습니다.</p>
            <p className="mt-1 text-[13px] text-[#8A847C]">
              우측 상단의 신규 등록을 눌러 첫 고객을 추가해 보세요.
            </p>
          </div>
        ) : null}

        {noMatch ? (
          <div className="py-16 text-center">
            <p className="text-[14px] font-medium">일치하는 고객이 없습니다.</p>
            <p className="mt-1 text-[13px] text-[#8A847C]">
              검색어를 확인하거나 필터를 초기화해 보세요.
            </p>
          </div>
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
  const items: Array<number | "…"> = [1, 2, 3, 4, 5, "…", total];
  if (current > 5 && current < total) {
    return [1, "…", current - 1, current, current + 1, "…", total].filter(
      (n, i, arr) => n !== "…" || arr[i - 1] !== "…"
    );
  }
  return items;
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
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-[40px] w-max items-center gap-3 rounded-[8px] border border-[#E4E0DA] bg-white px-9 text-[14px] font-normal text-[#3A3A3A]"
      >
        <Icon src={icon} className="h-[16px] w-[16px] text-[#8A847C]" />
        {label}
        <span className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-[4px] bg-[#F3EFEA] px-1 text-[12px] text-[#6F6963]">
          {count}
        </span>
        선택
        <Icon src="/admin-icons/lnb/chevron-down.png" className="h-[14px] w-[14px] text-[#8A847C]" />
      </button>
      {open ? (
        <div className="absolute left-0 top-[46px] z-20 max-h-[240px] min-w-[180px] overflow-auto rounded-[10px] border border-[#EFEBE6] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
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
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[#F6F4F0]"
    >
      <span
        className={clsx(
          "flex h-[16px] w-[16px] items-center justify-center rounded-[3px] border",
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
