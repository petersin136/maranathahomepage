"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TodayBooking = {
  id: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  artist_name: string | null;
  status: string;
  deposit_paid: boolean;
  service_names: string[] | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  confirmed: "확정",
  completed: "완료",
  cancelled: "취소",
  noshow: "노쇼"
};

export default function AdminDashboardPage() {
  const [today, setToday] = useState("");
  const [todayCount, setTodayCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [bookings, setBookings] = useState<TodayBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setToday(data.today);
        setTodayCount(data.todayCount);
        setPendingCount(data.pendingCount);
        setBookings(data.todayBookings);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="font-serif text-[32px] tracking-[0.06em]">DASHBOARD</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">오늘 · {today || "—"}</p>

      {error ? <p className="mt-6 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="bg-hu-white px-8 py-7 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <p className="font-serif text-[12px] tracking-[0.14em] text-hu-accent">TODAY</p>
          <p className="mt-3 font-serif text-[40px]">{todayCount}</p>
          <p className="font-sans-kr text-[13px] text-hu-muted">오늘 예약</p>
        </div>
        <div className="bg-hu-white px-8 py-7">
          <p className="font-serif text-[12px] tracking-[0.14em] text-hu-accent">PENDING</p>
          <p className="mt-3 font-serif text-[40px]">{pendingCount}</p>
          <p className="font-sans-kr text-[13px] text-hu-muted">확정 대기</p>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-[18px] tracking-[0.08em]">오늘의 예약</h2>
          <Link href="/admin/bookings" className="font-sans-kr text-[12px] text-hu-muted underline">
            전체 보기
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-hu-black/10 bg-hu-white">
          {bookings.length === 0 ? (
            <li className="px-6 py-8 font-sans-kr text-[13px] text-hu-muted">오늘 예약이 없습니다.</li>
          ) : (
            bookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/bookings/${b.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-hu-beige/50"
                >
                  <div>
                    <p className="font-serif text-[15px]">
                      {b.booking_time} · {b.customer_name}
                    </p>
                    <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
                      {b.artist_name || "—"} · {(b.service_names || []).join(", ") || "시술 미상"}
                    </p>
                  </div>
                  <span className="font-sans-kr text-[12px] text-hu-body">
                    {STATUS_LABEL[b.status] || b.status}
                    {b.deposit_paid ? " · 입금" : ""}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
