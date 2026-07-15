import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/admin/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const allowed = [
    "category",
    "name",
    "price",
    "duration_minutes",
    "deposit_amount",
    "sort_order",
    "is_published"
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("services")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, service: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {

  const { id } = await context.params;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("services").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
