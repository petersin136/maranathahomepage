import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";

const CATEGORIES = ["Cut", "Perm", "Color", "Clinic"] as const;

type ArtistPriceInput = { artist_id: string; price: number };

async function loadServicesWithPrices() {
  const admin = getSupabaseAdmin();
  const [servicesRes, pricesRes] = await Promise.all([
    admin.from("services").select("*").order("category").order("sort_order"),
    admin.from("service_prices").select("service_id, artist_id, price")
  ]);

  if (servicesRes.error) throw new Error(servicesRes.error.message);

  const byService: Record<string, Record<string, number>> = {};
  for (const row of pricesRes.data || []) {
    if (!byService[row.service_id]) byService[row.service_id] = {};
    byService[row.service_id][row.artist_id] = row.price;
  }

  return (servicesRes.data || []).map((s) => ({
    ...s,
    artist_prices: byService[s.id] || {}
  }));
}

async function upsertArtistPrices(
  serviceId: string,
  artistPrices: ArtistPriceInput[] | undefined,
  fallbackPrice: number
) {
  if (!artistPrices) return;
  const admin = getSupabaseAdmin();

  const rows = artistPrices
    .filter((p) => p.artist_id)
    .map((p) => ({
      service_id: serviceId,
      artist_id: p.artist_id,
      price: Math.max(0, Math.round(Number(p.price) || fallbackPrice || 0))
    }));

  if (!rows.length) return;

  const { error } = await admin.from("service_prices").upsert(rows, {
    onConflict: "service_id,artist_id"
  });
  if (error) throw new Error(error.message);
}

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const services = await loadServicesWithPrices();
    return NextResponse.json({ ok: true, services });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "로드 실패" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  let body: {
    id?: string;
    category?: string;
    name?: string;
    price?: number;
    duration_minutes?: number;
    deposit_amount?: number | null;
    sort_order?: number;
    is_published?: boolean;
    artist_prices?: ArtistPriceInput[];
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

  const price = Math.max(0, Math.round(Number(body.price) || 0));
  const admin = getSupabaseAdmin();

  try {
    const { data, error } = await admin
      .from("services")
      .insert({
        id,
        category,
        name: body.name.trim(),
        price,
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

    // 아티스트별 단가 — 없으면 전체 디자이너에 기본가 시드
    if (body.artist_prices?.length) {
      await upsertArtistPrices(id, body.artist_prices, price);
    } else {
      const { data: artists } = await admin.from("artists").select("id");
      await upsertArtistPrices(
        id,
        (artists || []).map((a) => ({ artist_id: a.id, price })),
        price
      );
    }

    const services = await loadServicesWithPrices();
    const service = services.find((s) => s.id === id) || { ...data, artist_prices: {} };
    return NextResponse.json({ ok: true, service });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "저장 실패" },
      { status: 400 }
    );
  }
}
