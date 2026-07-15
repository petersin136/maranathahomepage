import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";

const CATEGORIES = ["Cut", "Perm", "Color", "Clinic"] as const;

export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("services")
    .select("*")
    .order("category")
    .order("sort_order");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, services: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  let body: {
    id?: string;
    category?: string;
    name?: string;
    price?: number;
    duration_minutes?: number;
    deposit_amount?: number | null;
    sort_order?: number;
    is_published?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const id = (body.id || "").trim().toLowerCase().replace(/\s+/g, "-");
  const category = body.category as (typeof CATEGORIES)[number];
  if (!id || !body.name?.trim() || !CATEGORIES.includes(category)) {
    return NextResponse.json(
      { ok: false, error: "id, category, name은 필수입니다." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("services")
    .insert({
      id,
      category,
      name: body.name.trim(),
      price: Math.max(0, Math.round(Number(body.price) || 0)),
      duration_minutes: Math.max(1, Math.round(Number(body.duration_minutes) || 60)),
      deposit_amount:
        body.deposit_amount == null
          ? null
          : Math.max(0, Math.round(Number(body.deposit_amount))),
      sort_order: body.sort_order ?? 0,
      is_published: body.is_published ?? true
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, service: data });
}
