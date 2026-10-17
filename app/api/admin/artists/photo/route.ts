import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";

export const preferredRegion = "icn1";

const BUCKET = "artist-photos";
const FALLBACK_BUCKET = "portfolio-media";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

function rejectDesigner(role: string) {
  if (role !== "designer") return null;
  return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
}

function safeId(raw: string) {
  const id = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
  return id || "new";
}

async function ensureBucket(admin: ReturnType<typeof getSupabaseAdmin>, name: string) {
  const { data } = await admin.storage.listBuckets();
  if (data?.some((row) => row.name === name)) return;
  const { error } = await admin.storage.createBucket(name, {
    public: true,
    fileSizeLimit: String(MAX_BYTES),
    allowedMimeTypes: [...ALLOWED.keys()]
  });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  const denied = rejectDesigner(auth.role);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "사진 파일을 선택해 주세요." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "사진은 8MB 이하만 올릴 수 있습니다." }, { status: 400 });
  }
  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: "JPG, PNG, WEBP, GIF만 올릴 수 있습니다." },
      { status: 400 }
    );
  }

  const artistId = safeId(String(form.get("artistId") || ""));
  const path = `${artistId}/${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const admin = getSupabaseAdmin();

  let bucket = BUCKET;
  try {
    await ensureBucket(admin, BUCKET);
  } catch {
    bucket = FALLBACK_BUCKET;
  }

  const upload = async (target: string) =>
    admin.storage.from(target).upload(path, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true
    });

  let { error } = await upload(bucket);
  if (error && bucket === BUCKET) {
    bucket = FALLBACK_BUCKET;
    ({ error } = await upload(bucket));
  }
  if (error) {
    return NextResponse.json({ ok: false, error: "사진을 올리지 못했습니다." }, { status: 500 });
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
