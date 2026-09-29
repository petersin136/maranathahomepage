"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import type { DashboardData } from "@/lib/admin/dashboard-data";
import type { SalesDashboard } from "@/lib/admin/sales-data";

type RecentBooking = {
  id: string;
  created_at: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  service_names: string[] | null;
  status: string;
};

type ChartMode = "W" | "M" | "Y";

type Bucket = { key: string; label: string; value: number; current: boolean };

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "대기", className: "pco-badge-yellow" },
  confirmed: { label: "확정", className: "pco-badge-blue" },
  completed: { label: "완료", className: "pco-badge-green" },
  cancelled: { label: "취소", className: "pco-badge-red" },
  noshow: { label: "노쇼", className: "pco-badge-red" }
};

function kstYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function dotted(ymd: string) {
  return ymd.replaceAll("-", ".");
}

function shortValue(value: number) {
  if (value >= 10000) return `${Math.round(value / 1000) / 10}만`;
  return value.toLocaleString("ko-KR");
}

function won(value: number) {
  return value.toLocaleString("ko-KR");
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || !json.ok) return null;
  return json as T;
}

function weekBuckets(daily: SalesDashboard["daily"], today: string): Bucket[] {
  return daily.map((d) => ({
    key: d.date,
    label: `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8, 10))}`,
    value: d.revenue,
    current: d.date === today
  }));
}

function monthWeekBuckets(daily: SalesDashboard["daily"], today: string): Bucket[] {
  if (daily.length === 0) return [];
  const first = daily[0].date;
  const [y, m] = first.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const buckets: Bucket[] = [];
  for (const d of daily) {
    const day = Number(d.date.slice(8, 10));
    const index = Math.floor((day - 1 + offset) / 7);
    if (!buckets[index]) {
      buckets[index] = { key: `w${index}`, label: `${m}월 ${index + 1}주차`, value: 0, current: false };
    }
    buckets[index].value += d.revenue;
    if (d.date === today) buckets[index].current = true;
  }
  return buckets.filter(Boolean);
}

function yearMonthBuckets(daily: SalesDashboard["daily"], year: number, today: string): Bucket[] {
  const buckets: Bucket[] = Array.from({ length: 12 }, (_, i) => ({
    key: `m${i + 1}`,
    label: `${i + 1}월`,
    value: 0,
    current: false
  }));
  for (const d of daily) {
    const month = Number(d.date.slice(5, 7));
    buckets[month - 1].value += d.revenue;
  }
  const [ty, tm] = today.split("-").map(Number);
  if (ty === year) buckets[tm - 1].current = true;
  else buckets[11].current = true;
  return buckets;
}

