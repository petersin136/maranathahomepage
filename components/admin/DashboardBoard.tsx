"use client";

import Link from "next/link";
import { useMemo } from "react";
import { clsx } from "clsx";
import { DashboardMonthChart } from "@/components/admin/DashboardMonthChart";
import type { DashBooking, DashMonthPoint, MonthPaySnapshot, PopularService } from "@/lib/admin/dashboard-data";

const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const STATUS_ROWS = [
  { key: "completed", label: "완료", color: "#2A744B" },
  { key: "confirmed", label: "확정", color: "#3A5476" },
  { key: "pending", label: "대기", color: "#8A847C" }
] as const;

const PAY_META = {
  card: { label: "카드", color: "var(--accent)" },
  transfer: { label: "계좌이체", color: "var(--muted)" },
  cash: { label: "현금", color: "var(--label)" }
} as const;

const ARTIST_TONE = ["#2F3A2F", "#3A5476", "#2A744B", "#B16242", "#9A948C"];

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function kstNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { hour, minutes: hour * 60 + minute };
}

function displayPercents(shares: number[]) {
  if (!shares.some((share) => share > 0)) return shares.map(() => 0);
  const rounded = shares.map((share) => Math.round(share));
  const drift = 100 - rounded.reduce((sum, value) => sum + value, 0);
  if (drift !== 0) {
    const index = rounded.indexOf(Math.max(...rounded));
    rounded[index] += drift;
  }
  return rounded;
}

