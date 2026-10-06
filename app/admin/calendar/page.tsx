"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import BookingActionButtons from "@/components/admin/BookingActionButtons";
import BookingConfirmModal from "@/components/admin/BookingConfirmModal";
import { BOOKING_STATUS_LABEL, cancelReasonLabel } from "@/lib/admin/booking-labels";
import { splitIntlPhone } from "@/lib/admin/booking-display";
import { useBookingActions, type BookingActionTarget } from "@/lib/admin/useBookingActions";
import type { BookingRow } from "@/lib/bookings/types";
import AdminCalendarDesktop, { type CalTab } from "@/components/admin/AdminCalendarDesktop";

type CalBooking = {
  id: string;
  booking_date: string;
  booking_time: string;
  artist_id: string;
  artist_name: string | null;
  customer_name: string;
  status: string;
  service_names: string[] | null;
  cancel_reason: string | null;
};

type Artist = { id: string; name_kr: string; name_en: string };

type PriorVisit = {
  id: string;
  booking_date: string;
  booking_time: string;
  service_names: string[] | null;
  artist_name: string | null;
  status: string;
};

type CustomerSnapshot = {
  priorCount: number;
  visitLabel: string;
  previous: PriorVisit[];
};

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const WEEKDAY_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"] as const;

const STATUS_COLOR: Record<string, string> = {
  pending: "#8A847C",
  confirmed: "#1F9D62",
  completed: "#1F9D62",
  cancelled: "#E24B4B",
  noshow: "#E24B4B"
};

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { from: toYmd(start), to: toYmd(end) };
}

