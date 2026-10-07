"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import BookingConfirmModal from "@/components/admin/BookingConfirmModal";
import BookingPaymentModal from "@/components/admin/BookingPaymentModal";
import { customerDetailHref } from "@/components/admin/CustomerFilters";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_OPTIONS, cancelReasonLabel } from "@/lib/admin/booking-labels";
import { parseRequestLanguage, resolveCustomerRequestText } from "@/lib/admin/booking-display";
import { useBookingActions } from "@/lib/admin/useBookingActions";
import type { BookingRow, BookingStatus, PaymentMethod } from "@/lib/bookings/types";

type PreviousBooking = {
  id: string;
  booking_date: string;
  booking_time: string;
  service_names: string[] | null;
  artist_name: string | null;
  status: string;
};

type CustomerSummary = {
  priorCount: number;
  visitLabel: string;
  previous: PreviousBooking[];
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체"
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#8A847C",
  confirmed: "#1C1C1C",
  completed: "#1C1C1C",
  cancelled: "#9A948C",
  noshow: "var(--danger)"
};

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatDate(date: string | null | undefined, withWeekday = true) {
  if (!date) return "—";
  const [y, m, d] = date.slice(0, 10).split("-");
  const head = `${y.slice(2)}. ${m}. ${d}`;
  if (!withWeekday) return head;
  const dow = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay();
  return `${head} (${WEEKDAY_KO[dow]})`;
}

function kstDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function kstDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const time = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));
  return `${formatDate(kstDate(new Date(iso)), false)} ${time}`;
}

