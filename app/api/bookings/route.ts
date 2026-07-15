import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CreateBookingBody } from "@/lib/bookings/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: CreateBookingBody;

  try {
    body = (await request.json()) as CreateBookingBody;
  } catch {
    return badRequest("잘못된 요청 본문입니다.");
  }

  const bookingDate = body.bookingDate?.trim();
  const bookingTime = body.bookingTime?.trim();
  const artistId = body.artistId?.trim();
  const customerName = body.customerName?.trim();
  const customerPhone = body.customerPhone?.trim();
  const serviceIds = Array.isArray(body.serviceIds)
    ? body.serviceIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (!bookingDate || !DATE_RE.test(bookingDate)) {
    return badRequest("예약 날짜가 올바르지 않습니다.");
  }
  if (!bookingTime || !TIME_RE.test(bookingTime)) {
    return badRequest("예약 시간이 올바르지 않습니다.");
  }
  if (!artistId) {
    return badRequest("디자이너를 선택해 주세요.");
  }
  if (serviceIds.length < 1) {
    return badRequest("시술을 한 개 이상 선택해 주세요.");
  }
  if (!customerName) {
    return badRequest("이름을 입력해 주세요.");
  }
  if (!customerPhone || !PHONE_RE.test(customerPhone)) {
    return badRequest("전화번호를 올바르게 입력해 주세요.");
  }
  if (body.privacyAgreed !== true) {
    return badRequest("개인정보 수집 및 이용에 동의해 주세요.");
  }

  const gender = body.customerGender;
  if (gender != null && gender !== "W" && gender !== "M") {
    return badRequest("성별 값이 올바르지 않습니다.");
  }

  const totalAmount =
    body.totalAmount == null || Number.isNaN(Number(body.totalAmount))
      ? null
      : Math.max(0, Math.round(Number(body.totalAmount)));
  const depositAmount =
    body.depositAmount == null || Number.isNaN(Number(body.depositAmount))
      ? null
      : Math.max(0, Math.round(Number(body.depositAmount)));

  const row = {
    booking_date: bookingDate,
    booking_time: bookingTime,
    artist_id: artistId,
    artist_name: body.artistName?.trim() || null,
    service_ids: serviceIds,
    service_names:
      Array.isArray(body.serviceNames) && body.serviceNames.length > 0
        ? body.serviceNames.map((n) => String(n))
        : null,
    customer_name: customerName,
    customer_gender: gender ?? null,
    customer_phone: customerPhone,
    privacy_agreed: true,
    status: "pending" as const,
    deposit_paid: false,
    admin_memo: null,
    total_amount: totalAmount,
    deposit_amount: depositAmount
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("bookings")
      .insert(row)
      .select("id, created_at, status, deposit_paid")
      .single();

    if (error) {
      console.error("[POST /api/bookings]", error);
      return NextResponse.json(
        { ok: false, error: "예약 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      booking: data
    });
  } catch (err) {
    console.error("[POST /api/bookings]", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error && err.message.includes("not set")
            ? "서버에 Supabase 환경 변수가 설정되지 않았습니다."
            : "예약 저장 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
