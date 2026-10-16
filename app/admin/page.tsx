import { Suspense } from "react";
import { clsx } from "clsx";
import { AdminBellButton } from "@/components/admin/AdminBellButton";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { DashboardBoard } from "@/components/admin/DashboardBoard";
import { getAdminShellSession } from "@/lib/admin/auth";
import { fetchPopularServices, getDashboardData, loadMonthPay, monthRangeOf, todayKst } from "@/lib/admin/dashboard-data";

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
    <div className="font-sans-kr text-[#1C1C1C]">
      <div className="shrink-0 pl-[6px]">
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
  const [session, data] = await Promise.all([getAdminShellSession(), getDashboardData()]);
  const range = monthRangeOf(data.today);
  const [services, monthPay] = await Promise.all([
    fetchPopularServices(range.start, range.end),
    session?.role === "owner" ? loadMonthPay(data.today) : Promise.resolve(null)
  ]);
  return (
    <div className="mt-8">
      <DashboardBoard
        todayBookings={data.todayBookings}
        pendingCount={data.pendingCount}
        monthTrend={data.monthTrend}
        services={services}
        monthPay={monthPay}
      />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div aria-hidden className="mt-8">
      <div className="grid shrink-0 grid-cols-4 gap-2">
        {["예약관리", "캘린더", "고객관리", "매출/정산"].map((label, index) => (
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
              <span className="inline-block w-16 animate-pulse rounded-[2px] bg-current opacity-20 text-transparent">0</span>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-[280px] animate-pulse rounded-[8px] bg-[color:var(--sidebar-bg)]" />
        <div className="h-[280px] animate-pulse rounded-[8px] bg-[color:var(--sidebar-bg)]" />
      </div>
    </div>
  );
}
