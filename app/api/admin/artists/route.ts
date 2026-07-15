import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;


  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("artists")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, artists: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;


  let body: {
    id?: string;
    name_kr?: string;
    name_en?: string;
    role?: string;
    image_url?: string | null;
    instagram_url?: string | null;
    sort_order?: number;
    is_published?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const id = (body.id || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!id || !body.name_kr?.trim() || !body.name_en?.trim()) {
    return NextResponse.json(
      { ok: false, error: "id, 한글명, 영문명은 필수입니다." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("artists")
    .insert({
      id,
      name_kr: body.name_kr.trim(),
      name_en: body.name_en.trim().toUpperCase(),
      role: body.role?.trim() || "Stylist",
      image_url: body.image_url || null,
      instagram_url: body.instagram_url || null,
      sort_order: body.sort_order ?? 0,
      is_published: body.is_published ?? true
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  // 기존 시술에 새 디자이너 단가 시드 (시술 기본가)
  const { data: services } = await admin.from("services").select("id, price");
  if (services?.length) {
    await admin.from("service_prices").upsert(
      services.map((s) => ({
        service_id: s.id,
        artist_id: id,
        price: s.price
      })),
      { onConflict: "service_id,artist_id" }
    );
  }

  return NextResponse.json({ ok: true, artist: data });
}
