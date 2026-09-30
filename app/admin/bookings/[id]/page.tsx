"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import BookingActionButtons from "@/components/admin/BookingActionButtons";
import BookingConfirmModal from "@/components/admin/BookingConfirmModal";
import BookingPaymentModal from "@/components/admin/BookingPaymentModal";
import { BOOKING_STATUS_OPTIONS, cancelReasonLabel } from "@/lib/admin/booking-labels";
import { useBookingActions } from "@/lib/admin/useBookingActions";
import type { BookingRow, BookingStatus, PaymentMethod } from "@/lib/bookings/types";

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체"
};

export default function AdminBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [memo, setMemo] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/admin/bookings/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setBooking(data.booking);
        setMemo(data.booking.admin_memo || "");
      })
      .catch((e) => {
        console.error("[booking detail] load", e);
        setLoadError(e instanceof Error ? e.message : "로드 실패");
      });
  }, [id]);

  const actions = useBookingActions({
    onSuccess: async (result) => {
      if (result.action === "delete") {
        router.push("/admin/bookings");
        return;
      }
      if (result.booking) {
        setBooking(result.booking);
        setMemo(result.booking.admin_memo || "");
      }
    }
  });

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    actions.setError(null);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "저장 실패");
      setBooking(data.booking);
      setMemo(data.booking.admin_memo || "");
      router.refresh();
    } catch (e) {
      console.error("[booking detail] patch", e);
      setLoadError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const error = actions.error || loadError;
  const busy = saving || !!actions.busyId;

  if (!booking && !error) {
    return <p className="font-sans-kr text-[13px] text-hu-muted">불러오는 중…</p>;
  }

  if (!booking) {
    return <p className="font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p>;
  }

  const reason = cancelReasonLabel(booking.cancel_reason);

  const request =
    booking.customer_request?.trim() ||
    (booking.admin_memo?.startsWith("[고객요청] ")
      ? booking.admin_memo.slice("[고객요청] ".length)
      : "");
  const payment =
    booking.final_amount != null
      ? `${booking.payment_method ? PAYMENT_METHOD_LABEL[booking.payment_method] : "결제"} · ${booking.final_amount.toLocaleString("ko-KR")}원`
      : "없음";

  return (
    <div className="font-sans-kr text-[#1C1C1C]">
      <Link href="/admin/bookings" className="text-[15px] text-[#8A847C]">
        ← 목록
      </Link>
      <h1 className="mt-6 flex items-baseline gap-2 text-[30px] font-bold leading-none tracking-[-0.02em]">
        예약 상세
        <span className="text-[15px] font-normal text-[#8A847C]">{booking.customer_name}</span>
      </h1>

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}

      <div className={clsx("mt-10", booking.status === "cancelled" && "opacity-70")}>
        <dl>
          <Field label="예약일" value={booking.booking_date} />
          <Field label="시간" value={booking.booking_time} />
          <Field label="담당" value={booking.artist_name || booking.artist_id} />
          <Field label="시술" value={(booking.service_names || []).join(", ") || "—"} />
          <Field label="고객" value={booking.customer_name} />
          <Field
            label="성별"
            value={booking.customer_gender === "W" ? "여" : booking.customer_gender === "M" ? "남" : "—"}
          />
          <Field label="연락처" value={booking.customer_phone} />
          <Field
            label="예상 금액"
            value={booking.total_amount != null ? `${booking.total_amount.toLocaleString("ko-KR")}원` : "—"}
          />
          <Field
            label="예약금"
            value={booking.deposit_amount != null ? `${booking.deposit_amount.toLocaleString("ko-KR")}원` : "—"}
          />
          <Field label="결제" value={payment} />
          <Field label="고객 메모" value={request || "없음"} />
        </dl>
        {booking.status === "cancelled" ? (
          <p className="mt-3 text-[15px] leading-[24px]">
            <span className="mr-3 font-bold text-[#9A948C]">취소 사유</span>
            {reason || "—"}
          </p>
        ) : null}

        <div className="mt-8 border-t border-[#F3EFEA] pt-6">
          <p className="text-[15px] font-bold text-[#9A948C]">상태</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BOOKING_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (opt.value === booking.status) return;
                  if (opt.value === "cancelled") {
                    actions.openCancel(booking);
                    return;
                  }
                  if (opt.value === "completed") {
                    actions.openPayment(booking);
                    return;
                  }
                  void actions.updateStatus(booking, opt.value as BookingStatus);
                }}
                className={clsx(
                  "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold",
                  booking.status === opt.value
                    ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                    : "border-[#9A948C] bg-white text-[#1C1C1C]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[#F3EFEA] pt-6">
          <p className="text-[15px] font-bold text-[#9A948C]">예약금 입금</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ deposit_paid: !booking.deposit_paid })}
            className={clsx(
              "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold",
              booking.deposit_paid
                ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                : "border-[#9A948C] bg-white text-[#1C1C1C]"
            )}
          >
            {booking.deposit_paid ? "입금 완료" : "미입금"}
          </button>
        </div>

        <div className="mt-6 border-t border-[#F3EFEA] pt-6">
          <p className="text-[15px] font-bold text-[#9A948C]">관리 메모</p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            className="mt-3 w-full rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 py-2 text-[15px] outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ admin_memo: memo })}
            className="mt-3 inline-flex h-[40px] items-center rounded-[8px] bg-[#2F3A2F] px-4 text-[14px] font-bold text-white disabled:opacity-40"
          >
            {saving ? "저장 중..." : "메모 저장"}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end border-t border-[#F3EFEA] pt-6">
          <BookingActionButtons
            booking={booking}
            busy={busy}
            layout="row"
            onCancel={actions.openCancel}
            onDelete={actions.openDelete}
          />
        </div>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-8 border-b border-[#F3EFEA] py-[15px]">
      <dt className="w-[120px] shrink-0 text-[15px] font-bold text-[#9A948C]">{label}</dt>
      <dd className="min-w-0 text-[16px] font-medium">{value}</dd>
    </div>
  );
}
