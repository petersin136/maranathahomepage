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

export type DashMonthPoint = {
  key: string;
  label: string;
  count: number;
  current: boolean;
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
  monthTrend: DashMonthPoint[];
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

/** Pending rows for the dashboard list. Shared with the shell badge on /admin. */
export const getPendingBookings = cache(async () => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("bookings")
    .select(BOOKING_FIELDS)
    .eq("status", "pending")
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DashBooking[];
});

/** Badge count only. No row body. */
export const getPendingCount = cache(async () => {
  const admin = getSupabaseAdmin();
  const { count, error } = await admin
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
});

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

  const trendFrom = shiftMonth(y, m, -5);
  const trendStart = formatYmd(trendFrom.y, trendFrom.m, 1);
  const [todayRes, weekRes, monthRes, pendingBookings, monthTrendRes] = await Promise.all([
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
    getPendingBookings(),
    admin
      .from("bookings")
      .select("booking_date")
      .gte("booking_date", trendStart)
      .lte("booking_date", monthEnd)
      .not("status", "in", EXCLUDED_STATUSES)
  ]);

  if (monthTrendRes.error) throw new Error(monthTrendRes.error.message);
  const todayBookings = (todayRes.data ?? []) as DashBooking[];

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
    pendingBookings,
    monthTrend: buildMonthTrend(today, monthTrendRes.data ?? [])
  };
}

function shiftMonth(y: number, m: number, delta: number) {
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1 };
}

function buildMonthTrend(today: string, rows: { booking_date: string | null }[]): DashMonthPoint[] {
  const { y, m } = parseYmd(today);
  const points: DashMonthPoint[] = [];
  for (let back = 5; back >= 0; back -= 1) {
    const shifted = shiftMonth(y, m, -back);
    const key = `${shifted.y}-${String(shifted.m).padStart(2, "0")}`;
    const yearChanged = points.length === 0 || points[points.length - 1].key.slice(0, 4) !== String(shifted.y);
    points.push({
      key,
      label: yearChanged ? `${String(shifted.y).slice(2)}. ${shifted.m}월` : `${shifted.m}월`,
      count: 0,
      current: back === 0
    });
  }
  const index = new Map(points.map((point, i) => [point.key, i]));
  for (const row of rows) {
    const key = (row.booking_date || "").slice(0, 7);
    const at = index.get(key);
    if (at == null) continue;
    points[at].count += 1;
  }
  return points;
}

/** Request-scoped dedupe for Suspense children on the page. */
export const getDashboardData = cache(fetchDashboardData);

export type PopularService = {
  serviceId: string;
  name: string;
  count: number;
};

const POPULAR_FIELDS = "id, booking_date, status, service_ids, service_names";

/** 인기 시술은 매장 전체 트렌드라 designer 도 전체를 본다. 금액은 조회하지 않는다. */
export async function fetchPopularServices(from: string, to: string): Promise<PopularService[]> {
  const admin = getSupabaseAdmin();
  const [bookingsRes, servicesRes] = await Promise.all([
    admin
      .from("bookings")
      .select(POPULAR_FIELDS)
      .eq("status", "completed")
      .gte("booking_date", from)
      .lte("booking_date", to),
    admin.from("services").select("id, name")
  ]);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (servicesRes.error) throw new Error(servicesRes.error.message);

  const nameById = new Map(
    (servicesRes.data ?? []).map((row) => [String(row.id), String(row.name ?? "")])
  );
  const counts = new Map<string, { name: string; count: number }>();

  for (const row of bookingsRes.data ?? []) {
    const ids = Array.isArray(row.service_ids) ? row.service_ids.map((id) => String(id)) : [];
    const names = Array.isArray(row.service_names) ? row.service_names.map((name) => String(name ?? "")) : [];
    const seen = new Set<string>();
    ids.forEach((id, index) => {
      const serviceId = id.trim();
      if (!serviceId || seen.has(serviceId)) return;
      seen.add(serviceId);
      const current = (nameById.get(serviceId) ?? "").trim();
      const snapshot = (names[index] ?? "").trim();
      const name = current || snapshot || serviceId;
      const prev = counts.get(serviceId);
      if (prev) prev.count += 1;
      else counts.set(serviceId, { name, count: 1 });
    });
  }

  return [...counts.entries()]
    .map(([serviceId, row]) => ({ serviceId, name: row.name, count: row.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"))
    .slice(0, 5);
}