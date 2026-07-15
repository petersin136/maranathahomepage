import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";

const BOOKING_FIELDS =
  "id, booking_date, booking_time, customer_name, artist_name, status, deposit_paid, service_names";

function todayKst() {
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

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const admin = getSupabaseAdmin();
  const today = todayKst();
  const weekStart = weekStartMonday(today);
  const weekEnd = addDays(weekStart, 6);
  const { y, m } = parseYmd(today);
  const monthStart = formatYmd(y, m, 1);
  const monthEnd = formatYmd(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());

  const [todayRes, weekRes, monthRes, pendingListRes, pendingCountRes] = await Promise.all([
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .eq("booking_date", today)
      .order("booking_time", { ascending: true }),
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .gte("booking_date", weekStart)
      .lte("booking_date", weekEnd)
      .neq("booking_date", today)
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true }),
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .or(`booking_date.lt.${weekStart},booking_date.gt.${weekEnd}`)
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true }),
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .eq("status", "pending")
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true }),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending")
  ]);

  return NextResponse.json({
    ok: true,
    today,
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
    todayCount: todayRes.data?.length ?? 0,
    pendingCount: pendingCountRes.count ?? 0,
    todayBookings: todayRes.data ?? [],
    weekBookings: weekRes.data ?? [],
    monthBookings: monthRes.data ?? [],
    pendingBookings: pendingListRes.data ?? []
  });
}
