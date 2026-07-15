import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/admin/auth";
import type { BookingStatus } from "@/lib/bookings/types";

const STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "noshow"
];

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {

  const { id } = await context.params;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("bookings").select("*").eq("id", id).single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, booking: data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {

  const { id } = await context.params;
  let body: {
    status?: BookingStatus;
    deposit_paid?: boolean;
    admin_memo?: string | null;
    deposit_amount?: number | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.deposit_paid !== undefined) patch.deposit_paid = Boolean(body.deposit_paid);
  if (body.admin_memo !== undefined) patch.admin_memo = body.admin_memo;
  if (body.deposit_amount !== undefined) {
    patch.deposit_amount =
      body.deposit_amount == null ? null : Math.max(0, Math.round(Number(body.deposit_amount)));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "수정에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, booking: data });
}
