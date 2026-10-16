import { Suspense } from "react";
import { clsx } from "clsx";
import { AdminBellButton } from "@/components/admin/AdminBellButton";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { DashboardBoard } from "@/components/admin/DashboardBoard";
import { fetchPopularServices, getDashboardData, todayKst } from "@/lib/admin/dashboard-data";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

function formatKoreanDate(ymd: string) {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export default function AdminDashboardPage() {
  const today = todayKst();

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <div className="pl-[6px]">
        <div className="flex items-start justify-between gap-6">
          <AdminPageTitle>대시보드</AdminPageTitle>
          <div className="mt-[24px]">
            <AdminBellButton />
          </div>
        </div>
        <p className="mt-[14px] text-[16px] font-medium leading-normal text-[#8A847C]">
          오늘 · {formatKoreanDate(today)}
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardLoaded />
      </Suspense>
    </div>
  );
}

async function DashboardLoaded() {
  const data = await getDashboardData();
  const services = await fetchPopularServices(data.monthStart, data.monthEnd);
  return (
    <DashboardBoard
      weekStart={data.weekStart}
      weekEnd={data.weekEnd}
      todayBookings={data.todayBookings}
      weekBookings={data.weekBookings}
      monthBookings={data.monthBookings}
      pendingBookings={data.pendingBookings}
      monthTrend={data.monthTrend}
      services={services}
    />
  );
}

function StatsSkeleton() {
  return (
    <div aria-hidden>
      <div className="mt-[58px] h-[34px] w-[186px] animate-pulse rounded-[8px] bg-[color:var(--sidebar-bg)]" />
      <div className="mt-4 grid grid-cols-4 gap-2">
        {["오늘 예약", "확정 대기", "주간 예약", "월간 예약"].map((label, index) => (
          <div
            key={label}
            className={clsx(
              "rounded-[8px] px-5 py-5",
              index === 0 ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--sidebar-bg)]"
            )}
          >
            <p className={clsx("text-[15px] font-bold leading-normal", index === 0 ? "text-white" : "text-[color:var(--label)]")}>
              {label}
            </p>
            <p className="mt-3 text-[20px] font-bold leading-normal">
              <span className="inline-block w-10 animate-pulse rounded-[2px] bg-current opacity-20 text-transparent">0건</span>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-[360px] animate-pulse rounded-[8px] bg-[color:var(--sidebar-bg)]" />
        <div className="h-[360px] animate-pulse rounded-[8px] bg-[color:var(--sidebar-bg)]" />
      </div>
    </div>
  );
}
