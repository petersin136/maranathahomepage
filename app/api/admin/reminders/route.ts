import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const includeSent =
    searchParams.get("include_sent") === "1" || searchParams.get("include_sent") === "true";

  const admin = getSupabaseAdmin();
  let query = admin.from("customer_reminders").select("*").order("remind_date", { ascending: true });

  if (!includeSent) query = query.eq("sent", false);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, reminders: data ?? [] });
}
