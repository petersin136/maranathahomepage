import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import {
  aggregateSettlements,
  resolveSettlementMonth,
  settlementPaidAtRange
} from "@/lib/admin/settlements-data";

export const preferredRegion = "icn1";

const BOOKING_FIELDS =
  "id, artist_id, booking_date, paid_at, customer_name, service_names, payment_method, final_amount";

const ARTIST_FIELDS =
  "id, name_kr, employment_type, commission_rate, bank_name, bank_account, bank_holder";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const month = resolveSettlementMonth(searchParams.get("year"), searchParams.get("month"));
  if ("error" in month) {
    return NextResponse.json({ ok: false, error: month.error }, { status: 400 });
  }

  try {
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

    const data = aggregateSettlements({
      year: month.year,
      month: month.month,
      from: month.from,
      to: month.to,
      artists: artistsRes.data ?? [],
      bookings: (bookingsRes.data ?? []) as never
    });

    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("[admin/settlements]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "정산 집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
