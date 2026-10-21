"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo } from "react";
import { clsx } from "clsx";
import { DashboardMonthChart } from "@/components/admin/DashboardMonthChart";
import type { DashBooking, DashMonthPoint, MonthPaySnapshot, PopularService } from "@/lib/admin/dashboard-data";

const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const STATUS_ROWS = [
  { key: "completed", label: "시술 완료", color: "#2A744B" },
  { key: "confirmed", label: "예약 확정", color: "#3A5476" },
  { key: "pending", label: "확정 대기", color: "#8A847C" }
] as const;

const PAY_META = {
  card: { label: "카드", color: "#2F3A2F" },
  transfer: { label: "계좌이체", color: "#3A5476" },
  cash: { label: "현금", color: "#B16242" }
} as const;

const ARTIST_TONE = ["#2F3A2F", "#3A5476", "#2A744B", "#B16242", "#9A948C"];
/** 디자이너 하루 예약 목표(건). 상대 비교가 아니라 절대 기준으로 막대를 채운다. */
const ARTIST_DAY_COUNT_TARGET = 10;
/** 디자이너 하루 예상 매출 목표(원). */
const ARTIST_DAY_AMOUNT_TARGET = 1_000_000;

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function bookingAmount(row: DashBooking) {
  if (row.status === "completed" && row.final_amount != null) return Number(row.final_amount) || 0;
  return Number(row.total_amount ?? row.final_amount ?? 0) || 0;
}

function targetShare(value: number, target: number) {
  if (target <= 0 || value <= 0) return 0;
  return Math.min(100, (value / target) * 100);
}

