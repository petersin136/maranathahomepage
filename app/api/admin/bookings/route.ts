import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;


  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // pending|confirmed|completed|cancelled_noshow|all
  const admin = getSupabaseAdmin();

  let query = admin.from("bookings").select("*").order("booking_date", { ascending: false }).order("booking_time", { ascending: true });

  if (status === "pending") query = query.eq("status", "pending");
  else if (status === "confirmed") query = query.eq("status", "confirmed");
  else if (status === "completed") query = query.eq("status", "completed");
  else if (status === "cancelled_noshow") query = query.in("status", ["cancelled", "noshow"]);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, bookings: data ?? [] });
}
