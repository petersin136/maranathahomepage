"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { DashboardMonthChart } from "@/components/admin/DashboardMonthChart";
import {
  ArtistFilterChip,
  CheckBox,
  useOutsideClose
} from "@/components/admin/finance-ui";
import { useAdminSession } from "@/components/admin/admin-session";
import type { DashBooking, DashMonthPoint, PopularService } from "@/lib/admin/dashboard-data";

const TABLE_HEAD_ROW = "border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold leading-normal text-[#9A948C]";
const TABLE_ROW = "border-b border-[#F3EFEA]";
const TH = "py-4 pr-3 font-bold";
const TD = "py-5 pr-3";

const actionClass =
  "inline-flex h-[34px] items-center justify-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold text-[#1C1C1C]";

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "#8A847C" },
  confirmed: { label: "확정", color: "#3A5476" },
  completed: { label: "완료", color: "#2A744B" },
  cancelled: { label: "취소", color: "#B16242" },
  noshow: { label: "노쇼", color: "#B16242" }
};

type Staff = { id: string; name_kr: string; role: string | null };

function formatDashDate(date: string) {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${y.slice(2)}. ${m}. ${d}`;
}

function matchesArtist(artistId: string | null, selected: string[], lockedArtistId: string | null) {
  if (lockedArtistId) return artistId === lockedArtistId;
  if (selected.length === 0) return true;
  return artistId != null && selected.includes(artistId);
}

export function DashboardBoard({
  weekStart,
  weekEnd,
  todayBookings,
  weekBookings,
  monthBookings,
  pendingBookings,
  monthTrend,
  services
}: {
  weekStart: string;
  weekEnd: string;
  todayBookings: DashBooking[];
  weekBookings: DashBooking[];
  monthBookings: DashBooking[];
  pendingBookings: DashBooking[];
  monthTrend: DashMonthPoint[];
  services: PopularService[];
}) {
  const session = useAdminSession();
  const lockedArtistId = session?.role === "designer" ? session.artistId : null;
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [artistFilter, setArtistFilter] = useState<string[]>(() => (lockedArtistId ? [lockedArtistId] : []));
  const [staffOpen, setStaffOpen] = useState(false);
  const closeStaff = useCallback(() => setStaffOpen(false), []);
  const staffRef = useOutsideClose(staffOpen, closeStaff);

  useEffect(() => {
    if (!staffOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStaff();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [staffOpen, closeStaff]);

  useEffect(() => {
    if (!lockedArtistId) return;
    setArtistFilter((cur) => (cur.length === 1 && cur[0] === lockedArtistId ? cur : [lockedArtistId]));
    setStaffOpen(false);
  }, [lockedArtistId]);

  useEffect(() => {
    if (lockedArtistId) return;
    let cancelled = false;
    fetch("/api/admin/artists")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setStaff(json.ok ? (json.artists as Staff[]) : []);
      })
      .catch(() => {
        if (cancelled) return;
        setStaff([]);
      });
    return () => {
      cancelled = true;
    };
  }, [lockedArtistId]);

  const visible = useMemo(() => {
    const keep = (row: DashBooking) => matchesArtist(row.artist_id, artistFilter, lockedArtistId);
    return {
      today: todayBookings.filter(keep),
      pending: pendingBookings.filter(keep),
      week: weekBookings.filter(keep),
      month: monthBookings.filter(keep)
    };
  }, [todayBookings, pendingBookings, weekBookings, monthBookings, artistFilter, lockedArtistId]);

  const trendTotal = monthTrend.reduce((sum, point) => sum + point.count, 0);
  const weekLabel =
    weekStart && weekEnd ? `${formatDashDate(weekStart)} ~ ${formatDashDate(weekEnd)} · 오늘 제외` : "이번 주 · 오늘 제외";

  return (
    <>
      <div className="mt-6" ref={staffRef}>
        <ArtistFilterChip
          count={lockedArtistId ? 1 : artistFilter.length}
          open={lockedArtistId ? false : staffOpen}
          locked={!!lockedArtistId}
          name={session?.artistName}
          onToggle={() => setStaffOpen((v) => !v)}
          menu={
            <div className="absolute left-0 top-full z-50 mt-[6px] min-w-full rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
              {staff == null || staff.length === 0 ? (
                <p className="px-5 py-2 text-[14px] text-[#8A847C]">담당자 없음</p>
              ) : (
                staff.map((person) => {
                  const checked = artistFilter.includes(person.id);
                  return (
                    <div key={person.id} className="px-5 py-2 hover:bg-[#F6F4F0]">
                      <CheckBox
                        checked={checked}
                        label={[person.name_kr, person.role].filter(Boolean).join(" ")}
                        onChange={(next) => {
                          if (lockedArtistId) return;
                          setArtistFilter((cur) => (next ? [...cur, person.id] : cur.filter((id) => id !== person.id)));
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <StatCard href="#dash-today" label="오늘 예약" value={visible.today.length} hint="오늘 일정" tone="accent" />
        <StatCard href="#dash-pending" label="확정 대기" value={visible.pending.length} hint="확정을 기다리는 예약" />
        <StatCard href="#dash-week" label="주간 예약" value={visible.week.length} hint="오늘 제외" />
        <StatCard href="#dash-month" label="월간 예약" value={visible.month.length} hint="이번 주 제외" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <section className="flex flex-col rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
          <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">최근 6개월</h2>
          <p className="mt-2 text-[13px] leading-normal text-[color:var(--muted)]">
            {trendTotal === 0 ? "집계할 예약이 없습니다" : `예약 ${trendTotal.toLocaleString("ko-KR")}건 · 이번 달은 진한 막대`}
          </p>
          <div className="mt-5 min-h-[260px] flex-1 rounded-[8px] bg-white px-3 py-3">
            <DashboardMonthChart points={monthTrend} />
          </div>
        </section>

        <section className="flex flex-col rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
          <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">인기 시술</h2>
          <p className="mt-2 text-[13px] leading-normal text-[color:var(--muted)]">이번 달 · 완료 기준</p>
          {services.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-16 text-center text-[14px] font-medium leading-normal text-[#8A847C]">
              이번 달 완료된 시술이 없습니다.
            </p>
          ) : (
            <ul className="mt-1">
              {services.map((row, index) => {
                const peak = services.reduce((max, item) => Math.max(max, item.count), 0);
                const share = peak > 0 ? (row.count / peak) * 100 : 0;
                return (
                  <li key={row.serviceId} className="pt-5">
                    <div className="flex items-center justify-between gap-4 text-[16px] font-medium leading-normal">
                      <span className="flex min-w-0 items-center">
                        <span className="font-bold tabular-nums">{index + 1}</span>
                        <span className="ml-2 truncate">{row.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[color:var(--muted)]">
                        {row.count.toLocaleString("ko-KR")}건
                      </span>
                    </div>
                    <div className="mt-3 h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
                      <div className="h-full rounded-[2px] bg-[color:var(--accent)]" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div id="dash-pending" className="mt-10 scroll-mt-8">
        <BookingSection
          title="확정 대기"
          subtitle="확정을 기다리는 예약"
          empty="대기 중인 예약이 없습니다."
          bookings={visible.pending}
          showDate
          action={
            <Link href="/admin/bookings" className={actionClass}>
              예약 전체
            </Link>
          }
        />
      </div>

      <div id="dash-today" className="mt-10 scroll-mt-8">
        <BookingSection
          title="오늘의 예약"
          empty="오늘 예약이 없습니다."
          bookings={visible.today}
          action={
            <Link href="/admin/bookings" className={actionClass}>
              전체 보기
            </Link>
          }
        />
      </div>

      <div id="dash-week" className="mt-10 scroll-mt-8">
        <BookingSection
          title="주간 예약"
          subtitle={weekLabel}
          empty="이번 주(오늘 제외) 예약이 없습니다."
          bookings={visible.week}
          showDate
        />
      </div>

      <div id="dash-month" className="mt-10 scroll-mt-8">
        <BookingSection
          title="월간 예약"
          subtitle="이번 달 · 이번 주 제외"
          empty="이번 달(주간 제외) 예약이 없습니다."
          bookings={visible.month}
          showDate
        />
      </div>
    </>
  );
}

function StatCard({
  href,
  label,
  value,
  hint,
  tone = "quiet"
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  tone?: "accent" | "quiet";
}) {
  const accent = tone === "accent";
  return (
    <a
      href={href}
      className={clsx(
        "block overflow-visible rounded-[8px] px-5 py-5",
        accent ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--sidebar-bg)] text-[#1C1C1C] hover:bg-[#F3EFEA]"
      )}
    >
      <p className={clsx("text-[15px] font-bold leading-normal", accent ? "text-white" : "text-[color:var(--label)]")}>
        {label}
      </p>
      <p className="mt-3 text-[20px] font-bold leading-normal tabular-nums">{value.toLocaleString("ko-KR")}건</p>
      <p
        className={clsx(
          "mt-1 text-[13px] leading-normal",
          accent ? "text-[color:var(--sidebar-bg)]" : "text-[color:var(--muted)]"
        )}
      >
        {hint}
      </p>
    </a>
  );
}

function SectionHead({
  title,
  subtitle,
  count,
  action
}: {
  title: string;
  subtitle?: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 pl-6">
      <div>
        <h2 className="flex items-baseline gap-2 text-[15px] font-bold leading-normal text-[color:var(--label)]">
          {title}
          {count != null ? (
            <span className="text-[13px] font-medium leading-normal text-[color:var(--muted)]">
              {count.toLocaleString("ko-KR")}건
            </span>
          ) : null}
        </h2>
        {subtitle ? <p className="mt-2 text-[13px] leading-normal text-[color:var(--muted)]">{subtitle}</p> : null}
      </div>
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
      <SectionHead title={title} subtitle={subtitle} count={bookings.length} action={action} />
      <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
        <table className="w-full table-fixed text-left text-[16px] font-medium leading-normal">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-[30%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th className={clsx(TH, "pl-1 text-left")}>{showDate ? "일시" : "시간"}</th>
              <th className={clsx(TH, "text-left")}>고객명</th>
              <th className={clsx(TH, "text-left")}>담당자</th>
              <th className={clsx(TH, "text-left")}>시술</th>
              <th className={clsx(TH, "pr-1 text-right")}>상태</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-[14px] font-medium leading-normal text-[#8A847C]">
                  {empty}
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const status = STATUS_META[b.status] ?? { label: b.status, color: "#8A847C" };
                const when = showDate
                  ? `${formatDashDate(b.booking_date)}  ${b.booking_time.slice(0, 5)}`
                  : b.booking_time.slice(0, 5);
                return (
                  <tr key={b.id} className={TABLE_ROW}>
                    <td className={clsx(TD, "truncate pl-1")}>
                      <Link href={`/admin/bookings/${b.id}`} className="hover:underline">
                        {when}
                      </Link>
                    </td>
                    <td className={clsx(TD, "truncate")}>
                      <Link href={`/admin/bookings/${b.id}`} className="hover:underline">
                        {b.customer_name}
                      </Link>
                    </td>
                    <td className={clsx(TD, "truncate")}>{b.artist_name || "—"}</td>
                    <td className={clsx(TD, "truncate")}>{(b.service_names || []).join(" / ") || "—"}</td>
                    <td className={clsx(TD, "pr-1 text-right")}>
                      <span
                        className="inline-flex items-center justify-end gap-1.5 font-medium leading-normal"
                        style={{ color: status.color }}
                      >
                        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: status.color }} />
                        <span>
                          {status.label}
                          {b.deposit_paid ? " · 입금" : ""}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
