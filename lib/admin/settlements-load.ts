import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  aggregateSettlements,
  resolveSettlementMonth,
  settlementPaidAtRange,
  type SettlementDashboard
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
  "id, name_kr, employment_type, commission_rate, bank_name, bank_account, bank_holder";

export async function loadSettlementsDashboard(
  yearRaw: string | null,
  monthRaw: string | null
): Promise<SettlementDashboard> {
  const month = resolveSettlementMonth(yearRaw, monthRaw);
  if ("error" in month) throw new SettlementsQueryError(month.error, 400);

  const admin = getSupabaseAdmin();
  const paidRange = settlementPaidAtRange(month.from, month.to);

  const [bookingsRes, artistsRes] = await Promise.all([
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .eq("status", "completed")
      .not("final_amount", "is", null)
      .gte("paid_at", paidRange.gte)
      .lt("paid_at", paidRange.lt)
      .limit(5000),
    admin.from("artists").select(ARTIST_FIELDS).order("sort_order", { ascending: true })
  ]);

  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (artistsRes.error) throw new Error(artistsRes.error.message);

  return aggregateSettlements({
    year: month.year,
    month: month.month,
    from: month.from,
    to: month.to,
    artists: artistsRes.data ?? [],
    bookings: (bookingsRes.data ?? []) as never
  });
}