function dDay(date: string, today: string) {
  const [ay, am, ad] = today.split("-").map(Number);
  const [by, bm, bd] = date.split("-").map(Number);
  const diff = Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
  if (diff === 0) return "D-day";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

function won(value: number | null | undefined) {
  return value != null ? `${value.toLocaleString("ko-KR")}원` : "—";
}

export default function AdminBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [memo, setMemo] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/admin/bookings/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setBooking(data.booking);
        setCustomer(data.customer ?? null);
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
    return <p className="pt-6 font-sans-kr text-[13px] text-[#8A847C]">불러오는 중…</p>;
  }

  if (!booking) {
    return (
      <div className="pt-6 font-sans-kr">
        <Link href="/admin/bookings" className="text-[15px] text-[#8A847C]">
          ← 목록
        </Link>
        <p className="mt-6 text-[13px] text-[#9b4a4a]">{error}</p>
      </div>
    );
  }

  const today = kstDate(new Date());
  const reason = cancelReasonLabel(booking.cancel_reason);
  const requestRaw = resolveCustomerRequestText(booking.customer_request, booking.admin_memo);
  const request = requestRaw ? parseRequestLanguage(requestRaw) : null;
  const memoDirty = memo !== (booking.admin_memo || "");
  const services = (booking.service_names || []).filter(Boolean).join(" / ") || "—";
  const phone = String(booking.customer_phone || "").trim();
  const voided = booking.status === "cancelled" || booking.status === "noshow";

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/admin/bookings"))}
        className="text-[15px] text-[#8A847C] hover:text-[#1C1C1C]"
      >
        ← 목록
      </button>

      <div className="mt-6 flex items-baseline justify-between gap-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[30px] font-bold leading-none tracking-[-0.02em]">예약 상세</h1>
          <span
            className="inline-flex items-center gap-[6px] text-[15px] font-medium"
            style={{ color: STATUS_COLOR[booking.status] ?? "#1C1C1C" }}
          >
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
            {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
          </span>
          <span className="text-[15px] font-normal text-[#8A847C]">
            {booking.customer_name}
            {customer ? ` · ${customer.visitLabel}` : ""}
          </span>
        </div>
        {phone ? (
          <Link
            href={customerDetailHref(phone)}
            className="inline-flex h-[40px] items-center rounded-[8px] border border-[#E4E0DA] bg-white px-4 text-[14px] font-bold text-[#3A3A3A] hover:bg-[#F6F4F0]"
          >
            고객 상세 보기
          </Link>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-[13px] text-[#9b4a4a]">{error}</p> : null}

      <dl
        className={clsx(
          "mt-10 grid grid-cols-6 border-y-[1.5px] border-[#C9C3BB]",
          voided && "text-[#9A948C]"
        )}
      >
        <Stat
          label="예약일"
          value={formatDate(booking.booking_date)}
          hint={voided ? undefined : dDay(booking.booking_date, today)}
        />
        <Stat
          label="시간"
          value={booking.booking_time}
          hint={booking.duration_minutes ? `${booking.duration_minutes}분 소요` : undefined}
        />
        <Stat label="담당" value={booking.artist_name || booking.artist_id || "—"} />
        <Stat label="예상 금액" value={won(booking.total_amount)} />
        <Stat
          label="예약금"
          value={won(booking.deposit_amount)}
          hint={booking.deposit_amount ? (booking.deposit_paid ? "입금 완료" : "미입금") : undefined}
        />
        <Stat
          label="결제"
          value={won(booking.final_amount)}
          hint={booking.payment_method ? PAYMENT_METHOD_LABEL[booking.payment_method] : "결제 전"}
        />
      </dl>

      <div className="mt-12 grid grid-cols-2 gap-12">
        <section>
          <h2 className="text-[18px] font-bold">예약 정보</h2>
          <dl className="mt-4 border-t-[1.5px] border-[#C9C3BB]">
            <Field label="시술" value={services} />
            <Field label="고객" value={booking.customer_name || "—"} />
            <Field
              label="성별"
              value={booking.customer_gender === "W" ? "여" : booking.customer_gender === "M" ? "남" : "—"}
            />
            <Field label="연락처" value={phone ? formatPhone(phone) : "—"} />
            <Field
              label="고객 요청"
              value={request ? `${request.lang ? `[${request.lang}] ` : ""}${request.body}` : "없음"}
            />
            <Field label="예약 접수" value={kstDateTime(booking.created_at)} />
            {booking.paid_at ? <Field label="결제 시각" value={kstDateTime(booking.paid_at)} /> : null}
            {booking.status === "cancelled" ? <Field label="취소 사유" value={reason || "—"} /> : null}
          </dl>
        </section>

        <section>
          <h2 className="text-[18px] font-bold">예약 관리</h2>
          <div className="mt-4 border-t-[1.5px] border-[#C9C3BB]">
            <div className="flex items-center gap-8 border-b border-[#F3EFEA] py-[15px]">
              <p className="w-[120px] shrink-0 text-[15px] font-bold text-[#9A948C]">상태</p>
              <div className="flex flex-wrap gap-2">
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
                      "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold disabled:opacity-40",
                      booking.status === opt.value
                        ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                        : "border-[#E4E0DA] bg-white text-[#3A3A3A] hover:bg-[#F6F4F0]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-8 border-b border-[#F3EFEA] py-[15px]">
              <p className="w-[120px] shrink-0 text-[15px] font-bold text-[#9A948C]">예약금 입금</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => patch({ deposit_paid: !booking.deposit_paid })}
                className={clsx(
                  "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold disabled:opacity-40",
                  booking.deposit_paid
                    ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                    : "border-[#E4E0DA] bg-white text-[#3A3A3A] hover:bg-[#F6F4F0]"
                )}
              >
                {booking.deposit_paid ? "입금 완료" : "미입금"}
              </button>
            </div>
          </div>

          <p className="mt-6 text-[15px] font-bold text-[#9A948C]">관리 메모</p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={5}
            placeholder="이 예약에 대한 메모를 남겨두세요."
            className="mt-3 w-full resize-y rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 py-2 text-[15px] leading-[24px] outline-none placeholder:text-[#B5AFA7] focus:border-[#81786d]"
          />
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              disabled={busy}
              onClick={() => actions.openDelete(booking)}
              className="text-[14px] text-[#8A847C] hover:text-[#E24B4B] disabled:opacity-40"
            >
              예약 삭제
            </button>
            <button
              type="button"
              disabled={busy || !memoDirty}
              onClick={() => patch({ admin_memo: memo })}
              className="inline-flex h-[40px] items-center rounded-[8px] bg-[#2F3A2F] px-4 text-[14px] font-bold text-white disabled:opacity-40"
            >
              {saving ? "저장 중..." : "메모 저장"}
            </button>
          </div>
        </section>
      </div>

      {customer ? (
        <section className="mt-14">
          <h2 className="flex items-baseline gap-2 text-[18px] font-bold">
            이전 방문
            <span className="text-[15px] font-normal text-[#8A847C]">{customer.priorCount}건</span>
          </h2>
          <table className="mt-4 w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[15%]" />
              <col className="w-[39%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead>
              <tr className="border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]">
                <th className="py-3 pl-1 font-bold">시술일</th>
                <th className="py-3 font-bold">시간</th>
                <th className="py-3 font-bold">담당자</th>
                <th className="py-3 font-bold">시술</th>
                <th className="py-3 font-bold">상태</th>
                <th className="py-3 text-right font-bold">관리</th>
              </tr>
            </thead>
            <tbody>
              {customer.previous.map((p) => {
                const name = (p.service_names ?? []).filter(Boolean).join(" / ") || "—";
                return (
                  <tr key={p.id} className="border-b border-[#F3EFEA]">
                    <td className="truncate py-[15px] pl-1 pr-3">{formatDate(p.booking_date)}</td>
                    <td className="truncate py-[15px] pr-3">{p.booking_time}</td>
                    <td className="truncate py-[15px] pr-3">{p.artist_name || "—"}</td>
                    <td className="truncate py-[15px] pr-3" title={name}>
                      {name}
                    </td>
                    <td className="truncate py-[15px] pr-3">
                      <span
                        className="inline-flex items-center gap-[6px]"
                        style={{ color: STATUS_COLOR[p.status] ?? "#1C1C1C" }}
                      >
                        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
                        {BOOKING_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="py-[15px] text-right font-normal text-[#8A847C]">
                      <Link href={`/admin/bookings/${p.id}` as Route} className="hover:text-[#1C1C1C]">
                        상세보기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {customer.previous.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#8A847C]">이 예약 이전의 방문 기록이 없습니다.</p>
          ) : null}
        </section>
      ) : null}

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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 border-l border-[#F3EFEA] px-5 py-5 first:border-l-0 first:pl-1">
      <dt className="text-[15px] font-bold text-[#9A948C]">{label}</dt>
      <dd className="mt-3 truncate text-[20px] font-bold leading-[24px]">{value}</dd>
      {hint ? <dd className="mt-1 truncate text-[13px] text-[#8A847C]">{hint}</dd> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-8 border-b border-[#F3EFEA] py-[15px]">
      <dt className="w-[120px] shrink-0 text-[15px] font-bold text-[#9A948C]">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-[16px] font-medium">{value}</dd>
    </div>
  );
}