function TargetBar({
  share,
  color,
  ticks,
  size = "tall",
  dimmed = false
}: {
  share: number;
  color: string;
  ticks: number;
  size?: "tall" | "thin";
  dimmed?: boolean;
}) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-[3px] bg-[#E4DFD6] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
        size === "tall" ? "mt-3 h-[14px]" : "mt-2 h-[8px]"
      )}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
        style={{
          width: `${share}%`,
          background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
          opacity: dimmed ? 0.78 : 1
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 flex">
        {Array.from({ length: Math.max(0, ticks - 1) }, (_, index) => (
          <span
            key={index}
            className="box-border h-full border-r border-white/75"
            style={{ width: `${100 / ticks}%` }}
          />
        ))}
      </div>
    </div>
  );
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
  const hourPeak = Math.max(4, ...hourCounts);

  const showArtistAmount = monthPay != null;
  const artists = useMemo(() => {
    const map = new Map<string, { name: string; count: number; amount: number }>();
    for (const row of todayBookings) {
      const name = row.artist_name || "미지정";
      const cur = map.get(name) ?? { name, count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += bookingAmount(row);
      map.set(name, cur);
    }
    return [...map.values()].sort((a, b) => b.count - a.count || b.amount - a.amount || a.name.localeCompare(b.name, "ko"));
  }, [todayBookings]);

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
          <div className="mt-4 flex min-h-[220px] flex-1 flex-col">
            <div className="mb-[8px] flex gap-1.5">
              {HOURS.map((hour, index) => {
                const count = hourCounts[index];
                const current = hour === now.hour;
                const hot = count === hourPeak && count > 0;
                return (
                  <p
                    key={hour}
                    className={clsx(
                      "min-w-0 flex-1 text-center text-[12px] font-bold tabular-nums leading-none",
                      current || hot ? "text-[#1C1C1C]" : "text-[color:var(--muted)]"
                    )}
                  >
                    {count > 0 ? `${count}건` : "\u00a0"}
                  </p>
                );
              })}
            </div>
            <div className="relative flex min-h-0 flex-1 items-end gap-1.5">
              <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-0">
                {[0, 1, 2, 3].map((step) => (
                  <span key={step} className="block w-full border-t border-[#E4DFD6]" />
                ))}
              </div>
              {HOURS.map((hour, index) => {
                const count = hourCounts[index];
                const height = count === 0 ? 0 : Math.max(12, (count / hourPeak) * 100);
                const current = hour === now.hour;
                const hot = count === hourPeak && count > 0;
                return (
                  <div key={hour} className="relative z-[1] flex h-full min-w-0 flex-1 flex-col justify-end">
                    {count > 0 ? (
                      <div
                        className="w-full rounded-t-[6px] shadow-[0_1px_0_rgba(28,28,28,0.06),inset_0_1px_0_rgba(255,255,255,0.4)]"
                        style={{
                          height: `${height}%`,
                          background: current
                            ? "linear-gradient(180deg, #5A6B5A 0%, #2F3A2F 55%, #1F2820 100%)"
                            : hot
                              ? "linear-gradient(180deg, #5C675C 0%, #3A463A 100%)"
                              : "linear-gradient(180deg, #A39B90 0%, #6F6962 100%)"
                        }}
                      />
                    ) : (
                      <div className="h-[4px] w-full rounded-full bg-[#DED8CF]" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1.5 border-t border-[#D9D3CB] pt-2">
              {HOURS.map((hour) => {
                const current = hour === now.hour;
                return (
                  <p
                    key={hour}
                    className={clsx(
                      "min-w-0 flex-1 text-center text-[12px] tabular-nums leading-none",
                      current ? "font-bold text-[#1C1C1C]" : "text-[color:var(--muted)]"
                    )}
                  >
                    {hour}시
                  </p>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
          <SectionTitle
            href="/admin/calendar"
            title="담당자별 오늘"
            hint={
              showArtistAmount
                ? `${artists.length.toLocaleString("ko-KR")}명 · 목표 ${ARTIST_DAY_COUNT_TARGET}건 / ${won(ARTIST_DAY_AMOUNT_TARGET)}`
                : `${artists.length.toLocaleString("ko-KR")}명 · 목표 ${ARTIST_DAY_COUNT_TARGET}건`
            }
          />
          {artists.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-16 text-center text-[14px] font-medium leading-normal text-[#8A847C]">
              오늘 예약이 없습니다.
            </p>
          ) : (
            <ul className="mt-1">
              {artists.map((artist, index) => {
                const tone = ARTIST_TONE[index % ARTIST_TONE.length];
                return (
                  <li key={artist.name} className="pt-5">
                    <div className="flex items-center justify-between gap-4 text-[16px] font-medium leading-normal">
                      <span className="flex min-w-0 items-center">
                        <span
                          className="mr-2 inline-block h-[11px] w-[11px] shrink-0 rounded-[4px] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                          style={{ background: tone }}
                        />
                        <span className="truncate">{artist.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[color:var(--muted)]">
                        {artist.count.toLocaleString("ko-KR")}건
                        {showArtistAmount ? ` · ${won(artist.amount)}` : ""}
                      </span>
                    </div>
                    <TargetBar
                      share={targetShare(artist.count, ARTIST_DAY_COUNT_TARGET)}
                      color={tone}
                      ticks={ARTIST_DAY_COUNT_TARGET}
                      size="tall"
                    />
                    {showArtistAmount ? (
                      <TargetBar
                        share={targetShare(artist.amount, ARTIST_DAY_AMOUNT_TARGET)}
                        color={tone}
                        ticks={5}
                        size="thin"
                        dimmed
                      />
                    ) : null}
                  </li>
                );
              })}
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
          <SectionTitle
            href="/admin/bookings"
            title="오늘 예약 상태"
            hint={`오늘 전체 ${statusTotal.toLocaleString("ko-KR")}건`}
            note="시술이 끝났는지, 예약만 확정됐는지, 아직 대기 중인지 비중입니다."
          />
          <div className="mt-5 flex h-[14px] overflow-hidden rounded-[3px] bg-[#E4DFD6]">
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
                  <span
                    className="mr-2 inline-block h-[11px] w-[11px] shrink-0 rounded-[3px]"
                    style={{ background: row.color }}
                  />
                  <span className="font-bold tabular-nums">{statusPercents[index]}%</span>
                  <span className="ml-2">{row.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-[color:var(--muted)]">
                  {statusCounts[index].toLocaleString("ko-KR")}건
                </span>
              </li>
            ))}
          </ul>
        </section>

        {monthPay ? (
          <section className="rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
            <SectionTitle
              href="/admin/sales"
              title="이번 달 결제 수단"
              hint={`결제 총액 ${won(monthPay.total)}`}
              note="이번 달 고객이 카드·계좌이체·현금으로 낸 금액 비중입니다."
            />
            <div className="mt-5 flex h-[14px] overflow-hidden rounded-[3px] bg-[#E4DFD6]">
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
                      className="mr-2 inline-block h-[11px] w-[11px] shrink-0 rounded-[3px]"
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

function SectionTitle({
  title,
  hint,
  href,
  note
}: {
  title: string;
  hint: string;
  href?: Route;
  note?: string;
}) {
  const titleClass = "text-[15px] font-bold leading-normal text-[color:var(--label)]";
  return (
    <div>
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
      {note ? <p className="mt-2 text-[13px] leading-normal text-[color:var(--muted)]">{note}</p> : null}
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
  href: Route;
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
