"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import type { Route } from "next";
import { clsx } from "clsx";
import { ADMIN_SIDEBAR_SLOT_ID } from "@/lib/admin/nav";
import type { CustomerDirectoryRow, CustomersDashboard } from "@/lib/admin/customers-data";

export type CustomerState = "new" | "returning" | "churn";

export const STATE_META: Record<CustomerState, { label: string; className: string; dotClass: string }> = {
  new: { label: "신규", className: "member-cell-content", dotClass: "member-dot-new" },
  returning: { label: "재방문", className: "member-cell-content", dotClass: "bg-current" },
  churn: { label: "이탈 위험", className: "font-semibold text-danger", dotClass: "bg-current" }
};

export const STATE_ORDER: CustomerState[] = ["new", "returning", "churn"];

export function customerState(row: CustomerDirectoryRow): CustomerState | null {
  if (row.churnRisk) return "churn";
  if (row.visitCount >= 2) return "returning";
  if (row.visitCount === 1) return "new";
  return null;
}

export const DAY_OPTIONS = [
  { id: "0-30", label: "30일 이내", min: 0, max: 30 },
  { id: "31-60", label: "30~60일", min: 31, max: 60 },
  { id: "61-90", label: "60~90일", min: 61, max: 90 },
  { id: "91+", label: "90일 초과", min: 91, max: 99999 }
] as const;

export function customerProfileHref(phone: string) {
  return `/admin/customers/analytics?phone=${encodeURIComponent(phone)}` as Route;
}

type FilterGroupId = "artist" | "state" | "day";

type CustomerFiltersValue = {
  data: CustomersDashboard | null;
  rows: CustomerDirectoryRow[];
  loading: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  load: () => Promise<void>;
  query: string;
  setQuery: (value: string) => void;
  artists: string[];
  dayIds: string[];
  states: CustomerState[];
};

const CustomerFiltersContext = createContext<CustomerFiltersValue | null>(null);

export function useCustomerFilters() {
  const value = useContext(CustomerFiltersContext);
  if (!value) throw new Error("useCustomerFilters must be used inside CustomerFiltersProvider");
  return value;
}

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

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function CustomerFiltersProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CustomersDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [artists, setArtists] = useState<string[]>([]);
  const [dayIds, setDayIds] = useState<string[]>([]);
  const [states, setStates] = useState<CustomerState[]>([]);
  const [openGroup, setOpenGroup] = useState<FilterGroupId | null>(null);
  const [sidebarSlot, setSidebarSlot] = useState<HTMLElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers");
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as CustomersDashboard);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSidebarSlot(document.getElementById(ADMIN_SIDEBAR_SLOT_ID));
  }, []);

  useEffect(() => {
    if (!openGroup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroup(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openGroup]);

  const rows = useMemo(() => data?.directory ?? [], [data]);

  const artistOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) if (row.artistName) set.add(row.artistName);
    return [...set].sort((a, b) => a.localeCompare(b, "ko"));
  }, [rows]);

  const toggleGroup = (id: FilterGroupId) => setOpenGroup((cur) => (cur === id ? null : id));

  const resetFilters = () => {
    setQuery("");
    setArtists([]);
    setDayIds([]);
    setStates([]);
    setOpenGroup(null);
    void load();
  };

  const hasFilter = Boolean(query) || artists.length > 0 || states.length > 0 || dayIds.length > 0;

  const value: CustomerFiltersValue = {
    data,
    rows,
    loading,
    error,
    setError,
    load,
    query,
    setQuery,
    artists,
    dayIds,
    states
  };

  return (
    <CustomerFiltersContext.Provider value={value}>
      <Suspense fallback={null}>
        <QueryParamSync onQuery={setQuery} />
      </Suspense>
      {children}
      {sidebarSlot
        ? createPortal(
            <div className="sidebar__filters">
              <div className="sidebar__section-head">
                <span className="sidebar__section-label">필터</span>
                {hasFilter ? (
                  <button type="button" onClick={resetFilters} className="sidebar__reset">
                    <Icon src="/admin-icons/lnb/refresh.png" className="h-[12px] w-[12px]" />
                    초기화
                  </button>
                ) : null}
              </div>
              <FilterGroup
                label="담당 디자이너"
                icon="/admin-icons/lnb/user.png"
                count={artists.length}
                open={openGroup === "artist"}
                onToggle={() => toggleGroup("artist")}
              >
                {artistOptions.length === 0 ? (
                  <p className="sidebar__option-empty">디자이너 없음</p>
                ) : (
                  artistOptions.map((name) => (
                    <FilterCheck
                      key={name}
                      label={name}
                      checked={artists.includes(name)}
                      onChange={() => setArtists((cur) => toggle(cur, name))}
                    />
                  ))
                )}
              </FilterGroup>
              <FilterGroup
                label="상태"
                icon="/admin-icons/lnb/list-filter.png"
                count={states.length}
                open={openGroup === "state"}
                onToggle={() => toggleGroup("state")}
              >
                {STATE_ORDER.map((key) => (
                  <FilterCheck
                    key={key}
                    label={STATE_META[key].label}
                    checked={states.includes(key)}
                    onChange={() => setStates((cur) => toggle(cur, key))}
                  />
                ))}
              </FilterGroup>
              <FilterGroup
                label="경과일"
                icon="/admin-icons/lnb/calendar.png"
                count={dayIds.length}
                open={openGroup === "day"}
                onToggle={() => toggleGroup("day")}
              >
                {DAY_OPTIONS.map((opt) => (
                  <FilterCheck
                    key={opt.id}
                    label={opt.label}
                    checked={dayIds.includes(opt.id)}
                    onChange={() => setDayIds((cur) => toggle<string>(cur, opt.id))}
                  />
                ))}
              </FilterGroup>
            </div>,
            sidebarSlot
          )
        : null}
    </CustomerFiltersContext.Provider>
  );
}

function QueryParamSync({ onQuery }: { onQuery: (value: string) => void }) {
  const q = useSearchParams().get("q");
  useEffect(() => {
    if (q != null) onQuery(q);
  }, [q, onQuery]);
  return null;
}

function FilterGroup({
  label,
  icon,
  count,
  open,
  onToggle,
  children
}: {
  label: string;
  icon: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={clsx("sidebar__item", open && "is-active")}
      >
        <Icon src={icon} className="h-[18px] w-[18px]" />
        <span>{label}</span>
        {count > 0 ? <span className="sidebar__filter-count">{count}</span> : null}
        <Icon
          src="/admin-icons/lnb/chevron-down.png"
          className={clsx("ml-auto h-[14px] w-[14px] text-text3 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <div className="sidebar__options">{children}</div> : null}
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
    <button type="button" role="checkbox" aria-checked={checked} onClick={onChange} className="sidebar__option">
      <span className={clsx("sidebar__option-box", checked && "is-checked")}>
        {checked ? <Icon src="/admin-icons/lnb/check.png" className="h-[9px] w-[9px]" /> : null}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
