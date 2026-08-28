import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type DashBooking = {
  id: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  artist_name: string | null;
  status: string;
  deposit_paid: boolean;
  service_names: string[] | null;
};

export type DashboardData = {
  today: string;
  weekStart: string;
  weekEnd: string;
  monthStart: string;
  monthEnd: string;
  todayCount: number;
  pendingCount: number;
  todayBookings: DashBooking[];
  weekBookings: DashBooking[];
  monthBookings: DashBooking[];
  pendingBookings: DashBooking[];
};

const BOOKING_FIELDS =
  "id, booking_date, booking_time, customer_name, artist_name, status, deposit_paid, service_names";

/** Exclude cancelled / noshow from schedule lists & TODAY count (DB value is `noshow`). */
const EXCLUDED_STATUSES = "(cancelled,noshow)";

export function todayKst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

/** Parse YYYY-MM-DD as local calendar date parts (no TZ shift). */
function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function formatYmd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addDays(ymd: string, delta: number) {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Monday of the week containing `ymd` (KST calendar date). */
function weekStartMonday(ymd: string) {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(ymd, -back);
}

/**
 * Dashboard bookings — DB-filtered queries in parallel.
 * Auth is assumed already enforced by middleware (page) or requireAdminUser (API).
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const admin = getSupabaseAdmin();
  const today = todayKst();
  const weekStart = weekStartMonday(today);
  const weekEnd = addDays(weekStart, 6);
  const { y, m } = parseYmd(today);
  const monthStart = formatYmd(y, m, 1);
  const monthEnd = formatYmd(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());

  const [todayRes, weekRes, monthRes, pendingListRes] = await Promise.all([
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .eq("booking_date", today)
      .not("status", "in", EXCLUDED_STATUSES)
      .order("booking_time", { ascending: true }),
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .gte("booking_date", weekStart)
      .lte("booking_date", weekEnd)
      .neq("booking_date", today)
      .not("status", "in", EXCLUDED_STATUSES)
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true }),
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .or(`booking_date.lt.${weekStart},booking_date.gt.${weekEnd}`)
      .not("status", "in", EXCLUDED_STATUSES)
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true }),
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .eq("status", "pending")
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true })
  ]);

  const todayBookings = (todayRes.data ?? []) as DashBooking[];
  const pendingBookings = (pendingListRes.data ?? []) as DashBooking[];

  return {
    today,
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
    todayCount: todayBookings.length,
    pendingCount: pendingBookings.length,
    todayBookings,
    weekBookings: (weekRes.data ?? []) as DashBooking[],
    monthBookings: (monthRes.data ?? []) as DashBooking[],
    pendingBookings
  };
}

/** Request-scoped dedupe for Suspense children on the page. */
export const getDashboardData = cache(fetchDashboardData);