export function DashboardBoard({
  todayBookings,
  pendingCount,
  monthTrend,
  services,
  monthPay
}: {
  todayBookings: DashBooking[];
  pendingCount: number;
  monthTrend: DashMonthPoint[];
  services: PopularService[];
  monthPay: MonthPaySnapshot | null;
}) {
  const now = kstNow();
  const upcoming = todayBookings.filter((row) => {
    const [hour, minute] = row.booking_time.slice(0, 5).split(":").map(Number);
    return hour * 60 + minute >= now.minutes;
  });
  const next = upcoming[0];
  const visitors = useMemo(() => {
    const seen = new Set<string>();
    for (const row of todayBookings) {
      const phone = (row.customer_phone || "").replace(/\D/g, "");
      const key = phone || row.customer_name.trim();
      if (key) seen.add(key);
    }
    return seen.size;
  }, [todayBookings]);

  const hourCounts = HOURS.map((hour) => todayBookings.filter((row) => Number(row.booking_time.slice(0, 2)) === hour).length);
  const hourPeak = Math.max(1, ...hourCounts);

  const artists = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of todayBookings) {
      const name = row.artist_name || "미지정";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  }, [todayBookings]);
  const artistPeak = Math.max(1, ...artists.map(([, count]) => count));

  const statusCounts = STATUS_ROWS.map((row) => todayBookings.filter((booking) => booking.status === row.key).length);
  const statusTotal = statusCounts.reduce((sum, count) => sum + count, 0);
  const statusShares = statusCounts.map((count) => (statusTotal > 0 ? (count / statusTotal) * 100 : 0));
  const statusPercents = displayPercents(statusShares);

  const payPercents = monthPay ? displayPercents(monthPay.methods.map((method) => method.share)) : [];
  const trendTotal = monthTrend.reduce((sum, point) => sum + point.count, 0);
  const servicePeak = services.reduce((max, row) => Math.max(max, row.count), 0);

  return (
    <div className="pb-16">
      <div className="grid grid-cols-4 gap-2">
        <GlanceCard
          href="/admin/bookings"
          label="예약관리"
          value={`${todayBookings.length.toLocaleString("ko-KR")}건`}
          hint={pendingCount > 0 ? `확정 대기 ${pendingCount.toLocaleString("ko-KR")}건` : "확정 대기 없음"}
          tone="accent"
        />
        <GlanceCard
          href="/admin/calendar"
          label="캘린더"
          value={`${upcoming.length.toLocaleString("ko-KR")}건`}
          hint={next ? `다음 ${next.booking_time.slice(0, 5)} ${next.customer_name}` : "오늘 남은 일정 없음"}
        />
        <GlanceCard href="/admin/customers" label="고객관리" value={`${visitors.toLocaleString("ko-KR")}명`} hint="오늘 방문" />
        <GlanceCard
          href="/admin/sales"
          label="매출/정산"
          value={monthPay == null ? "—" : won(monthPay.total)}
          hint="이번 달 결제"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 items-stretch gap-2">
        <section className="flex flex-col rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
          <SectionTitle href="/admin/calendar" title="오늘 시간대" hint="예약 건수" />
          <div className="mt-5 flex h-[220px] items-end gap-2">
            {HOURS.map((hour, index) => {
              const count = hourCounts[index];
              const height = count === 0 ? 0 : Math.max(8, (count / hourPeak) * 100);
              const current = hour === now.hour;
              return (
                <div key={hour} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <p className="mb-2 text-center text-[12px] font-medium tabular-nums text-[color:var(--muted)]">
                    {count > 0 ? count : ""}
                  </p>
                  <div className="flex min-h-0 flex-1 items-end">
                    <div
                      className="w-full rounded-[2px]"
                      style={{
                        height: `${height}%`,
                        background: current ? "#2F3A2F" : count > 0 ? "#D9D3CB" : "transparent"
                      }}
                    />
                  </div>
                  <p
                    className={clsx(
                      "mt-2 text-center text-[12px] tabular-nums",
                      current ? "font-bold text-[#1C1C1C]" : "text-[color:var(--muted)]"
                    )}
                  >
                    {hour}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
          <SectionTitle href="/admin/calendar" title="담당자별 오늘" hint={`${artists.length.toLocaleString("ko-KR")}명`} />
          {artists.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-16 text-center text-[14px] font-medium leading-normal text-[#8A847C]">
              오늘 예약이 없습니다.
            </p>
          ) : (
            <ul className="mt-1">
              {artists.map(([name, count], index) => (
                <li key={name} className="pt-5">
                  <div className="flex items-center justify-between gap-4 text-[16px] font-medium leading-normal">
                    <span className="flex min-w-0 items-center">
                      <span
                        className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full"
                        style={{ background: ARTIST_TONE[index % ARTIST_TONE.length] }}
                      />
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[color:var(--muted)]">{count.toLocaleString("ko-KR")}건</span>
                  </div>
                  <div className="mt-3 h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
                    <div
                      className="h-full rounded-[2px]"
                      style={{
                        width: `${(count / artistPeak) * 100}%`,
                        background: ARTIST_TONE[index % ARTIST_TONE.length]
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-2 items-stretch gap-2">
        <section className="flex flex-col rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
          <SectionTitle title="최근 6개월" hint={trendTotal === 0 ? "집계할 예약이 없습니다" : `예약 ${trendTotal.toLocaleString("ko-KR")}건 · 이번 달은 진한 막대`} />
          <div className="mt-5 h-[260px] flex-1 rounded-[8px] bg-white px-3 py-3">
            <DashboardMonthChart points={monthTrend} />
          </div>
        </section>

        <section className="flex flex-col rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
          <SectionTitle href="/admin/sales" title="이번 달 시술" hint="완료 기준" />
          {services.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-16 text-center text-[14px] font-medium leading-normal text-[#8A847C]">
              이번 달 완료된 시술이 없습니다.
            </p>
          ) : (
            <ul className="mt-1">
              {services.map((row, index) => (
                <li key={row.serviceId} className="pt-5">
                  <div className="flex items-center justify-between gap-4 text-[16px] font-medium leading-normal">
                    <span className="flex min-w-0 items-center">
                      <span className="font-bold tabular-nums">{index + 1}</span>
                      <span className="ml-2 truncate">{row.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[color:var(--muted)]">{row.count.toLocaleString("ko-KR")}건</span>
                  </div>
                  <div className="mt-3 h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
                    <div
                      className="h-full rounded-[2px] bg-[color:var(--accent)]"
                      style={{ width: `${servicePeak > 0 ? (row.count / servicePeak) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className={clsx("mt-4 grid gap-2", monthPay ? "grid-cols-2" : "grid-cols-1")}>
        <section className="rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
          <SectionTitle href="/admin/bookings" title="오늘 예약 상태" hint={`${statusTotal.toLocaleString("ko-KR")}건`} />
          <div className="mt-5 flex h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
            {STATUS_ROWS.map((row, index) =>
              statusShares[index] > 0 ? (
                <span key={row.key} className="h-full" style={{ width: `${statusShares[index]}%`, background: row.color }} />
              ) : null
            )}
          </div>
          <ul className="mt-4">
            {STATUS_ROWS.map((row, index) => (
              <li key={row.key} className="flex items-center justify-between py-[10px] text-[16px] font-medium">
                <span className="flex min-w-0 items-center">
                  <span className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full" style={{ background: row.color }} />
                  <span className="font-bold tabular-nums">{statusPercents[index]}%</span>
                  <span className="ml-2">{row.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-[color:var(--muted)]">{statusCounts[index].toLocaleString("ko-KR")}건</span>
              </li>
            ))}
          </ul>
        </section>

        {monthPay ? (
          <section className="rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
            <SectionTitle href="/admin/sales" title="이번 달 결제 수단" hint={won(monthPay.total)} />
            <div className="mt-5 flex h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
              {monthPay.methods.map((method) =>
                method.share > 0 ? (
                  <span
                    key={method.method}
                    className="h-full"
                    style={{ width: `${method.share}%`, background: PAY_META[method.method].color }}
                  />
                ) : null
              )}
            </div>
            <ul className="mt-4">
              {monthPay.methods.map((method, index) => (
                <li key={method.method} className="flex items-center justify-between py-[10px] text-[16px] font-medium">
                  <span className="flex min-w-0 items-center">
                    <span
                      className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full"
                      style={{ background: PAY_META[method.method].color }}
                    />
                    <span className="font-bold tabular-nums">{payPercents[index]}%</span>
                    <span className="ml-2">{PAY_META[method.method].label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[color:var(--muted)]">{won(method.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({ title, hint, href }: { title: string; hint: string; href?: string }) {
  const titleClass = "text-[15px] font-bold leading-normal text-[color:var(--label)]";
  return (
    <div className="flex items-baseline justify-between gap-3">
      {href ? (
        <Link href={href} className={clsx(titleClass, "hover:text-[#1C1C1C]")}>
          {title}
        </Link>
      ) : (
        <h2 className={titleClass}>{title}</h2>
      )}
      <p className="shrink-0 text-[13px] leading-normal text-[color:var(--muted)]">{hint}</p>
    </div>
  );
}

function GlanceCard({
  href,
  label,
  value,
  hint,
  tone = "quiet"
}: {
  href: string;
  label: string;
  value: string;
  hint: string;
  tone?: "accent" | "quiet";
}) {
  const accent = tone === "accent";
  return (
    <Link
      href={href}
      className={clsx(
        "block overflow-visible rounded-[8px] px-5 py-5",
        accent ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--sidebar-bg)] text-[#1C1C1C] hover:bg-[#F3EFEA]"
      )}
    >
      <p className={clsx("text-[15px] font-bold leading-normal", accent ? "text-white" : "text-[color:var(--label)]")}>{label}</p>
      <p className="mt-3 truncate text-[20px] font-bold leading-normal tabular-nums">{value}</p>
      <p
        className={clsx(
          "mt-1 truncate text-[13px] leading-normal",
          accent ? "text-[color:var(--sidebar-bg)]" : "text-[color:var(--muted)]"
        )}
      >
        {hint}
      </p>
    </Link>
  );
}
