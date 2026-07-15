"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";

type DashBooking = {
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
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [todayCount, setTodayCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayBookings, setTodayBookings] = useState<DashBooking[]>([]);
  const [weekBookings, setWeekBookings] = useState<DashBooking[]>([]);
  const [monthBookings, setMonthBookings] = useState<DashBooking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<DashBooking[]>([]);
  const [showPending, setShowPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setToday(data.today);
        setWeekStart(data.weekStart || "");
        setWeekEnd(data.weekEnd || "");
        setTodayCount(data.todayCount);
        setPendingCount(data.pendingCount);
        setTodayBookings(data.todayBookings || []);
        setWeekBookings(data.weekBookings || []);
        setMonthBookings(data.monthBookings || []);
        setPendingBookings(data.pendingBookings || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  const openPending = () => {
    setShowPending(true);
    requestAnimationFrame(() => {
      pendingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div>
      <h1 className="font-serif text-[32px] tracking-[0.06em]">DASHBOARD</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">오늘 · {today || "—"}</p>

      {error ? <p className="mt-6 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            document.getElementById("dash-today")?.scrollIntoView({ behavior: "smooth" })
          }
          className="bg-hu-white px-8 py-7 text-left shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:bg-hu-beige/40"
        >
          <p className="font-serif text-[12px] tracking-[0.14em] text-hu-accent">TODAY</p>
          <p className="mt-3 font-serif text-[40px]">{todayCount}</p>
          <p className="font-sans-kr text-[13px] text-hu-muted">오늘 예약</p>
        </button>
        <button
          type="button"
          onClick={openPending}
          className={clsx(
            "bg-hu-white px-8 py-7 text-left transition hover:bg-hu-beige/40",
            showPending && "ring-1 ring-hu-black/15"
          )}
        >
          <p className="font-serif text-[12px] tracking-[0.14em] text-hu-accent">PENDING</p>
          <p className="mt-3 font-serif text-[40px]">{pendingCount}</p>
          <p className="font-sans-kr text-[13px] text-hu-muted">확정 대기 · 눌러서 보기</p>
        </button>
      </div>

      {showPending ? (
        <div ref={pendingRef} className="mt-10">
          <BookingSection
            title="확정 대기"
            subtitle="PENDING"
            empty="대기 중인 예약이 없습니다."
            bookings={pendingBookings}
            showDate
            action={
              <button
                type="button"
                onClick={() => setShowPending(false)}
                className="font-sans-kr text-[12px] text-hu-muted underline"
              >
                닫기
              </button>
            }
          />
        </div>
      ) : null}

      <div id="dash-today" className="mt-10">
        <BookingSection
          title="오늘의 예약"
          empty="오늘 예약이 없습니다."
          bookings={todayBookings}
          action={
            <Link href="/admin/bookings" className="font-sans-kr text-[12px] text-hu-muted underline">
              전체 보기
            </Link>
          }
        />
      </div>

      <div className="mt-10">
        <BookingSection
          title="주간 예약"
          subtitle={
            weekStart && weekEnd
              ? `${weekStart} ~ ${weekEnd} · 오늘 제외`
              : "이번 주 · 오늘 제외"
          }
          empty="이번 주(오늘 제외) 예약이 없습니다."
          bookings={weekBookings}
          showDate
        />
      </div>

      <div className="mt-10">
        <BookingSection
          title="월간 예약"
          subtitle="이번 달 · 주간 제외"
          empty="이번 달(주간 제외) 예약이 없습니다."
          bookings={monthBookings}
          showDate
        />
      </div>
    </div>
  );
}

function BookingSection({
  title,
  subtitle,
  empty,
  bookings,
  showDate,
  action
}: {
  title: string;
  subtitle?: string;
  empty: string;
  bookings: DashBooking[];
  showDate?: boolean;
  action?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-[18px] tracking-[0.08em]">{title}</h2>
          {subtitle ? (
            <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <ul className="mt-4 divide-y divide-hu-black/10 bg-hu-white">
        {bookings.length === 0 ? (
          <li className="px-6 py-8 font-sans-kr text-[13px] text-hu-muted">{empty}</li>
        ) : (
          bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-hu-beige/50"
              >
                <div>
                  <p className="font-serif text-[15px]">
                    {showDate ? `${b.booking_date} · ` : ""}
                    {b.booking_time} · {b.customer_name}
                  </p>
                  <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
                    {b.artist_name || "—"} · {(b.service_names || []).join(" / ") || "시술 미상"}
                  </p>
                </div>
                <span className="shrink-0 font-sans-kr text-[12px] text-hu-body">
                  {STATUS_LABEL[b.status] || b.status}
                  {b.deposit_paid ? " · 입금" : ""}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
