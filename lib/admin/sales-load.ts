import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  aggregateSales,
  kstDayEndExclusiveIso,
  kstDayStartIso,
  resolveSalesPeriod,
  type SalesDashboard,
  type SalesPreset
} from "@/lib/admin/sales-data";

export class SalesQueryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const SALE_FIELDS =
  "id, status, paid_at, final_amount, payment_method, cash_receipt_issued, artist_id, artist_name, service_names, booking_date, customer_name, customer_phone, deposit_paid, deposit_amount";

async function fetchCompletedInPaidRange(
  admin: ReturnType<typeof getSupabaseAdmin>,
  from: string,
  to: string,
  artistIds: string[]
) {
  let query = admin
    .from("bookings")
    .select(SALE_FIELDS)
    .eq("status", "completed")
    .gte("paid_at", kstDayStartIso(from))
    .lt("paid_at", kstDayEndExclusiveIso(to));
  if (artistIds.length > 0) query = query.in("artist_id", artistIds);
  const { data, error } = await query.limit(5000);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function loadSalesDashboard(
  preset: SalesPreset | string | null,
  from?: string | null,
  to?: string | null,
  artistIds: string[] = []
): Promise<SalesDashboard> {
  const period = resolveSalesPeriod(preset, from ?? null, to ?? null);
  if ("error" in period) throw new SalesQueryError(period.error, 400);

  const admin = getSupabaseAdmin();
  let periodQuery = admin
    .from("bookings")
    .select("id, status, artist_id")
    // 취소·노쇼는 paid_at 이 없어 매출 기간에서 빠지므로 booking_date 로 센다.
    .gte("booking_date", period.from)
    .lte("booking_date", period.to);
  if (artistIds.length > 0) periodQuery = periodQuery.in("artist_id", artistIds);

  let artistsQuery = admin.from("artists").select("id, name_kr, name_en, role, commission_rate");
  if (artistIds.length > 0) artistsQuery = artistsQuery.in("id", artistIds);

  const [currentCompleted, previousCompleted, periodBookingsRes, artistsRes] = await Promise.all([
    fetchCompletedInPaidRange(admin, period.from, period.to, artistIds),
    fetchCompletedInPaidRange(admin, period.prevFrom, period.prevTo, artistIds),
    periodQuery.limit(5000),
    artistsQuery
  ]);

  if (periodBookingsRes.error) throw new Error(periodBookingsRes.error.message);

  let artists = artistsRes.data ?? [];
  if (artistsRes.error) {
    let fallbackQuery = admin.from("artists").select("id, name_kr, name_en, role");
    if (artistIds.length > 0) fallbackQuery = fallbackQuery.in("id", artistIds);
    const fallback = await fallbackQuery;
    if (fallback.error) throw new Error(artistsRes.error.message);
    artists = (fallback.data ?? []).map((a) => ({ ...a, commission_rate: null }));
  }

  return aggregateSales({
    period,
    currentCompleted: currentCompleted as never,
    previousCompleted: previousCompleted as never,
    periodBookings: periodBookingsRes.data ?? [],
    artists
  });
}
