import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/admin/auth";

export async function GET(request: Request) {

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const artistId = searchParams.get("artistId");

  if (!from || !to) {
    return NextResponse.json(
      { ok: false, error: "from, to 날짜가 필요합니다." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from("bookings")
    .select(
      "id, booking_date, booking_time, artist_id, artist_name, customer_name, status, service_names"
    )
    .gte("booking_date", from)
    .lte("booking_date", to)
    .order("booking_date")
    .order("booking_time");

  if (artistId) query = query.eq("artist_id", artistId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, bookings: data ?? [] });
}
