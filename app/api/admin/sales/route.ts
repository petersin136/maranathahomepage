import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import {
  aggregateSales,
  kstDayEndExclusiveIso,
  kstDayStartIso,
  resolveSalesPeriod
} from "@/lib/admin/sales-data";

export const preferredRegion = "icn1";

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

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const period = resolveSalesPeriod(
    searchParams.get("preset"),
    searchParams.get("from"),
    searchParams.get("to")
  );
  if ("error" in period) {
    return NextResponse.json({ ok: false, error: period.error }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const [currentCompleted, previousCompleted, periodBookingsRes, artistsRes] =
      await Promise.all([
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

    const data = aggregateSales({
      period,
      currentCompleted: currentCompleted as never,
      previousCompleted: previousCompleted as never,
      periodBookings: periodBookingsRes.data ?? [],
      artists
    });

    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("[admin/sales]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
