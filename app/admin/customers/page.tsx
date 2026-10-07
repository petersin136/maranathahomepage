"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  STATE_META,
  STATE_ORDER,
  customerDetailHref,
  customerState,
  type CustomerState
} from "@/components/admin/CustomerFilters";
import type { CustomerDirectoryRow, CustomersDashboard } from "@/lib/admin/customers-data";

const PAGE_SIZE = 12;

const STATE_COLOR: Record<CustomerState, string> = {
  churn: "var(--danger)",
  returning: "var(--ink)",
  new: "var(--muted)"
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
  const [states, setStates] = useState<CustomerState[]>([]);
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
          row.artistName.toLowerCase().includes(q) ||
          row.services.some((name) => name.toLowerCase().includes(q)) ||
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
      const state = customerState(row);
      if (states.length && (!state || !states.includes(state))) return false;
      return true;
    });
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name, "ko") * dir;
      return (a.lastVisitDate || "").localeCompare(b.lastVisitDate || "") * dir;
    });
    return list;
  }, [rows, query, services, dayIds, states, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row.phone));
  const somePageSelected = pageRows.some((row) => selected.has(row.phone));

  useEffect(() => {
    setPage(1);
  }, [query, services, dayIds, states, sortKey, sortDir]);

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
    setStates([]);
    setOpenFilter(null);
    void load();
  };

  const emptyDirectory = !loading && rows.length === 0;
  const noMatch = !loading && rows.length > 0 && filtered.length === 0;

  return (
    <div className="flex flex-col font-sans-kr text-[#1C1C1C] min-[1440px]:h-[calc(100dvh-5rem)]">
      <div className="flex items-center justify-between gap-6 pt-6">
        <h1 className="flex items-baseline gap-2 text-[30px] font-bold leading-none tracking-[-0.02em]">
          고객관리
          <span className="text-[15px] font-normal text-[#8A847C]">
            총 {rows.length.toLocaleString("ko-KR")}명
          </span>
        </h1>
        <label className="flex h-[36px] w-[300px] items-center gap-2 rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3">
          <Icon src="/admin-icons/lnb/search-bold.png" className="h-[16px] w-[16px] text-[#9A948C]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="고객명, 연락처 검색"
            className="w-full bg-transparent text-[15px] font-bold text-[#9A948C] outline-none placeholder:text-[#9A948C]"
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
            label="상태"
            count={states.length}
            open={openFilter === "status"}
            onToggle={() => setOpenFilter((v) => (v === "status" ? null : "status"))}
          >
            {STATE_ORDER.map((key) => (
              <FilterCheck
                key={key}
                label={STATE_META[key].label}
                checked={states.includes(key)}
                onChange={() =>
                  setStates((cur) =>
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
            className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] text-[#9A948C] hover:bg-[#F6F4F0]"
          >
            <Icon src="/admin-icons/lnb/refresh.png" className="h-[16px] w-[16px]" />
          </button>
        </div>
        <div className="flex w-[300px] items-center gap-2">
          <button
            type="button"
            className="inline-flex h-[40px] flex-1 items-center justify-center rounded-[8px] border border-[#E4E0DA] bg-white px-3 text-[14px] font-bold text-[#3A3A3A]"
          >
            메시지 발송
          </button>
          <button
            type="button"
            className="inline-flex h-[40px] flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#2F3A2F] px-3 text-[14px] font-bold text-white"
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
            <tr className="border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]">
              <th className="py-3 pl-1 font-bold">
                <CheckBox
                  checked={allPageSelected}
                  mixed={!allPageSelected && somePageSelected}
                  onChange={togglePage}
                  label="현재 페이지 전체 선택"
                />
              </th>
              <th className="py-3 font-bold">
                <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1">
                  고객명
                  <Icon src="/admin-icons/lnb/chevron-down.png" className="h-[12px] w-[12px]" />
                </button>
              </th>
              <th className="py-3 font-bold">연락처</th>
              <th className="py-3 font-bold">담당자</th>
              <th className="py-3 font-bold">최근 시술</th>
              <th className="py-3 font-bold">
                <button type="button" onClick={() => toggleSort("date")} className="inline-flex items-center gap-1">
                  최근 시술일
                  <Icon src="/admin-icons/lnb/chevron-down.png" className="h-[12px] w-[12px]" />
                </button>
              </th>
              <th className="py-3 font-bold">상태</th>
              <th className="py-3 text-right font-bold">관리</th>
            </tr>
          </thead>
          {!emptyDirectory && !noMatch ? (
            <tbody>
              {pageRows.map((row) => {
                const on = selected.has(row.phone);
                const state = customerState(row);
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
                    <td className="truncate py-[15px] pr-3 font-medium">
                      <Link href={customerDetailHref(row.phone)} className="hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="truncate py-[15px] pr-3 font-medium text-[#3A3A3A]">{formatPhone(row.phone)}</td>
                    <td className="truncate py-[15px] pr-3 font-medium">{row.artistName}</td>
                    <td className="truncate py-[15px] pr-3 font-medium">{row.services.join(" / ") || "—"}</td>
                    <td className="truncate py-[15px] pr-3 font-medium">{formatVisit(row.lastVisitDate, row.daysSince)}</td>
                    <td className="py-[15px]">
                      {state ? (
                        <span
                          className="inline-flex items-center gap-[6px] font-medium"
                          style={{ color: STATE_COLOR[state] }}
                        >
                          <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
                          {STATE_META[state].label}
                        </span>
                      ) : (
                        <span className="font-medium">—</span>
                      )}
                    </td>
                    <td className="py-[15px] text-right font-normal text-[#8A847C]">
                      <Link href={customerDetailHref(row.phone)} className="hover:text-[#1C1C1C]">
                        상세보기
                      </Link>
                    </td>
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
    </div>
  );
}

function pageButtons(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current > 5 && current < total) {
    const around: Array<number | "…"> = [1, "…", current - 1, current, current + 1, "…", total];
    return around.filter((n, i, arr) => n !== "…" || arr[i - 1] !== "…");
  }
  const items: Array<number | "…"> = [1, 2, 3, 4, 5, "…", total];
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
    <div className="relative w-max">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-[36px] w-max items-center gap-2 rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
      >
        <Icon src={icon} className="h-[15px] w-[15px] text-[#9A948C]" />
        <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">{label}</span>
        <span className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-[4px] bg-[#F3EFEA] px-1 text-[12px] font-semibold leading-none text-[#9A948C]">
          <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">{count}</span>
        </span>
        <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] text-[#1C1C1C]">선택</span>
        <Icon
          src={open || count > 0 ? "/admin-icons/lnb/chevron-down-bold.png" : "/admin-icons/lnb/chevron-down.png"}
          className={clsx(
            "h-[16px] w-[16px] text-[#9A948C]",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="absolute left-0 top-[42px] z-30 w-max min-w-full overflow-auto rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
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
