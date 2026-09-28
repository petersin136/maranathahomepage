import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  getDashboardData,
  todayKst,
  type DashBooking
} from "@/lib/admin/dashboard-data";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "#8A847C" },
  confirmed: { label: "확정", color: "#1F9D62" },
  completed: { label: "완료", color: "#1F9D62" },
  cancelled: { label: "취소", color: "#E24B4B" },
  noshow: { label: "노쇼", color: "#E24B4B" }
};

export default function AdminDashboardPage() {
  const today = todayKst();

  return (
    <div className="font-sans-kr text-[#1C1C1C]">
      <div className="flex items-end justify-between gap-6 pt-6">
        <h1 className="flex items-baseline gap-2 text-[30px] font-bold leading-none tracking-[-0.02em]">
          대시보드
          <span className="text-[15px] font-normal text-[#8A847C]">오늘 · {today}</span>
        </h1>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <div id="dash-pending" className="mt-12 scroll-mt-8">
        <Suspense fallback={<ListSkeleton title="확정 대기" subtitle="확정을 기다리는 예약" action />}>
          <PendingSection />
        </Suspense>
      </div>

      <div id="dash-today" className="mt-12 scroll-mt-8">
        <Suspense fallback={<ListSkeleton title="오늘의 예약" action />}>
          <TodaySection />
        </Suspense>
      </div>

      <div id="dash-week" className="mt-12 scroll-mt-8">
        <Suspense fallback={<ListSkeleton title="주간 예약" subtitle="이번 주 · 오늘 제외" />}>
          <WeekSection />
        </Suspense>
      </div>

      <div id="dash-month" className="mt-12 scroll-mt-8">
        <Suspense fallback={<ListSkeleton title="월간 예약" subtitle="이번 달 · 이번 주 제외" />}>
          <MonthSection />
        </Suspense>
      </div>
    </div>
  );
}

async function DashboardStats() {
  const data = await getDashboardData();

  return (
    <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <a href="#dash-today" className="block rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-5 py-5 transition hover:bg-[#F6F4F0]">
        <p className="text-[15px] font-bold text-[#9A948C]">오늘 예약</p>
        <p className="mt-3 text-[30px] font-bold leading-none">{data.todayCount}</p>
        <p className="mt-2 text-[13px] text-[#8A847C]">클릭하면 아래 목록으로</p>
      </a>
      <a href="#dash-pending" className="block rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-5 py-5 transition hover:bg-[#F6F4F0]">
        <p className="text-[15px] font-bold text-[#9A948C]">확정 대기</p>
        <p className="mt-3 text-[30px] font-bold leading-none">{data.pendingCount}</p>
        <p className="mt-2 text-[13px] text-[#8A847C]">클릭하면 아래 목록으로</p>
      </a>
    </div>
  );
}

async function PendingSection() {
  const data = await getDashboardData();
  return (
    <BookingSection
      title="확정 대기"
      subtitle="확정을 기다리는 예약"
      empty="대기 중인 예약이 없습니다."
      bookings={data.pendingBookings}
      showDate
      action={
        <Link href="/admin/bookings" className={actionClass}>
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
        <Link href="/admin/bookings" className={actionClass}>
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

const actionClass =
  "inline-flex h-[36px] items-center justify-center rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[14px] font-bold text-[#1C1C1C]";

function StatsSkeleton() {
  return (
    <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-hidden>
      <StatPlaceholder label="오늘 예약" hint="클릭하면 아래 목록으로" />
      <StatPlaceholder label="확정 대기" hint="클릭하면 아래 목록으로" />
    </div>
  );
}

function StatPlaceholder({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-5 py-5">
      <p className="text-[15px] font-bold text-[#9A948C]">{label}</p>
      <p className="mt-3 text-[30px] font-bold leading-none">
        <span className="inline-block w-10 animate-pulse bg-[#9A948C]/20 text-transparent">0</span>
      </p>
      <p className="mt-2 text-[13px] text-[#8A847C]">{hint}</p>
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
      <SectionHead
        title={title}
        subtitle={subtitle}
        action={
          action ? (
            <span className={`${actionClass} opacity-40`}>
              {title === "오늘의 예약" ? "전체 보기" : "예약 전체"}
            </span>
          ) : null
        }
      />
      <div className="mt-5 h-24 animate-pulse rounded-[8px] bg-[#F3EFEA]" />
    </div>
  );
}

function SectionHead({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="flex items-baseline gap-2 text-[20px] font-bold leading-none tracking-[-0.02em]">
        {title}
        {subtitle ? <span className="text-[15px] font-normal text-[#8A847C]">{subtitle}</span> : null}
      </h2>
      {action}
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
      <SectionHead title={title} subtitle={subtitle} action={action} />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-[30%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr className="border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]">
              <th className="py-3 font-bold">{showDate ? "일시" : "시간"}</th>
              <th className="py-3 font-bold">고객명</th>
              <th className="py-3 font-bold">담당자</th>
              <th className="py-3 font-bold">시술</th>
              <th className="py-3 text-right font-bold">상태</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-[14px] font-medium text-[#8A847C]">
                  {empty}
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const status = STATUS_META[b.status] ?? { label: b.status, color: "#8A847C" };
                const when = showDate ? `${b.booking_date} ${b.booking_time}` : b.booking_time;
                return (
                  <tr key={b.id} className="border-b border-[#F3EFEA]">
                    <td className="truncate py-[15px] pr-3">
                      <Link href={`/admin/bookings/${b.id}`} className="hover:underline">
                        {when}
                      </Link>
                    </td>
                    <td className="truncate py-[15px] pr-3">
                      <Link href={`/admin/bookings/${b.id}`} className="hover:underline">
                        {b.customer_name}
                      </Link>
                    </td>
                    <td className="truncate py-[15px] pr-3">{b.artist_name || "—"}</td>
                    <td className="truncate py-[15px] pr-3">{(b.service_names || []).join(" / ") || "—"}</td>
                    <td className="py-[15px] text-right">
                      <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: status.color }}>
                        <span className="h-[7px] w-[7px] rounded-full" style={{ background: status.color }} />
                        {status.label}
                        {b.deposit_paid ? " · 입금" : ""}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
