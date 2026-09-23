"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import BookingActionButtons from "@/components/admin/BookingActionButtons";
import BookingConfirmModal from "@/components/admin/BookingConfirmModal";
import BookingPaymentModal from "@/components/admin/BookingPaymentModal";
import {
  parseRequestLanguage,
  resolveCustomerRequestText,
  splitIntlPhone
} from "@/lib/admin/booking-display";
import { BOOKING_STATUS_OPTIONS, cancelReasonLabel } from "@/lib/admin/booking-labels";
import { useBookingActions } from "@/lib/admin/useBookingActions";
import type { BookingRow, BookingStatus, PaymentMethod } from "@/lib/bookings/types";

const TABS = [
  { key: "pending", label: "대기" },
  { key: "confirmed", label: "확정" },
  { key: "completed", label: "완료" },
  { key: "cancelled_noshow", label: "취소·노쇼" }
] as const;

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체"
};

const CASH_RECEIPT_THRESHOLD = 100_000;

function shortDate(ymd: string) {
  return ymd.length >= 10 ? ymd.slice(2) : ymd;
}

function hasPaymentInfo(b: BookingRow) {
  return b.final_amount != null && b.payment_method != null;
}

function PaymentInfoLine({
  booking,
  onAddPayment
}: {
  booking: BookingRow;
  onAddPayment: () => void;
}) {
  if (!hasPaymentInfo(booking)) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddPayment();
        }}
        className="mt-1.5 text-left font-sans-kr text-[13px] leading-snug text-hu-muted underline-offset-2 hover:underline"
      >
        결제 정보 없음
      </button>
    );
  }

  const method = booking.payment_method as PaymentMethod;
  const amount = `${(booking.final_amount as number).toLocaleString("ko-KR")}원`;
  const needsReceiptWarning =
    method !== "card" &&
    (booking.final_amount as number) >= CASH_RECEIPT_THRESHOLD &&
    !booking.cash_receipt_issued;

  return (
    <p className="mt-1.5 font-sans-kr text-[13px] leading-snug text-hu-muted">
      <span>
        {PAYMENT_METHOD_LABEL[method]} · {amount}
      </span>
      {method !== "card" && booking.cash_receipt_issued ? (
        <span> · 현금영수증 발급</span>
      ) : null}
      {needsReceiptWarning ? (
        <span className="text-[#9b4a4a]"> · 현금영수증 미발급</span>
      ) : null}
    </p>
  );
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
      <h1 className="font-serif text-[28px] tracking-[0.06em] lg:text-[32px]">BOOKINGS</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">예약 관리</p>

      <div className="mt-6 flex gap-5 overflow-x-auto border-b border-hu-black/10 [scrollbar-width:none] lg:mt-8 lg:gap-6 [&::-webkit-scrollbar]:hidden">
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
            const hasMemoLine = Boolean(requestBody) || (cancelled && Boolean(reason));
            const showPaymentLine = b.status === "completed";

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
                  "flex cursor-pointer flex-col gap-3 px-5 py-4 hover:bg-hu-beige/40 lg:flex-row lg:items-center lg:gap-5 lg:px-6 lg:py-5",
                  cancelled && "opacity-40"
                )}
              >
                <div className="flex w-full shrink-0 items-center lg:w-[200px]">
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

                <div className="min-w-0 w-full flex-1 font-sans-kr text-[14px] leading-snug">
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
                  {hasMemoLine ? (
                    <p
                      className="mt-1.5 flex min-w-0 items-baseline gap-2 text-[13px] leading-snug lg:truncate"
                      title={secondLineTitle}
                    >
                      {requestBody ? (
                        <>
                          <span className="shrink-0 text-[11px] tracking-[0.08em] text-hu-black/40">
                            메모
                          </span>
                          <span className="min-w-0 lg:truncate text-hu-muted">{requestBody}</span>
                        </>
                      ) : null}
                      {cancelled && reason ? (
                        <>
                          {requestBody ? <span className="text-hu-black/25">·</span> : null}
                          <span className="min-w-0 lg:truncate text-hu-muted">{reason}</span>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  {showPaymentLine ? (
                    <PaymentInfoLine
                      booking={b}
                      onAddPayment={() => actions.openPayment(b)}
                    />
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 lg:contents">
                  <div
                    className="flex w-[140px] shrink-0 items-center lg:w-[120px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={b.status}
                      disabled={actions.busyId === b.id}
                      onChange={(e) => {
                        e.stopPropagation();
                        const next = e.target.value as BookingStatus;
                        if (next === "completed") {
                          actions.openPayment(b);
                          return;
                        }
                        void actions.updateStatus(b, next);
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
                    className="flex shrink-0 items-center justify-end lg:w-[72px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BookingActionButtons
                      booking={b}
                      busy={actions.busyId === b.id}
                      onCancel={actions.openCancel}
                      onDelete={actions.openDelete}
                    />
                  </div>
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

      {actions.paymentTarget ? (
        <BookingPaymentModal
          booking={actions.paymentTarget}
          busy={actions.busyId === actions.paymentTarget.id}
          onClose={actions.closePayment}
          onSave={(payload) => {
            void actions.savePayment(payload);
          }}
        />
      ) : null}
    </div>
  );
}
