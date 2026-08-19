"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import BookingActionButtons from "@/components/admin/BookingActionButtons";
import BookingConfirmModal from "@/components/admin/BookingConfirmModal";
import { BOOKING_STATUS_OPTIONS, cancelReasonLabel } from "@/lib/admin/booking-labels";
import { useBookingActions } from "@/lib/admin/useBookingActions";
import type { BookingRow, BookingStatus } from "@/lib/bookings/types";

const TABS = [
  { key: "pending", label: "대기" },
  { key: "confirmed", label: "확정" },
  { key: "completed", label: "완료" },
  { key: "cancelled_noshow", label: "취소·노쇼" }
] as const;

export default function AdminBookingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoadError(null);
    const res = await fetch(`/api/admin/bookings?status=${tab}`);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
    setBookings(data.bookings);
  }, [tab]);

  const actions = useBookingActions({
    onSuccess: () => loadBookings()
  });

  useEffect(() => {
    loadBookings().catch((e) => {
      console.error("[bookings] load", e);
      setLoadError(e instanceof Error ? e.message : "로드 실패");
    });
  }, [loadBookings]);

  const error = actions.error || loadError;

  return (
    <div>
      <h1 className="font-serif text-[32px] tracking-[0.06em]">BOOKINGS</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">예약 관리</p>

      <div className="mt-8 flex gap-6 border-b border-hu-black/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "pb-3 font-serif text-[13px] tracking-[0.1em]",
              tab === t.key
                ? "border-b-2 border-hu-black text-hu-black"
                : "text-hu-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-6 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}

      <div className="mt-4 overflow-x-auto bg-hu-white">
        <table className="min-w-full text-left font-sans-kr text-[13px]">
          <thead className="border-b border-hu-black/10 text-[11px] tracking-[0.08em] text-hu-muted">
            <tr>
              <th className="px-4 py-3 font-medium">날짜</th>
              <th className="px-4 py-3 font-medium">시간</th>
              <th className="px-4 py-3 font-medium">고객</th>
              <th className="px-4 py-3 font-medium">전화</th>
              <th className="px-4 py-3 font-medium">디자이너</th>
              <th className="px-4 py-3 font-medium">시술</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">사유</th>
              <th className="px-4 py-3 font-medium">입금</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-hu-muted">
                  해당 상태의 예약이 없습니다.
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const cancelled = b.status === "cancelled";
                const reason = cancelReasonLabel(b.cancel_reason);
                return (
                  <tr
                    key={b.id}
                    className={clsx(
                      "border-b border-hu-black/5 hover:bg-hu-beige/40",
                      cancelled && "opacity-40"
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${b.id}`} className="underline-offset-2 hover:underline">
                        {b.booking_date}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{b.booking_time}</td>
                    <td className="px-4 py-3">{b.customer_name}</td>
                    <td className="px-4 py-3">{b.customer_phone}</td>
                    <td className="px-4 py-3">{b.artist_name || b.artist_id}</td>
                    <td className="px-4 py-3">{(b.service_names || []).join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={b.status}
                        disabled={actions.busyId === b.id}
                        onChange={(e) => {
                          e.stopPropagation();
                          void actions.updateStatus(b, e.target.value as BookingStatus);
                        }}
                        className="border border-hu-black/15 bg-hu-white px-2 py-1 font-sans-kr text-[12px] disabled:opacity-40"
                      >
                        {BOOKING_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-hu-muted">
                      {cancelled ? reason || "—" : "—"}
                    </td>
                    <td className="px-4 py-3">{b.deposit_paid ? "Y" : "N"}</td>
                    <td className="px-4 py-3">
                      <BookingActionButtons
                        booking={b}
                        busy={actions.busyId === b.id}
                        onCancel={actions.openCancel}
                        onDelete={actions.openDelete}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
