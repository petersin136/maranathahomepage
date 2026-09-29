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

const STATUS_TONE: Record<BookingStatus, string> = {
  pending: "booking-status-pending",
  confirmed: "booking-status-ok",
  completed: "booking-status-ok",
  cancelled: "booking-status-bad",
  noshow: "booking-status-bad"
};

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

  const pickStatus = (next: BookingStatus) => {
    if (next === booking.status || busy) return;
    void patch({ status: next });
  };

  return (
    <div className={clsx("member-panel booking-detail", booking.status === "cancelled" && "is-cancelled")}>
      <div className="member-toolbar booking-detail__bar">
        <Link href="/admin/bookings" className="booking-detail__back">
          ← 목록
        </Link>
        <h1 className="booking-detail__title">
          예약 상세
          <span className="booking-detail__name">{booking.customer_name}</span>
        </h1>
        <div className="booking-status-picks" role="group" aria-label="예약 상태">
          {BOOKING_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={busy}
              onClick={() => pickStatus(opt.value)}
              className={clsx(
                "booking-status-picks__btn",
                STATUS_TONE[opt.value],
                booking.status === opt.value && "is-on"
              )}
            >
              <span className="booking-status__dot" />
              {opt.label}
            </button>
          ))}
        </div>
        <div className="booking-detail__tools">
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ deposit_paid: !booking.deposit_paid })}
            className={clsx("booking-detail__deposit", booking.deposit_paid && "is-paid")}
          >
            {booking.deposit_paid ? "입금 완료" : "미입금"}
          </button>
          <BookingActionButtons
            booking={booking}
            busy={busy}
            layout="row"
            onCancel={actions.openCancel}
            onDelete={actions.openDelete}
          />
        </div>
      </div>

      {error ? <p className="text-[13px] text-[#E24B4B]">{error}</p> : null}

      <div className="member-card">
        <table className="member-table booking-detail-table">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[36%]" />
            <col className="w-[14%]" />
            <col className="w-[36%]" />
          </colgroup>
          <tbody>
            <tr>
              <td className="booking-detail-table__k">예약일</td>
              <td className="member-cell-content tabular-nums">{booking.booking_date}</td>
              <td className="booking-detail-table__k">고객</td>
              <td className="member-cell-name">{booking.customer_name}</td>
            </tr>
            <tr>
              <td className="booking-detail-table__k">시간</td>
              <td className="member-cell-content tabular-nums">{booking.booking_time.slice(0, 5)}</td>
              <td className="booking-detail-table__k">성별</td>
              <td className="member-cell-content">
                {booking.customer_gender === "W" ? "여" : booking.customer_gender === "M" ? "남" : "—"}
              </td>
            </tr>
            <tr>
              <td className="booking-detail-table__k">담당</td>
              <td className="member-cell-content">{booking.artist_name || booking.artist_id}</td>
              <td className="booking-detail-table__k">연락처</td>
              <td className="member-cell-sub tabular-nums">{formatPhone(booking.customer_phone)}</td>
            </tr>
            <tr>
              <td className="booking-detail-table__k">시술</td>
              <td className="member-cell-content">{(booking.service_names || []).join(", ") || "—"}</td>
              <td className="booking-detail-table__k">고객 메모</td>
              <td className="member-cell-content">{request || "없음"}</td>
            </tr>
            <tr>
              <td className="booking-detail-table__k">예상 금액</td>
              <td className="member-cell-content tabular-nums">
                {booking.total_amount != null ? `${booking.total_amount.toLocaleString("ko-KR")}원` : "—"}
              </td>
              <td className="booking-detail-table__k">예약금</td>
              <td className="member-cell-content tabular-nums">
                {booking.deposit_amount != null ? `${booking.deposit_amount.toLocaleString("ko-KR")}원` : "—"}
              </td>
            </tr>
            <tr>
              <td className="booking-detail-table__k">결제</td>
              <td className="member-cell-content">{payment}</td>
              <td className="booking-detail-table__k">{booking.status === "cancelled" ? "취소 사유" : ""}</td>
              <td className="member-cell-content">{booking.status === "cancelled" ? reason || "—" : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="booking-detail__memo">
        <p className="booking-detail__label">관리 메모</p>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="관리 메모" />
        <button type="button" disabled={busy} onClick={() => patch({ admin_memo: memo })} className="booking-detail__save">
          {saving ? "저장 중" : "메모 저장"}
        </button>
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

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

