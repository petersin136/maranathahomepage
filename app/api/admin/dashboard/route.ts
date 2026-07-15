import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/admin/auth";

function todayKst() {
  // Asia/Seoul YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export async function GET() {

  const admin = getSupabaseAdmin();
  const today = todayKst();

  const [todayRes, pendingRes] = await Promise.all([
    admin
      .from("bookings")
      .select(
        "id, booking_date, booking_time, customer_name, artist_name, status, deposit_paid, service_names"
      )
      .eq("booking_date", today)
      .order("booking_time", { ascending: true }),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending")
  ]);

  return NextResponse.json({
    ok: true,
    today,
    todayCount: todayRes.data?.length ?? 0,
    pendingCount: pendingRes.count ?? 0,
    todayBookings: todayRes.data ?? []
  });
}
