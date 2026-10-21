import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";

const DESIGNER_HIDDEN_ARTIST_FIELDS = [
  "bank_name",
  "bank_account",
  "bank_holder",
  "account_holder",
  "commission_rate",
  "employment_type",
  "is_freelance"
] as const;

function rejectDesigner(role: string) {
  if (role !== "designer") return null;
  return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
}

// artists는 타인 조건 열람 방지로 본인 포함 계좌·수수료를 전면 차단한다.
function stripDesignerArtist<T extends Record<string, unknown>>(row: T) {
  const next = { ...row };
  for (const key of DESIGNER_HIDDEN_ARTIST_FIELDS) delete next[key];
  return next;
}

const COMPACT_FIELDS =
  "id, name_kr, name_en, role, is_published, sort_order, lunch_start, lunch_minutes, day_off";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const compact = new URL(request.url).searchParams.get("compact") === "1";
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("artists")
    .select((compact ? COMPACT_FIELDS : "*") as "*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const artists = (data ?? []) as Record<string, unknown>[];
  return NextResponse.json({
    ok: true,
    artists: auth.role === "designer" ? artists.map(stripDesignerArtist) : artists
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  const denied = rejectDesigner(auth.role);
  if (denied) return denied;


  let body: {
    id?: string;
    name_kr?: string;
    name_en?: string;
    role?: string;
    image_url?: string | null;
    instagram_url?: string | null;
    sort_order?: number;
    is_published?: boolean;
    lunch_start?: string | null;
    lunch_minutes?: number;
    day_off?: number | null;
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
  const row: Record<string, unknown> = {
    id,
    name_kr: body.name_kr.trim(),
    name_en: body.name_en.trim().toUpperCase(),
    role: body.role?.trim() || "Stylist",
    image_url: body.image_url || null,
    instagram_url: body.instagram_url || null,
    sort_order: body.sort_order ?? 0,
    is_published: body.is_published ?? true,
    lunch_start: body.lunch_start || null,
    lunch_minutes: body.lunch_minutes ?? 30,
    day_off: body.day_off == null || Number.isNaN(Number(body.day_off)) ? null : Number(body.day_off)
  };
  const { data, error } = await admin.from("artists").insert(row).select("*").single();

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
