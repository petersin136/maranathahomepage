import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  aggregateSettlements,
  attachSettlementStatus,
  expandSettlementSummary,
  isSettlementSnapshot,
  resolveSettlementMonth,
  scopeSettlementsForDesigner,
  settlementPaidAtRange,
  shiftYearMonth,
  yearMonthKey,
  type SettlementDashboard,
  type SettlementSnapshot
} from "@/lib/admin/settlements-data";

export class SettlementsQueryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const BOOKING_FIELDS =
  "id, artist_id, booking_date, paid_at, customer_name, service_names, payment_method, final_amount";

const ARTIST_FIELDS =
  "id, name_kr, employment_type, commission_rate, bank_name, bank_account, bank_holder, sort_order";

async function loadPayouts(yearMonth: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("settlement_payouts")
    .select("artist_id, paid_at")
    .eq("year_month", yearMonth);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.artist_id && row.paid_at) map.set(String(row.artist_id), String(row.paid_at));
  }
  return map;
}

async function loadClose(yearMonth: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("settlement_closes")
    .select("closed_at, snapshot")
    .eq("year_month", yearMonth)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (!isSettlementSnapshot(data.snapshot)) {
    throw new Error("마감 스냅샷이 올바르지 않습니다.");
  }
  return { closedAt: String(data.closed_at), snapshot: data.snapshot as SettlementSnapshot };
}

export async function loadSettlementsDashboard(
  yearRaw: string | null,
  monthRaw: string | null,
  onlyArtistId?: string
): Promise<SettlementDashboard> {
  const month = resolveSettlementMonth(yearRaw, monthRaw);
  if ("error" in month) throw new SettlementsQueryError(month.error, 400);

  const admin = getSupabaseAdmin();
  const paidRange = settlementPaidAtRange(month.from, month.to);

  let bookingsQuery = admin
    .from("bookings")
    .select(BOOKING_FIELDS)
    .eq("status", "completed")
    .not("final_amount", "is", null)
    .gte("paid_at", paidRange.gte)
    .lt("paid_at", paidRange.lt);
  if (onlyArtistId) bookingsQuery = bookingsQuery.eq("artist_id", onlyArtistId);

  let artistsQuery = admin.from("artists").select(ARTIST_FIELDS).order("sort_order", { ascending: true });
  if (onlyArtistId) artistsQuery = artistsQuery.eq("id", onlyArtistId);

  const [bookingsRes, artistsRes] = await Promise.all([
    bookingsQuery.limit(5000),
    artistsQuery
  ]);

  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (artistsRes.error) throw new Error(artistsRes.error.message);

  return aggregateSettlements({
    year: month.year,
    month: month.month,
    from: month.from,
    to: month.to,
    artists: artistsRes.data ?? [],
    bookings: (bookingsRes.data ?? []) as never,
    includeIdleArtists: true
  });
}

function dashboardFromSnapshot(
  snapshot: SettlementSnapshot,
  closedAt: string,
  payouts: Map<string, string>
): SettlementDashboard {
  const artists = attachSettlementStatus(snapshot.artists, true, payouts);
  return {
    year: snapshot.year,
    month: snapshot.month,
    from: snapshot.from,
    to: snapshot.to,
    closed: true,
    closedAt,
    prevMonthPayout: 0,
    summary: expandSettlementSummary(artists, snapshot.summary),
    artists
  };
}

async function loadPrevMonthPayout(year: number, month: number, onlyArtistId?: string) {
  const prev = shiftYearMonth(year, month, -1);
  const prevKey = yearMonthKey(prev.year, prev.month);
  const closed = await loadClose(prevKey);
  if (closed) {
    const view = dashboardFromSnapshot(closed.snapshot, closed.closedAt, new Map());
    const scoped = onlyArtistId ? scopeSettlementsForDesigner(view, onlyArtistId) : view;
    return scoped.summary.totalNetPay;
  }
  const live = await loadSettlementsDashboard(String(prev.year), String(prev.month), onlyArtistId);
  return live.summary.totalNetPay;
}

export async function loadSettlementsView(args: {
  yearRaw: string | null;
  monthRaw: string | null;
  role: "owner" | "designer";
  artistId: string | null;
}): Promise<SettlementDashboard> {
  const month = resolveSettlementMonth(args.yearRaw, args.monthRaw);
  if ("error" in month) throw new SettlementsQueryError(month.error, 400);
  if (args.role === "designer" && !args.artistId) {
    throw new SettlementsQueryError("접근 권한이 없습니다.", 403);
  }

  const ym = yearMonthKey(month.year, month.month);
  const onlyArtistId = args.role === "designer" && args.artistId ? args.artistId : undefined;
  const closed = await loadClose(ym);

  let data: SettlementDashboard;
  if (closed) {
    const payouts = await loadPayouts(ym);
    data = dashboardFromSnapshot(closed.snapshot, closed.closedAt, payouts);
    if (onlyArtistId) data = scopeSettlementsForDesigner(data, onlyArtistId);
  } else {
    data = await loadSettlementsDashboard(args.yearRaw, args.monthRaw, onlyArtistId);
    if (onlyArtistId) data = scopeSettlementsForDesigner(data, onlyArtistId);
  }

  const prevMonthPayout = await loadPrevMonthPayout(data.year, data.month, onlyArtistId);
  return { ...data, prevMonthPayout };
}
