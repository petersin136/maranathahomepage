import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function forbidden() {
  return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
}

async function denyDesignerForeignReminder(
  role: string,
  artistId: string | null,
  admin: SupabaseClient,
  id: string
) {
  if (role !== "designer") return null;
  if (!artistId) return forbidden();

  const reminder = await admin
    .from("customer_reminders")
    .select("booking_id")
    .eq("id", id)
    .maybeSingle();
  if (reminder.error) {
    return NextResponse.json({ ok: false, error: reminder.error.message }, { status: 400 });
  }
  if (!reminder.data?.booking_id) return forbidden();

  const booking = await admin
    .from("bookings")
    .select("artist_id")
    .eq("id", reminder.data.booking_id)
    .maybeSingle();
  if (booking.error || !booking.data || booking.data.artist_id !== artistId) return forbidden();
  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const admin = getSupabaseAdmin();
  const denied = await denyDesignerForeignReminder(auth.role, auth.artistId, admin, id);
  if (denied) return denied;
  let body: { remind_date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const remindDate = (body.remind_date || "").trim();
  if (!DATE_RE.test(remindDate)) {
    return NextResponse.json({ ok: false, error: "날짜가 올바르지 않습니다." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("customer_reminders")
    .update({ remind_date: remindDate })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "수정에 실패했습니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, reminder: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const admin = getSupabaseAdmin();
  const denied = await denyDesignerForeignReminder(auth.role, auth.artistId, admin, id);
  if (denied) return denied;

  const { error } = await admin.from("customer_reminders").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
