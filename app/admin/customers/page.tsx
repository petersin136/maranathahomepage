"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  DAY_OPTIONS,
  STATE_META,
  customerProfileHref,
  customerState,
  useCustomerFilters
} from "@/components/admin/CustomerFilters";

const PAGE_SIZE = 12;

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
  if (!date) return null;
  const [y, m, d] = date.split("-");
  const head = `${y.slice(2)}. ${m}. ${d}`;
  if (days == null) return head;
  if (days === 0) return `${head} (D-day)`;
  if (days > 0) return `${head} (D+${days})`;
  return `${head} (D${days})`;
}

function Empty() {
  return <span className="member-cell-empty">-</span>;
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const { rows, loading, error, query, setQuery, artists, dayIds, states } = useCustomerFilters();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"name" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
          (qDigits.length > 0 && phone.includes(qDigits));
        if (!hit) return false;
      }
      if (artists.length && !artists.includes(row.artistName)) return false;
      if (dayIds.length) {
        const days = row.daysSince ?? -1;
        const ok = DAY_OPTIONS.some(
          (opt) => dayIds.includes(opt.id) && days >= opt.min && days <= opt.max
        );
        if (!ok) return false;
      }
      if (states.length) {
        const state = customerState(row);
        if (!state || !states.includes(state)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name, "ko") * dir;
      return (a.lastVisitDate || "").localeCompare(b.lastVisitDate || "") * dir;
    });
    return list;
  }, [rows, query, artists, dayIds, states, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, artists, dayIds, states, sortKey, sortDir]);

  const toggleSort = (key: "name" | "date") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const emptyDirectory = !loading && rows.length === 0;
  const noMatch = !loading && rows.length > 0 && filtered.length === 0;

  return (
    <div className="member-panel">
      <div className="member-toolbar">
        <label className="member-search member-search__box">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="고객명, 연락처 검색"
            aria-label="고객 검색"
            className="member-search__input"
          />
          <span className="member-search__toggle" aria-hidden>
            <ChevronDown open={false} />
          </span>
        </label>

        <button type="button" className="member-register-btn">
          <Icon src="/admin-icons/lnb/plus.png" className="h-[16px] w-[16px]" />
          신규 등록
        </button>
      </div>

      {error ? <p className="mt-4 text-pc-base text-danger">{error}</p> : null}

      <div className="member-card">
        <div className="overflow-x-auto">
        <table className="member-table min-w-[1040px]">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[8%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[6%]" />
            <col className="w-[8%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="is-center">번호</th>
              <th>
                <SortButton label="고객명" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              </th>
              <th>연락처</th>
              <th>담당 디자이너</th>
              <th>최근 시술</th>
              <th className="is-visit">
                <SortButton
                  label="최근 방문일"
                  active={sortKey === "date"}
                  dir={sortDir}
                  onClick={() => toggleSort("date")}
                />
              </th>
              <th className="is-center">방문 횟수</th>
              <th>누적 매출</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          {!emptyDirectory && !noMatch ? (
            <tbody>
              {pageRows.map((row, idx) => {
                const state = customerState(row);
                const visit = formatVisit(row.lastVisitDate, row.daysSince);
                const serviceText = row.services.filter(Boolean).join(" / ");
                return (
                  <tr
                    key={row.phone}
                    onClick={() => router.push(customerProfileHref(row.phone))}
                    className="cursor-pointer"
                  >
                    <td className="member-cell-num is-center">{idx + 1}</td>
                    <td className="member-cell-name">{row.name || <Empty />}</td>
                    <td className="member-cell-sub whitespace-nowrap tabular-nums">
                      {row.phone ? formatPhone(row.phone) : <Empty />}
                    </td>
                    <td className="member-cell-sub">{row.artistName || <Empty />}</td>
                    <td className="member-cell-content truncate">{serviceText || <Empty />}</td>
                    <td className="member-cell-visit is-visit whitespace-nowrap tabular-nums">{visit ?? <Empty />}</td>
                    <td className="member-cell-content is-center tabular-nums">
                      {row.visitCount.toLocaleString("ko-KR")}회
                    </td>
                    <td className="member-cell-content tabular-nums">
                      {row.lifetimeRevenue.toLocaleString("ko-KR")}원
                    </td>
                    <td>
                      {state ? (
                        <span className={clsx("inline-flex items-center gap-[6px]", STATE_META[state].className)}>
                          <span className={clsx("h-[7px] w-[7px] rounded-full", STATE_META[state].dotClass)} />
                          {STATE_META[state].label}
                        </span>
                      ) : (
                        <Empty />
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        aria-label={`${row.name} 고객 분석 보기`}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(customerProfileHref(row.phone));
                        }}
                        className="member-action-btn"
                      >
                        <Icon src="/admin-icons/lnb/chevron-right.png" className="h-[14px] w-[14px]" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ) : null}
        </table>
        </div>

        {loading && rows.length === 0 ? (
          <p className="py-16 text-center text-pc-md text-text3">불러오는 중…</p>
        ) : null}

        {emptyDirectory ? (
          <div className="py-16 text-center">
            <p className="text-pc-md font-semibold text-text1">등록된 고객이 없습니다.</p>
            <p className="mt-1 text-pc-base text-text3">우측 상단의 신규 등록을 눌러 첫 고객을 추가해 보세요.</p>
          </div>
        ) : null}

        {noMatch ? (
          <div className="py-16 text-center">
            <p className="text-pc-md font-semibold text-text1">일치하는 고객이 없습니다.</p>
            <p className="mt-1 text-pc-base text-text3">검색어를 확인하거나 필터를 초기화해 보세요.</p>
          </div>
        ) : null}
      </div>

      <div className="member-pager-wrap">
        <div className="member-pager">
          <button
            type="button"
            aria-label="이전 페이지"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="member-pager__arrow"
          >
            <ArrowIcon dir="left" />
          </button>
          <div className="member-pager__pages">
            {buildPageList(safePage, pageCount).map((item, i) =>
              item === "…" ? (
                <span key={`gap-${i}`} className="member-pager__ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={clsx("member-pager__page", item === safePage && "is-active")}
                >
                  {item}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="member-pager__arrow"
          >
            <ArrowIcon dir="right" />
          </button>
        </div>
      </div>
    </div>
  );
}

function buildPageList(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={clsx("h-[18px] w-[18px] transition-transform", open && "rotate-180")}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ArrowIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[20px] w-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "left" ? (
        <>
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </>
      ) : (
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      )}
    </svg>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="relative inline-flex items-center">
      {label}
      <Icon
        src="/admin-icons/lnb/chevron-down.png"
        className={clsx(
          "absolute left-full top-1/2 ml-1 h-[12px] w-[12px] -translate-y-1/2",
          active && dir === "asc" && "rotate-180"
        )}
      />
    </button>
  );
}
