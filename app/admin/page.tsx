import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  getDashboardData,
  todayKst,
  type DashBooking
} from "@/lib/admin/dashboard-data";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  confirmed: "확정",
  completed: "완료",
  cancelled: "취소",
  noshow: "노쇼"
};

export default function AdminDashboardPage() {
  const today = todayKst();

  return (
    <div>
      <h1 className="font-serif text-[32px] tracking-[0.06em]">DASHBOARD</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">오늘 · {today}</p>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <div id="dash-pending" className="mt-10 scroll-mt-8">
        <Suspense
          fallback={
            <ListSkeleton
              title="확정 대기"
              subtitle="PENDING · 숫자 클릭 시 이 목록"
              action
            />
          }
        >
          <PendingSection />
        </Suspense>
      </div>

      <div id="dash-today" className="mt-10 scroll-mt-8">
        <Suspense
          fallback={<ListSkeleton title="오늘의 예약" action />}
        >
          <TodaySection />
        </Suspense>
      </div>

      <div id="dash-week" className="mt-10 scroll-mt-8">
        <Suspense
          fallback={
            <ListSkeleton title="주간 예약" subtitle="이번 주 · 오늘 제외" />
          }
        >
          <WeekSection />
        </Suspense>
      </div>

      <div id="dash-month" className="mt-10 scroll-mt-8">
        <Suspense
          fallback={
            <ListSkeleton title="월간 예약" subtitle="이번 달 · 이번 주 제외" />
          }
        >
          <MonthSection />
        </Suspense>
      </div>
    </div>
  );
}

async function DashboardStats() {
  const data = await getDashboardData();

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <a
        href="#dash-today"
        className="block cursor-pointer bg-hu-white px-8 py-7 text-left shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:bg-hu-beige/40"
      >
        <p className="font-serif text-[12px] tracking-[0.14em] text-hu-accent">TODAY</p>
        <p className="mt-3 font-serif text-[40px] underline decoration-hu-black/20 underline-offset-8">
          {data.todayCount}
        </p>
        <p className="mt-1 font-sans-kr text-[13px] text-hu-muted">오늘 예약 · 클릭하면 아래로</p>
      </a>
      <a
        href="#dash-pending"
        className="block cursor-pointer bg-hu-white px-8 py-7 text-left transition hover:bg-hu-beige/40"
      >
        <p className="font-serif text-[12px] tracking-[0.14em] text-hu-accent">PENDING</p>
        <p className="mt-3 font-serif text-[40px] underline decoration-hu-black/20 underline-offset-8">
          {data.pendingCount}
        </p>
        <p className="mt-1 font-sans-kr text-[13px] text-hu-muted">확정 대기 · 클릭하면 아래로</p>
      </a>
    </div>
  );
}

async function PendingSection() {
  const data = await getDashboardData();
  return (
    <BookingSection
      title="확정 대기"
      subtitle="PENDING · 숫자 클릭 시 이 목록"
      empty="대기 중인 예약이 없습니다."
      bookings={data.pendingBookings}
      showDate
      action={
        <Link href="/admin/bookings" className="font-sans-kr text-[12px] text-hu-muted underline">
          예약 전체
        </Link>
      }
    />
  );
}

async function TodaySection() {
  const data = await getDashboardData();
  return (
    <BookingSection
      title="오늘의 예약"
      empty="오늘 예약이 없습니다."
      bookings={data.todayBookings}
      action={
        <Link href="/admin/bookings" className="font-sans-kr text-[12px] text-hu-muted underline">
          전체 보기
        </Link>
      }
    />
  );
}

async function WeekSection() {
  const data = await getDashboardData();
  return (
    <BookingSection
      title="주간 예약"
      subtitle={
        data.weekStart && data.weekEnd
          ? `${data.weekStart} ~ ${data.weekEnd} · 오늘 제외`
          : "이번 주 · 오늘 제외"
      }
      empty="이번 주(오늘 제외) 예약이 없습니다."
      bookings={data.weekBookings}
      showDate
    />
  );
}

async function MonthSection() {
  const data = await getDashboardData();
  return (
    <BookingSection
      title="월간 예약"
      subtitle="이번 달 · 이번 주 제외"
      empty="이번 달(주간 제외) 예약이 없습니다."
      bookings={data.monthBookings}
      showDate
    />
  );
}

function StatsSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden>
      <div className="bg-hu-white px-8 py-7 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <p className="font-serif text-[12px] tracking-[0.14em] text-hu-accent">TODAY</p>
        <p className="mt-3 font-serif text-[40px] underline decoration-hu-black/20 underline-offset-8">
          <span className="inline-block w-10 animate-pulse bg-hu-black/10 text-transparent">0</span>
        </p>
        <p className="mt-1 font-sans-kr text-[13px] text-hu-muted">오늘 예약 · 클릭하면 아래로</p>
      </div>
      <div className="bg-hu-white px-8 py-7">
        <p className="font-serif text-[12px] tracking-[0.14em] text-hu-accent">PENDING</p>
        <p className="mt-3 font-serif text-[40px] underline decoration-hu-black/20 underline-offset-8">
          <span className="inline-block w-10 animate-pulse bg-hu-black/10 text-transparent">0</span>
        </p>
        <p className="mt-1 font-sans-kr text-[13px] text-hu-muted">확정 대기 · 클릭하면 아래로</p>
      </div>
    </div>
  );
}

function ListSkeleton({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: boolean;
}) {
  return (
    <div aria-hidden>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-[18px] tracking-[0.08em]">{title}</h2>
          {subtitle ? (
            <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">{subtitle}</p>
          ) : null}
        </div>
        {action ? (
          <span className="font-sans-kr text-[12px] text-hu-muted underline opacity-40">
            {title === "오늘의 예약" ? "전체 보기" : "예약 전체"}
          </span>
        ) : null}
      </div>
      <ul className="mt-4 divide-y divide-hu-black/10 bg-hu-white">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0 flex-1">
              <div className="h-[15px] w-48 max-w-full animate-pulse bg-hu-black/10" />
              <div className="mt-1 h-[12px] w-32 max-w-full animate-pulse bg-hu-black/5" />
            </div>
            <div className="h-[12px] w-10 shrink-0 animate-pulse bg-hu-black/10" />
          </li>
        ))}
      </ul>
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