function buildMonthCells(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: { date: string | null; day: number | null }[] = [];
  for (let i = 0; i < lead; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

function shortTime(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function sortByTime(list: CalBooking[]) {
  return [...list].sort((a, b) => a.booking_time.localeCompare(b.booking_time));
}

function formatDayHeading(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const date = new Date(y, m - 1, d);
  return `${m}월 ${d}일 ${WEEKDAY_FULL[date.getDay()]}`;
}

function won(amount: number | null | undefined) {
  if (amount == null) return "—";
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatMonthDay(ymd: string) {
  const [, m, d] = ymd.split("-");
  if (!m || !d) return ymd;
  return `${Number(m)}월 ${Number(d)}일`;
}

function requestText(booking: BookingRow) {
  const direct = booking.customer_request?.trim();
  if (direct) return direct;
  const memo = booking.admin_memo?.trim() || "";
  if (memo.startsWith("[고객요청] ")) return memo.slice("[고객요청] ".length).trim();
  return "";
}

function phoneText(phone: string) {
  const parts = splitIntlPhone(phone);
  return parts.countryCode ? `${parts.countryCode} ${parts.national}` : parts.national;
}

function useBookingDetail(detailId: string | null, tick: number) {
  const [detail, setDetail] = useState<BookingRow | null>(null);
  const [customer, setCustomer] = useState<CustomerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      setCustomer(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/bookings/${detailId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ok) {
          setDetail(d.booking as BookingRow);
          setCustomer(
            d.customer ?? { priorCount: 0, visitLabel: "첫 방문", previous: [] }
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId, tick]);

  return { detail, customer, loading };
}

export default function AdminCalendarPage() {
  const [tab, setTab] = useState<CalTab>("day");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTick, setDetailTick] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const { detail, customer, loading } = useBookingDetail(detailId, detailTick);
  const actions = useBookingActions({
    onSuccess: () => {
      setReloadKey((n) => n + 1);
      setDetailTick((n) => n + 1);
    }
  });

  return (
    <>
      <AdminCalendarDesktop
        tab={tab}
        onTab={setTab}
        onOpenBooking={setDetailId}
        reloadKey={reloadKey}
        legacy={<LegacyCalendar key={tab} forcedView={tab === "week" ? "week" : "month"} />}
      />
      {tab === "day" && detailId ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailId(null);
          }}
        >
          <div className="w-[880px] font-sans-kr text-[#1C1C1C]">
            <DetailCard
              detail={detail}
              customer={customer}
              loading={loading}
              onClose={() => setDetailId(null)}
              busyId={actions.busyId}
              onCancel={actions.openCancel}
              onDelete={actions.openDelete}
            />
          </div>
        </div>
      ) : null}
      {tab === "day" && actions.confirm ? (
        <BookingConfirmModal
          action={actions.confirm.action}
          booking={actions.confirm.booking}
          busy={!!actions.busyId}
          onClose={actions.closeConfirm}
          onConfirm={actions.runConfirm}
        />
      ) : null}
    </>
  );
}

function LegacyCalendar({ forcedView }: { forcedView?: "month" | "week" }) {
  const now = new Date();
  const today = toYmd(now);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [viewState, setView] = useState<"month" | "week">("month");
  const view = forcedView ?? viewState;
  const [artistId, setArtistId] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [bookings, setBookings] = useState<CalBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTick, setDetailTick] = useState(0);
  const { detail, customer, loading: detailLoading } = useBookingDetail(detailId, detailTick);
  const [loadError, setLoadError] = useState<string | null>(null);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const weekStart = useMemo(() => {
    const anchor = selectedDate;
    const idx = anchor ? cells.findIndex((c) => c.date === anchor) : -1;
    if (idx >= 0) return Math.floor(idx / 7) * 7;
    const firstIdx = cells.findIndex((c) => c.date);
    return Math.floor(Math.max(firstIdx, 0) / 7) * 7;
  }, [cells, selectedDate]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalBooking[]>();
    for (const b of bookings) {
      const list = map.get(b.booking_date) || [];
      list.push(b);
      map.set(b.booking_date, list);
    }
    for (const [key, list] of map) map.set(key, sortByTime(list));
    return map;
  }, [bookings]);

  const loadBookings = useCallback(async () => {
    const { from, to } = monthRange(year, month);
    const qs = new URLSearchParams({ from, to });
    if (artistId) qs.set("artistId", artistId);
    setLoadError(null);
    const res = await fetch(`/api/admin/calendar?${qs}`);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
    setBookings(data.bookings);
  }, [year, month, artistId]);

  const actions = useBookingActions({
    onSuccess: () => {
      void loadBookings();
      setDetailTick((n) => n + 1);
    }
  });

  useEffect(() => {
    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setArtists(d.artists);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadBookings().catch((e) => {
      console.error("[calendar] load", e);
      setLoadError(e instanceof Error ? e.message : "로드 실패");
    });
  }, [loadBookings]);

  const visibleCells = view === "week" ? cells.slice(weekStart, weekStart + 7) : cells;
  const weekRows = Math.max(1, Math.ceil(visibleCells.length / 7));
  const selectedList = selectedDate ? byDate.get(selectedDate) || [] : [];
  const error = actions.error || loadError;
  const eventLimit = view === "week" ? 8 : 3;

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const openDay = (date: string) => {
    setSelectedDate(date);
    setDetailId(null);
  };

  const openBooking = (booking: CalBooking) => {
    setSelectedDate(booking.booking_date);
    setDetailId(booking.id);
  };

  return (
    <div className="flex flex-col font-sans-kr text-[#1C1C1C] min-[1440px]:h-[calc(100dvh-5rem)]">
      <div className={clsx("flex flex-wrap items-end justify-between gap-4", !forcedView && "pt-6")}>
        {forcedView ? (
          <p className="text-[15px] font-normal text-[#8A847C]">
            {year}. {String(month + 1).padStart(2, "0")}
          </p>
        ) : (
          <h1 className="flex items-baseline gap-2 text-[30px] font-bold leading-none tracking-[-0.02em]">
            캘린더
            <span className="text-[15px] font-normal text-[#8A847C]">
              {year}. {String(month + 1).padStart(2, "0")}
            </span>
          </h1>
        )}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border-[1.5px] border-[#9A948C] text-[16px] font-bold text-[#1C1C1C]"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border-[1.5px] border-[#9A948C] text-[16px] font-bold text-[#1C1C1C]"
          >
            ›
          </button>
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="ml-1 h-[36px] rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[14px] font-bold text-[#1C1C1C]"
          >
            <option value="">전체 디자이너</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name_kr} {a.name_en}
              </option>
            ))}
          </select>
          <div className={clsx("flex gap-2", forcedView && "hidden")}>
            {(["month", "week"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={clsx(
                  "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold",
                  view === key
                    ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                    : "border-[#9A948C] bg-white text-[#1C1C1C]"
                )}
              >
                {key === "month" ? "월" : "주"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-[13px] text-[#E24B4B]">{error}</p> : null}

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-5 min-[1440px]:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div
          className="grid min-h-[520px] min-w-0 flex-1 grid-cols-7 overflow-hidden rounded-[12px] border border-[#E4E0DA] bg-white min-[1440px]:min-h-0"
          style={{
            gridTemplateRows:
              view === "week"
                ? "40px minmax(220px, 1fr)"
                : `40px repeat(${weekRows}, minmax(72px, 1fr))`
          }}
        >
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={clsx(
                "flex items-center justify-center border-b border-[#E4E0DA] text-[14px] font-bold",
                i < 6 && "border-r",
                d === "일" ? "text-[#E24B4B]" : "text-[#9A948C]"
              )}
            >
              {d}
            </div>
          ))}
          {visibleCells.map((cell, i) => {
            const list = cell.date ? byDate.get(cell.date) || [] : [];
            const shown = list.slice(0, eventLimit);
            const hidden = list.length - shown.length;
            const selected = Boolean(cell.date && cell.date === selectedDate);
            const isToday = cell.date === today;
            const col = i % 7;
            const lastRow =
              view === "week" || i >= visibleCells.length - 7;
            return (
              <div
                key={cell.date || `empty-${i}`}
                role={cell.date ? "button" : undefined}
                tabIndex={cell.date ? 0 : undefined}
                onClick={() => cell.date && openDay(cell.date)}
                onKeyDown={(e) => {
                  if (!cell.date) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDay(cell.date);
                  }
                }}
                className={clsx(
                  "flex min-h-0 flex-col items-stretch gap-0.5 overflow-hidden px-1.5 py-1.5 text-left",
                  col < 6 && "border-r border-[#E4E0DA]",
                  !lastRow && "border-b border-[#E4E0DA]",
                  !cell.date && "bg-[#F9F8F4]",
                  cell.date && "cursor-pointer hover:bg-[#F6F4F0]",
                  selected && "bg-[#F6F4F0] shadow-[inset_0_0_0_1.5px_#2F3A2F]"
                )}
              >
                {cell.day != null ? (
                  <span
                    className={clsx(
                      "inline-flex h-[22px] min-w-[22px] items-center justify-center self-start rounded-full px-1 text-[13px] font-bold leading-none",
                      (isToday || selected) && "bg-[#2F3A2F] text-white",
                      !isToday && !selected && col === 6 && "text-[#E24B4B]",
                      !isToday && !selected && col !== 6 && "text-[#1C1C1C]"
                    )}
                  >
                    {cell.day}
                  </span>
                ) : null}
                {shown.map((b) => {
                  const inactive = b.status === "cancelled" || b.status === "noshow";
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBooking(b);
                      }}
                      className={clsx(
                        "flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-[4px] bg-[#F3EFEA] px-1 py-[2px] text-left text-[12px] leading-[16px]",
                        inactive && "opacity-45",
                        detailId === b.id && "ring-1 ring-[#2F3A2F]"
                      )}
                    >
                      <span
                        className="h-[6px] w-[6px] shrink-0 rounded-full"
                        style={{ background: STATUS_COLOR[b.status] || "#8A847C" }}
                      />
                      <span className="shrink-0 font-bold text-[#9A948C]">{shortTime(b.booking_time)}</span>
                      <span className="min-w-0 truncate font-medium">{b.customer_name}</span>
                    </button>
                  );
                })}
                {hidden > 0 ? (
                  <span className="px-1 text-[11px] font-bold text-[#9A948C]">+{hidden}건</span>
                ) : null}
              </div>
            );
          })}
        </div>

        <DetailCard
          detail={detail}
          customer={customer}
          loading={detailLoading && !!detailId}
          onClose={() => setDetailId(null)}
          busyId={actions.busyId}
          onCancel={actions.openCancel}
          onDelete={actions.openDelete}
        />
        </div>

        <aside className="flex min-h-[240px] w-full shrink-0 flex-col min-[1440px]:h-auto min-[1440px]:w-[320px]">
          <h2 className="flex items-baseline gap-2 text-[20px] font-bold leading-none">
            {selectedDate ? formatDayHeading(selectedDate) : "날짜 선택"}
            <span className="text-[15px] font-normal text-[#8A847C]">{selectedList.length}건</span>
          </h2>
          <ul className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {selectedList.length === 0 ? (
              <li className="py-10 text-[14px] font-medium text-[#8A847C]">예약 없음</li>
            ) : (
              selectedList.map((b) => {
                const cancelled = b.status === "cancelled";
                const reason = cancelReasonLabel(b.cancel_reason);
                const active = detailId === b.id;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => openBooking(b)}
                      className={clsx(
                        "flex w-full flex-col gap-1 rounded-[8px] px-3 py-3 text-left",
                        active ? "bg-[#F3EFEA]" : "hover:bg-[#F6F4F0]",
                        cancelled && "opacity-45"
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-[16px] font-medium">{b.customer_name}</span>
                        <span className="shrink-0 text-[14px] font-bold text-[#9A948C]">
                          {shortTime(b.booking_time)}
                        </span>
                      </span>
                      <span className="text-[13px] text-[#8A847C]">
                        {b.artist_name || "—"} · {(b.service_names || []).join(", ") || "—"}
                      </span>
                      <span
                        className="text-[13px] font-bold"
                        style={{ color: STATUS_COLOR[b.status] || "#8A847C" }}
                      >
                        {BOOKING_STATUS_LABEL[b.status] || b.status}
                        {cancelled && reason ? ` · ${reason}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      </div>

      {actions.confirm ? (
        <BookingConfirmModal
          action={actions.confirm.action}
          booking={actions.confirm.booking}
          busy={!!actions.busyId}
          onClose={actions.closeConfirm}
          onConfirm={actions.runConfirm}
        />
      ) : null}
    </div>
  );
}

function prettyPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("010")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phoneText(phone);
}

function DetailCard({
  detail,
  customer,
  loading,
  onClose,
  busyId,
  onCancel,
  onDelete
}: {
  detail: BookingRow | null;
  customer: CustomerSnapshot | null;
  loading: boolean;
  onClose: () => void;
  busyId: string | null;
  onCancel: (booking: BookingActionTarget) => void;
  onDelete: (booking: BookingActionTarget) => void;
}) {
  const story = detail ? requestText(detail) : "";
  const visits = customer?.previous ?? [];

  return (
    <section className="flex h-[248px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#E4E0DA] bg-white px-6 py-3">
      {!detail ? (
        <p className="m-auto text-center text-[15px] text-[#8A847C]">
          {loading ? "불러오는 중" : "오른쪽 목록에서 예약을 누르면 여기에 상세가 열립니다."}
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[24px] font-bold leading-none tracking-[-0.02em]">
                  {detail.customer_name}
                </h3>
                <span className="rounded-[4px] bg-[#F3EFEA] px-2 py-1 text-[12px] font-bold text-[#1C1C1C]">
                  {customer?.visitLabel || "첫 방문"}
                  {customer && customer.priorCount > 0 ? ` · 이전 ${customer.priorCount}회` : ""}
                </span>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: STATUS_COLOR[detail.status] || "#8A847C" }}
                >
                  {BOOKING_STATUS_LABEL[detail.status] || detail.status}
                </span>
              </div>
              <p className="mt-3 text-[16px] font-medium text-[#1C1C1C]">
                {formatDayHeading(detail.booking_date)}
                <span className="mx-2 text-[#C9C3BB]">/</span>
                {shortTime(detail.booking_time)}
                <span className="mx-2 text-[#C9C3BB]">/</span>
                <span className="font-normal text-[#3A3A3A]">{prettyPhone(detail.customer_phone)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-[36px] shrink-0 items-center rounded-[8px] border-[1.5px] border-[#9A948C] px-3 text-[14px] font-bold"
            >
              닫기
            </button>
          </div>

          <div className="mt-3 flex items-baseline gap-8 border-t border-[#F3EFEA] pt-3 text-left">
            <p className="shrink-0 text-[16px] leading-[24px]">
              <span className="mr-2 text-[13px] font-bold text-[#9A948C]">담당</span>
              <span className="font-medium">{detail.artist_name || "—"}</span>
            </p>
            <p className="shrink-0 text-[16px] leading-[24px]">
              <span className="mr-2 text-[13px] font-bold text-[#9A948C]">예상 금액</span>
              <span className="font-medium">{won(detail.total_amount)}</span>
            </p>
            <p className="shrink-0 text-[16px] leading-[24px]">
              <span className="mr-2 text-[13px] font-bold text-[#9A948C]">예약금</span>
              <span className="font-medium">{won(detail.deposit_amount)}</span>
              <span
                className="ml-2 text-[13px] font-bold"
                style={{ color: detail.deposit_paid ? "#1F9D62" : "#E24B4B" }}
              >
                {detail.deposit_paid ? "입금" : "미입금"}
              </span>
            </p>
            <p className="min-w-0 flex-1 truncate text-[16px] leading-[24px]" title={(detail.service_names || []).join(", ")}>
              <span className="mr-2 text-[13px] font-bold text-[#9A948C]">시술</span>
              <span className="font-medium">{(detail.service_names || []).join(", ") || "—"}</span>
            </p>
          </div>

          <p className="mt-2 text-[15px] leading-[24px] text-[#1C1C1C]">
            <span className="mr-3 font-bold text-[#9A948C]">고객 메모</span>
            {story || "없음"}
          </p>
          <div className="mt-3 text-[15px] leading-[24px] text-[#1C1C1C]">
            <span className="mr-3 font-bold text-[#9A948C]">이전 시술</span>
            {visits.length > 0 ? (
              visits.map((visit, index) => (
                <span key={visit.id}>
                  {index > 0 ? <span className="mx-2 text-[#C9C3BB]">/</span> : null}
                  {formatMonthDay(visit.booking_date)}{" "}
                  {(visit.service_names || []).join(", ") || "시술 없음"}
                </span>
              ))
            ) : (
              <span className="text-[#8A847C]">없음</span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-end gap-4 pt-2">
            <Link
              href={`/admin/bookings/${detail.id}`}
              className="text-[14px] font-bold underline-offset-2 hover:underline"
            >
              예약 화면
            </Link>
            <BookingActionButtons
              booking={detail}
              busy={busyId === detail.id}
              onCancel={onCancel}
              onDelete={onDelete}
              layout="row"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Fact({
  label,
  value,
  note,
  noteColor
}: {
  label: string;
  value: string;
  note?: string;
  noteColor?: string;
}) {
  return (
    <p className="text-[16px] leading-[24px]">
      <span className="mr-2 text-[13px] font-bold text-[#9A948C]">{label}</span>
      <span className="font-medium text-[#1C1C1C]">{value}</span>
      {note ? (
        <span className="ml-2 text-[13px] font-bold" style={{ color: noteColor }}>
          {note}
        </span>
      ) : null}
    </p>
  );
}
