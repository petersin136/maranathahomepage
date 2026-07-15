"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import type { BookingRow, BookingStatus } from "@/lib/bookings/types";

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "pending", label: "대기" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
  { value: "noshow", label: "노쇼" }
];

export default function AdminBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/admin/bookings/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setBooking(data.booking);
        setMemo(data.booking.admin_memo || "");
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
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
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (!booking && !error) {
    return <p className="font-sans-kr text-[13px] text-hu-muted">불러오는 중…</p>;
  }

  if (!booking) {
    return <p className="font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p>;
  }

  return (
    <div className="max-w-[720px]">
      <Link href="/admin/bookings" className="font-sans-kr text-[12px] text-hu-muted">
        ← 목록
      </Link>
      <h1 className="mt-4 font-serif text-[28px] tracking-[0.06em]">BOOKING DETAIL</h1>

      {error ? <p className="mt-4 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}

      <div className="mt-8 space-y-6 bg-hu-white px-8 py-8">
        <Row label="날짜" value={booking.booking_date} />
        <Row label="시간" value={booking.booking_time} />
        <Row label="디자이너" value={booking.artist_name || booking.artist_id} />
        <Row label="시술" value={(booking.service_names || []).join(", ") || "—"} />
        <Row label="고객" value={booking.customer_name} />
        <Row
          label="성별"
          value={booking.customer_gender === "W" ? "W" : booking.customer_gender === "M" ? "M" : "—"}
        />
        <Row label="전화" value={booking.customer_phone} />
        <Row
          label="요청사항"
          value={
            booking.customer_request?.trim() ||
            (booking.admin_memo?.startsWith("[고객요청] ")
              ? booking.admin_memo.slice("[고객요청] ".length)
              : null) ||
            "—"
          }
        />
        <Row
          label="총 금액"
          value={
            booking.total_amount != null
              ? `${booking.total_amount.toLocaleString("ko-KR")}원`
              : "—"
          }
        />
        <Row
          label="예약금"
          value={
            booking.deposit_amount != null
              ? `${booking.deposit_amount.toLocaleString("ko-KR")}원`
              : "—"
          }
        />

        <div>
          <p className="font-serif text-[12px] tracking-[0.1em] text-hu-accent">STATUS</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => patch({ status: opt.value })}
                className={clsx(
                  "px-4 py-2 font-sans-kr text-[12px]",
                  booking.status === opt.value
                    ? "bg-hu-black text-white"
                    : "bg-hu-beige text-hu-body hover:bg-hu-beige-hover"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-hu-black/10 pt-6">
          <div>
            <p className="font-serif text-[12px] tracking-[0.1em] text-hu-accent">DEPOSIT</p>
            <p className="mt-1 font-sans-kr text-[13px] text-hu-muted">예약금 입금 여부</p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => patch({ deposit_paid: !booking.deposit_paid })}
            className={clsx(
              "px-5 py-2 font-sans-kr text-[13px]",
              booking.deposit_paid ? "bg-hu-black text-white" : "bg-hu-beige text-hu-body"
            )}
          >
            {booking.deposit_paid ? "입금 완료" : "미입금"}
          </button>
        </div>

        <div className="border-t border-hu-black/10 pt-6">
          <p className="font-serif text-[12px] tracking-[0.1em] text-hu-accent">MEMO</p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            className="mt-3 w-full border border-hu-black/10 bg-[#faf8f6] px-3 py-2 font-sans-kr text-[13px] outline-none focus:border-hu-black/30"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => patch({ admin_memo: memo })}
            className="mt-3 bg-hu-black px-5 py-2 font-sans-kr text-[13px] text-white disabled:bg-[#bcbcbc]"
          >
            {saving ? "저장 중..." : "메모 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-hu-black/5 pb-3">
      <dt className="font-serif text-[11px] tracking-[0.12em] text-hu-accent">{label}</dt>
      <dd className="font-sans-kr text-[14px] text-hu-black">{value}</dd>
    </div>
  );
}