export default function AdminDashboardPage() {
  const today = kstYmd(new Date());
  const thisYear = Number(today.slice(0, 4));

  const [dash, setDash] = useState<DashboardData | null>(null);
  const [month, setMonth] = useState<SalesDashboard | null>(null);
  const [recent, setRecent] = useState<RecentBooking[] | null>(null);
  const [mode, setMode] = useState<ChartMode>("M");
  const [year, setYear] = useState(thisYear);
  const [chartDaily, setChartDaily] = useState<SalesDashboard["daily"] | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    void getJson<DashboardData & { ok: true }>("/api/admin/dashboard").then(setDash);
    void getJson<SalesDashboard & { ok: true }>("/api/admin/sales?preset=this_month").then(setMonth);
    void getJson<{ ok: true; bookings: RecentBooking[] }>("/api/admin/bookings").then((json) =>
      setRecent(json?.bookings ?? [])
    );
  }, []);

  useEffect(() => {
    if (mode === "M") {
      setChartDaily(month?.daily ?? null);
      return;
    }
    const url =
      mode === "W"
        ? "/api/admin/sales?preset=this_week"
        : `/api/admin/sales?preset=custom&from=${year}-01-01&to=${year}-12-31`;
    setChartLoading(true);
    void getJson<SalesDashboard & { ok: true }>(url)
      .then((json) => setChartDaily(json?.daily ?? []))
      .finally(() => setChartLoading(false));
  }, [mode, year, month]);

  const buckets = useMemo(() => {
    if (!chartDaily) return [];
    if (mode === "W") return weekBuckets(chartDaily, today);
    if (mode === "M") return monthWeekBuckets(chartDaily, today);
    return yearMonthBuckets(chartDaily, year, today);
  }, [chartDaily, mode, year, today]);

  const weekList = useMemo(
    () => (dash ? [...dash.todayBookings, ...dash.weekBookings] : []),
    [dash]
  );
  const weekConfirmed = weekList.filter((b) => b.status !== "pending").length;
  const weekPending = weekList.length - weekConfirmed;

  const recentRows = useMemo(
    () =>
      (recent ?? [])
        .slice()
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 6),
    [recent]
  );

  const monthDaily = month?.daily ?? [];
  const revenueDays = monthDaily.filter((d) => d.revenue > 0).length;

  return (
    <div className="font-pc-kr text-text1">
      <div className="grid grid-cols-1 gap-4 min-[1440px]:grid-cols-2">
        <section className="float-card flex flex-col">
          <h2 className="text-dash-section font-bold text-dash-ink">이번 달 매출</h2>
          <p className="mt-3 flex items-baseline gap-3">
            <span className="text-pc-4xl font-bold leading-none tracking-[-0.02em] text-dash-ink">
              {won(month?.summary.totalRevenue ?? 0)}
              <span className="ml-1 text-pc-lg font-bold">원</span>
            </span>
            <span className="text-pc-base text-text3">
              완료 {month?.summary.completedCount ?? 0}건 · 매출 발생 {revenueDays}일
            </span>
          </p>
          <div className="mt-6 flex h-[56px] gap-[6px]">
            {monthDaily.map((d) => (
              <span
                key={d.date}
                title={`${d.date} · ${won(d.revenue)}원`}
                className={clsx("flex-1 rounded-pc", d.revenue > 0 ? "bg-deep-green" : "bg-line")}
              />
            ))}
          </div>
        </section>

        <section className="float-card flex flex-col">
          <h2 className="text-dash-section font-bold text-dash-ink">이번 주 예약</h2>
          <p className="mt-3 flex items-baseline gap-3">
            <span className="text-pc-4xl font-bold leading-none tracking-[-0.02em] text-dash-ink">
              {weekList.length}
              <span className="ml-1 text-pc-lg font-bold">건</span>
            </span>
            <span className="text-pc-base text-text3">
              확정 {weekConfirmed} / 대기 {weekPending}
            </span>
          </p>
          <div className="mt-6 flex flex-wrap gap-[10px]">
            {weekList.length === 0 ? (
              <span className="text-pc-base text-text3">이번 주 예약이 없습니다</span>
            ) : (
              weekList.map((b) => (
                <span
                  key={b.id}
                  title={`${b.booking_date} ${b.booking_time} · ${b.customer_name}`}
                  className={clsx(
                    "h-[10px] w-[10px] rounded-full",
                    b.status === "pending" ? "bg-line" : "bg-lavender"
                  )}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 min-[1440px]:grid-cols-4">
        <SmallCard href="/admin/calendar" title="오늘 예약" desc="오늘 방문 예정" value={dash?.todayCount ?? 0} />
        <SmallCard
          href="/admin/bookings"
          title="확정 대기"
          desc="확정을 기다리는 예약"
          value={dash?.pendingCount ?? 0}
        />
        <SmallCard
          href="/admin/sales"
          title="완료"
          desc="이번 달 결제 완료"
          value={month?.summary.completedCount ?? 0}
        />
        <SmallCard
          href="/admin/sales"
          title="노쇼"
          desc="이번 달 예약일 기준"
          value={month?.attrition.noshowCount ?? 0}
          danger={Boolean(month?.attrition.noshowHigh)}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 min-[1440px]:grid-cols-[3fr_2fr]">
        <section className="float-card flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-dash-section font-bold text-dash-ink">매출 추이</h2>
            <div className="flex items-center gap-2">
              <select
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value));
                  setMode("Y");
                }}
                aria-label="연도"
                className="mr-2 bg-transparent text-pc-md font-semibold text-text1 outline-none"
              >
                {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {(["W", "M", "Y"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={clsx(
                    "h-[28px] w-[28px] rounded-pc text-pc-sm font-semibold",
                    mode === m ? "bg-line-strong text-text1" : "bg-pc-bg-alt text-text2"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {chartLoading || !chartDaily ? (
            <p className="flex h-[272px] items-center justify-center text-pc-base text-text3">불러오는 중…</p>
          ) : (
            <BarStrip buckets={buckets} />
          )}
        </section>

        <section className="float-card flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-dash-section font-bold text-dash-ink">최근 예약</h2>
            <span className="text-pc-base font-bold text-text1">총 {recent?.length ?? 0}건</span>
          </div>
          <ul className="mt-4">
            {recent && recentRows.length === 0 ? (
              <li className="py-10 text-center text-pc-base text-text3">예약이 없습니다</li>
            ) : null}
            {recentRows.map((b) => {
              const badge = STATUS_BADGE[b.status] ?? { label: b.status, className: "pco-badge-yellow" };
              return (
                <li key={b.id} className="border-b border-line-soft last:border-b-0">
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="grid grid-cols-[auto_88px_minmax(0,1fr)_auto] items-center gap-4 py-4"
                  >
                    <span
                      className={clsx(
                        "inline-flex h-[24px] items-center rounded-pc px-[10px] text-pc-sm font-semibold",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                    <span className="truncate text-pc-base font-semibold text-text1">{b.customer_name}</span>
                    <span className="truncate text-pc-base text-text2">
                      {Number(b.booking_date.slice(5, 7))}/{Number(b.booking_date.slice(8, 10))}{" "}
                      {b.booking_time} · {(b.service_names || []).join(" / ") || "—"}
                    </span>
                    <span className="text-pc-sm tabular-nums text-text3">
                      {dotted(kstYmd(new Date(b.created_at)))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SmallCard({
  href,
  title,
  desc,
  value,
  danger
}: {
  href: Route;
  title: string;
  desc: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <Link href={href} className="float-card flex min-h-[168px] flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-pc-lg font-bold text-dash-ink">{title}</p>
          <p className="mt-1 text-pc-sm text-text2">{desc}</p>
        </div>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-[20px] w-[20px] shrink-0 text-dash-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17 17 7" />
          <path d="M8 7h9v9" />
        </svg>
      </div>
      <p className="text-right">
        <span
          className={clsx(
            "text-pc-4xl font-bold leading-none tracking-[-0.02em]",
            danger ? "text-danger" : "text-dash-ink"
          )}
        >
          {value.toLocaleString("ko-KR")}
        </span>
        <span className="ml-1 text-pc-lg font-bold text-dash-ink">건</span>
      </p>
    </Link>
  );
}

const BAR_AREA = 240;
const BAR_MIN = 40;

function BarStrip({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(0, ...buckets.map((b) => b.value));
  const dense = buckets.length > 7;

  if (buckets.length === 0) {
    return <p className="flex h-[272px] items-center justify-center text-pc-base text-text3">매출이 없습니다</p>;
  }

  return (
    <div className="mt-6">
      <div className="flex items-end gap-2" style={{ height: BAR_AREA }}>
        {buckets.map((b) => (
          <div
            key={b.key}
            title={`${b.label} · ${won(b.value)}원`}
            className={clsx(
              "flex flex-1 justify-center rounded-pc pt-[10px]",
              b.current ? "bg-primary" : "bg-line"
            )}
            style={{ height: BAR_MIN + (max > 0 ? (b.value / max) * (BAR_AREA - BAR_MIN) : 0) }}
          >
            <span
              className={clsx(
                "leading-none",
                dense ? "text-pc-xs font-bold" : "text-pc-xl font-extrabold",
                b.current ? "text-primary-on" : "text-text3"
              )}
            >
              {shortValue(b.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {buckets.map((b) => (
          <span
            key={b.key}
            className={clsx(
              "flex-1 truncate text-center text-pc-sm font-semibold",
              b.current ? "text-primary" : "text-text3"
            )}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
