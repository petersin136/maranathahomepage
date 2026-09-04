"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import BookingActionButtons from "@/components/admin/BookingActionButtons";
import BookingConfirmModal from "@/components/admin/BookingConfirmModal";
import {
  parseRequestLanguage,
  resolveCustomerRequestText,
  splitIntlPhone
} from "@/lib/admin/booking-display";
import { BOOKING_STATUS_OPTIONS, cancelReasonLabel } from "@/lib/admin/booking-labels";
import { useBookingActions } from "@/lib/admin/useBookingActions";
import type { BookingRow, BookingStatus } from "@/lib/bookings/types";

const TABS = [
  { key: "pending", label: "대기" },
  { key: "confirmed", label: "확정" },
  { key: "completed", label: "완료" },
  { key: "cancelled_noshow", label: "취소·노쇼" }
] as const;

function shortDate(ymd: string) {
  return ymd.length >= 10 ? ymd.slice(2) : ymd;
}

export default function AdminBookingsPage() {
  const router = useRouter();
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

      <ul className="mt-4 divide-y divide-hu-black/10 bg-hu-white">
        {bookings.length === 0 ? (
          <li className="px-5 py-10 font-sans-kr text-[13px] text-hu-muted">
            해당 상태의 예약이 없습니다.
          </li>
        ) : (
          bookings.map((b) => {
            const cancelled = b.status === "cancelled";
            const reason = cancelReasonLabel(b.cancel_reason);
            const requestText = resolveCustomerRequestText(
              b.customer_request,
              b.admin_memo
            );
            const { lang, body: requestBody } = parseRequestLanguage(requestText);
            const phoneParts = splitIntlPhone(b.customer_phone);
            const phoneDisplay = phoneParts.countryCode ? (
              <>
                <span className="text-hu-muted">{phoneParts.countryCode}</span>
                {phoneParts.national ? (
                  <>
                    {" "}
                    <span>{phoneParts.national}</span>
                  </>
                ) : null}
              </>
            ) : (
              b.customer_phone
            );
            const services = (b.service_names || []).join(", ") || "—";
            const secondLineTitle = [
              requestBody || null,
              cancelled && reason ? reason : null
            ]
              .filter(Boolean)
              .join(" · ");
            const hasSecondLine = Boolean(requestBody) || (cancelled && Boolean(reason));

            return (
              <li
                key={b.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/admin/bookings/${b.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/admin/bookings/${b.id}`);
                  }
                }}
                className={clsx(
                  "flex cursor-pointer items-center gap-5 px-6 py-5 hover:bg-hu-beige/40",
                  cancelled && "opacity-40"
                )}
              >
                <div className="flex w-[200px] shrink-0 items-center">
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-baseline gap-3.5 font-sans-kr text-[15px] leading-snug text-hu-black underline-offset-2 hover:underline"
                  >
                    <span className="tabular-nums text-hu-muted">{shortDate(b.booking_date)}</span>
                    <span className="font-medium">
                      {b.customer_name}
                      {lang ? (
                        <span className="ml-1.5 font-serif text-[10px] font-normal tracking-[0.08em] text-hu-muted">
                          {lang}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </div>

                <div className="min-w-0 flex-1 font-sans-kr text-[14px] leading-snug">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-hu-body">
                    <span>{b.booking_time}</span>
                    <span className="text-hu-black/25">·</span>
                    <span className="whitespace-nowrap">{phoneDisplay}</span>
                    <span className="text-hu-black/25">·</span>
                    <span>{b.artist_name || b.artist_id}</span>
                    <span className="text-hu-black/25">·</span>
                    <span className="min-w-0 truncate">{services}</span>
                    <span className="text-hu-black/25">·</span>
                    <span>입금 {b.deposit_paid ? "Y" : "N"}</span>
                  </div>
                  {hasSecondLine ? (
                    <p
                      className="mt-1.5 flex min-w-0 items-baseline gap-2 truncate text-[13px] leading-snug"
                      title={secondLineTitle}
                    >
                      {requestBody ? (
                        <>
                          <span className="shrink-0 text-[11px] tracking-[0.08em] text-hu-black/40">
                            메모
                          </span>
                          <span className="min-w-0 truncate text-hu-muted">{requestBody}</span>
                        </>
                      ) : null}
                      {cancelled && reason ? (
                        <>
                          {requestBody ? <span className="text-hu-black/25">·</span> : null}
                          <span className="min-w-0 truncate text-hu-muted">{reason}</span>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                </div>

                <div
                  className="flex w-[120px] shrink-0 items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={b.status}
                    disabled={actions.busyId === b.id}
                    onChange={(e) => {
                      e.stopPropagation();
                      void actions.updateStatus(b, e.target.value as BookingStatus);
                    }}
                    className="h-9 w-full border border-hu-black/20 bg-hu-white px-2.5 font-sans-kr text-[13px] outline-none disabled:opacity-40"
                  >
                    {BOOKING_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="flex w-[72px] shrink-0 items-center justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <BookingActionButtons
                    booking={b}
                    busy={actions.busyId === b.id}
                    onCancel={actions.openCancel}
                    onDelete={actions.openDelete}
                  />
                </div>
              </li>
            );
          })
        )}
      </ul>

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
