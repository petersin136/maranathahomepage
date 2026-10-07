import { NextResponse } from "next/server";
import { requireAdminUser, requireSupabaseAdmin } from "@/lib/admin/auth";
import { todayKst } from "@/lib/admin/sales-data";

export const preferredRegion = "icn1";

const BOOKING_FIELDS =
  "id, created_at, status, booking_date, booking_time, customer_name, customer_gender, customer_phone, artist_id, artist_name, service_names, total_amount, deposit_amount, deposit_paid, final_amount, payment_method, admin_memo, customer_request, cancel_reason";

const NOTES_MISSING_MESSAGE =
  "고객 메모 테이블(customer_notes)이 없습니다. supabase/migrations/010_customer_notes.sql 을 실행해 주세요.";

const MEMO_MAX_LENGTH = 5000;

function isMissingTable(error: { code?: string } | null) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ phone: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const db = requireSupabaseAdmin();
  if (!db.ok) return db.response;

  const { phone: raw } = await context.params;
  const phone = decodeURIComponent(raw).trim();
  if (!phone) {
    return NextResponse.json({ ok: false, error: "연락처가 없습니다." }, { status: 400 });
  }

  const [bookingsRes, noteRes] = await Promise.all([
    db.admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .eq("customer_phone", phone)
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false })
      .limit(500),
    db.admin
      .from("customer_notes")
      .select("memo, updated_at")
      .eq("customer_phone", phone)
      .maybeSingle()
  ]);

  if (bookingsRes.error) {
    console.error("[GET /api/admin/customers/:phone]", bookingsRes.error);
    return NextResponse.json({ ok: false, error: bookingsRes.error.message }, { status: 500 });
  }

  const notesMissing = isMissingTable(noteRes.error);
  if (noteRes.error && !notesMissing) {
    console.error("[GET /api/admin/customers/:phone] note", noteRes.error);
  }

  return NextResponse.json({
    ok: true,
    today: todayKst(),
    phone,
    bookings: bookingsRes.data ?? [],
    note: noteRes.data ?? null,
    noteError: notesMissing ? NOTES_MISSING_MESSAGE : null
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ phone: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const db = requireSupabaseAdmin();
  if (!db.ok) return db.response;

  const { phone: raw } = await context.params;
  const phone = decodeURIComponent(raw).trim();
  if (!phone) {
    return NextResponse.json({ ok: false, error: "연락처가 없습니다." }, { status: 400 });
  }

  let body: { memo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const memo = typeof body.memo === "string" ? body.memo : "";
  if (memo.length > MEMO_MAX_LENGTH) {
    return NextResponse.json(
      { ok: false, error: `메모는 ${MEMO_MAX_LENGTH.toLocaleString("ko-KR")}자까지 저장할 수 있습니다.` },
      { status: 400 }
    );
  }

  const { data, error } = await db.admin
    .from("customer_notes")
    .upsert({ customer_phone: phone, memo }, { onConflict: "customer_phone" })
    .select("memo, updated_at")
    .single();

  if (error || !data) {
    console.error("[PUT /api/admin/customers/:phone]", error);
    const message = isMissingTable(error) ? NOTES_MISSING_MESSAGE : error?.message || "메모 저장에 실패했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, note: data });
}
