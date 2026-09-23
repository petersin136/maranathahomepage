import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import { aggregateCustomersDashboard } from "@/lib/admin/customers-data";

export const preferredRegion = "icn1";

const BOOKING_FIELDS =
  "id, status, booking_date, booking_time, customer_name, customer_phone, artist_id, artist_name, service_ids, service_names, final_amount, deposit_paid";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const admin = getSupabaseAdmin();
    const [bookingsRes, servicesRes] = await Promise.all([
      admin
        .from("bookings")
        .select(BOOKING_FIELDS)
        .order("booking_date", { ascending: true })
        .order("booking_time", { ascending: true })
        .limit(20000),
      admin.from("services").select("id, name, revisit_days")
    ]);

    if (bookingsRes.error) throw new Error(bookingsRes.error.message);
    if (servicesRes.error) throw new Error(servicesRes.error.message);

    const data = aggregateCustomersDashboard({
      bookings: (bookingsRes.data ?? []) as never,
      services: (servicesRes.data ?? []) as never
    });

    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("[admin/customers GET]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
