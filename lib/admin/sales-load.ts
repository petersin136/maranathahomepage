import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class SalesQueryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
import {
  aggregateSales,
  kstDayEndExclusiveIso,
  kstDayStartIso,
  resolveSalesPeriod,
  type SalesDashboard,
  type SalesPreset
} from "@/lib/admin/sales-data";

const SALE_FIELDS =
  "id, status, paid_at, final_amount, payment_method, cash_receipt_issued, artist_id, artist_name, service_names, booking_date";

async function fetchCompletedInPaidRange(
  admin: ReturnType<typeof getSupabaseAdmin>,
  from: string,
  to: string
) {
  const { data, error } = await admin
    .from("bookings")
    .select(SALE_FIELDS)
    .eq("status", "completed")
    .gte("paid_at", kstDayStartIso(from))
    .lt("paid_at", kstDayEndExclusiveIso(to))
    .limit(5000);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function loadSalesDashboard(
  preset: SalesPreset | string | null,
  from?: string | null,
  to?: string | null
): Promise<SalesDashboard> {
  const period = resolveSalesPeriod(preset, from ?? null, to ?? null);
  if ("error" in period) throw new SalesQueryError(period.error, 400);

  const admin = getSupabaseAdmin();
  const [currentCompleted, previousCompleted, periodBookingsRes, artistsRes] = await Promise.all([
    fetchCompletedInPaidRange(admin, period.from, period.to),
    fetchCompletedInPaidRange(admin, period.prevFrom, period.prevTo),
    admin
      .from("bookings")
      .select("id, status")
      .gte("booking_date", period.from)
      .lte("booking_date", period.to)
      .limit(5000),
    admin.from("artists").select("id, name_kr, name_en, commission_rate")
  ]);

  if (periodBookingsRes.error) throw new Error(periodBookingsRes.error.message);

  let artists = artistsRes.data ?? [];
  if (artistsRes.error) {
    const fallback = await admin.from("artists").select("id, name_kr, name_en");
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
