import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";

type ArtistPriceInput = { artist_id: string; price: number };

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

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

  const artistPrices = body.artist_prices as ArtistPriceInput[] | undefined;
  if (Array.isArray(artistPrices)) {
    const fallback = Math.max(0, Math.round(Number(data.price) || 0));
    const rows = artistPrices
      .filter((p) => p?.artist_id)
      .map((p) => ({
        service_id: id,
        artist_id: p.artist_id,
        price: Math.max(0, Math.round(Number(p.price) || fallback))
      }));
    if (rows.length) {
      const { error: priceError } = await admin.from("service_prices").upsert(rows, {
        onConflict: "service_id,artist_id"
      });
      if (priceError) {
        return NextResponse.json({ ok: false, error: priceError.message }, { status: 400 });
      }
    }
  }

  const { data: priceRows } = await admin
    .from("service_prices")
    .select("artist_id, price")
    .eq("service_id", id);

  const artist_prices: Record<string, number> = {};
  for (const row of priceRows || []) {
    artist_prices[row.artist_id] = row.price;
  }

  return NextResponse.json({ ok: true, service: { ...data, artist_prices } });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("services").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
