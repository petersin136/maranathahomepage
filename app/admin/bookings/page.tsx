"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { ADMIN_SIDEBAR_SLOT_ID } from "@/lib/admin/nav";
import { BOOKING_STATUS_OPTIONS } from "@/lib/admin/booking-labels";
import type { BookingRow, BookingStatus } from "@/lib/bookings/types";

const PAGE_SIZE = 12;

type StaffCard = {
  id: string;
  label: string;
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  pending: "booking-status-pending",
  confirmed: "booking-status-ok",
  completed: "booking-status-ok",
  cancelled: "booking-status-bad",
  noshow: "booking-status-bad"
};

function Icon({ src, className }: { src: string; className?: string }) {
  return (
    <div className="member-panel">
      <div className="member-toolbar">
        <label className="member-search member-search__box">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="고객명, 연락처 검색"
            aria-label="예약 검색"
            className="member-search__input"
          />
          <span className="member-search__toggle" aria-hidden>
            <Icon src="/admin-icons/lnb/chevron-down.png" className="h-[16px] w-[16px]" />
          </span>
        </label>
      </div>

      {sidebarSlot
        ? createPortal(
            <div className="sidebar__filters">
              <div className="sidebar__section-head">
                <span className="sidebar__section-label">필터</span>
                {query || statuses.length || artists.length || services.length || artistTab ? (
                  <button type="button" onClick={resetFilters} className="sidebar__reset">
                    <Icon src="/admin-icons/lnb/refresh.png" className="h-[12px] w-[12px]" />
                    초기화
                  </button>
                ) : null}
              </div>
              <FilterGroup
                label="예약 상태"
                icon="/admin-icons/lnb/list-filter.png"
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
              </FilterGroup>
              <FilterGroup
                label="담당자"
                icon="/admin-icons/lnb/user.png"
                count={artists.length + (artistTab ? 1 : 0)}
                open={openFilter === "artist"}
                onToggle={() => setOpenFilter((v) => (v === "artist" ? null : "artist"))}
              >
                {staff.map((person) => (
                  <FilterCheck
                    key={person.id}
                    label={person.label}
                    checked={artistTab === person.id}
                    onChange={() => setArtistTab((cur) => (cur === person.id ? null : person.id))}
                  />
                ))}
                {artistOptions.length === 0 ? (
                  <p className="sidebar__option-empty">담당자 없음</p>
                ) : (
                  artistOptions.map((name) => (
                    <FilterCheck
                      key={name}
                      label={name}
                      checked={artists.includes(name)}
                      onChange={() =>
                        setArtists((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]))
                      }
                    />
                  ))
                )}
              </FilterGroup>
              <FilterGroup
                label="시술명"
                icon="/admin-icons/lnb/calendar.png"
                count={services.length}
                open={openFilter === "service"}
                onToggle={() => setOpenFilter((v) => (v === "service" ? null : "service"))}
              >
                {serviceOptions.length === 0 ? (
                  <p className="sidebar__option-empty">시술 없음</p>
                ) : (
                  serviceOptions.map((name) => (
                    <FilterCheck
                      key={name}
                      label={name}
                      checked={services.includes(name)}
                      onChange={() =>
                        setServices((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]))
                      }
                    />
                  ))
                )}
              </FilterGroup>
            </div>,
            sidebarSlot
          )
        : null}

      {error ? <p className="mt-4 text-pc-base text-danger">{error}</p> : null}

      <div className="member-card">
        <div className="overflow-x-auto">
          <table className="member-table min-w-[1040px]">
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
              <tr>
                <th>예약일</th>
                <th className="is-center">시간</th>
                <th>고객명</th>
                <th>연락처</th>
                <th>담당</th>
                <th>시술</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            {!emptyDirectory && !noMatch ? (
              <tbody>
                {pageRows.map((row) => {
                  const label =
                    BOOKING_STATUS_OPTIONS.find((opt) => opt.value === row.status)?.label || row.status;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/admin/bookings/${row.id}`)}
                      className="cursor-pointer"
                    >
                      <td className="member-cell-content tabular-nums">{formatDate(row.booking_date)}</td>
                      <td className="member-cell-content is-center tabular-nums">{shortTime(row.booking_time)}</td>
                      <td className="member-cell-name">{row.customer_name}</td>
                      <td className="member-cell-sub whitespace-nowrap tabular-nums">{formatPhone(row.customer_phone)}</td>
                      <td className="member-cell-sub">{row.artist_name || "—"}</td>
                      <td className="member-cell-content truncate">{(row.service_names || []).join(" / ") || "—"}</td>
                      <td>
                        <span className={clsx("inline-flex items-center gap-[6px]", STATUS_CLASS[row.status])}>
                          <span className="h-[7px] w-[7px] rounded-full bg-current" />
                          {label}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          aria-label={`${row.customer_name} 상세보기`}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/bookings/${row.id}`);
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
        {loading && bookings.length === 0 ? (
          <p className="py-16 text-center text-pc-md text-text3">불러오는 중…</p>
        ) : null}
        {emptyDirectory ? (
          <p className="py-16 text-center text-pc-md font-semibold text-text1">등록된 예약이 없습니다.</p>
        ) : null}
        {noMatch ? (
          <p className="py-16 text-center text-pc-md font-semibold text-text1">일치하는 예약이 없습니다.</p>
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
            <Icon src="/admin-icons/lnb/chevron-left.png" className="h-[16px] w-[16px]" />
          </button>
          <div className="member-pager__pages">
            {pageButtons(safePage, pageCount).map((item, i) =>
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
            <Icon src="/admin-icons/lnb/chevron-right.png" className="h-[16px] w-[16px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function pageButtons(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
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
