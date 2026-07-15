"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import type { BookingRow } from "@/lib/bookings/types";

const TABS = [
  { key: "pending", label: "대기" },
  { key: "confirmed", label: "확정" },
  { key: "completed", label: "완료" },
  { key: "cancelled_noshow", label: "취소·노쇼" }
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  confirmed: "확정",
  completed: "완료",
  cancelled: "취소",
  noshow: "노쇼"
};

export default function AdminBookingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch(`/api/admin/bookings?status=${tab}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setBookings(data.bookings);
      })
      .catch((e) => setError(e.message));
  }, [tab]);

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
              <th className="px-4 py-3 font-medium">입금</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-hu-muted">
                  해당 상태의 예약이 없습니다.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="border-b border-hu-black/5 hover:bg-hu-beige/40">
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
                  <td className="px-4 py-3">{STATUS_LABEL[b.status] || b.status}</td>
                  <td className="px-4 py-3">{b.deposit_paid ? "Y" : "N"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
