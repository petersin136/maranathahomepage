import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CreateBookingBody } from "@/lib/bookings/types";
import {
  isStartTimeAvailable,
  resolveDurationMinutes
} from "@/lib/booking/overlap";
import {
  loadOccupiedIntervals,
  resolveServiceDurations
} from "@/lib/booking/occupied";

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

  const customerRequest = body.customerRequest?.trim() || null;
  if (customerRequest && customerRequest.length > 500) {
    return badRequest("요청사항은 500자 이내로 입력해 주세요.");
  }

  const totalAmount =
    body.totalAmount == null || Number.isNaN(Number(body.totalAmount))
      ? null
      : Math.max(0, Math.round(Number(body.totalAmount)));

  try {
    const supabase = getSupabaseAdmin();

    const { data: depositRows, error: depositError } = await supabase
      .from("services")
      .select("id, deposit_amount")
      .in("id", serviceIds);

    if (depositError) {
      console.error("[POST /api/bookings] deposit", depositError);
      return NextResponse.json(
        { ok: false, error: "시술 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const depositById = new Map(
      (depositRows || []).map((s) => [String(s.id), s.deposit_amount])
    );
    const depositAmount = serviceIds.reduce((sum, id) => {
      const value = depositById.get(id);
      if (value == null || Number.isNaN(Number(value))) return sum;
      return sum + Math.max(0, Math.round(Number(value)));
    }, 0);

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
      customer_request: customerRequest,
      privacy_agreed: true,
      status: "pending" as const,
      deposit_paid: false,
      admin_memo: null,
      total_amount: totalAmount,
      deposit_amount: depositAmount
    };

    // 가능 시간 조회와 동일한 겹침 판정 (create_booking)
    const { durations, error: durError } = await resolveServiceDurations(
      supabase,
      serviceIds
    );
    if (durError) {
      console.error("[POST /api/bookings] services", durError);
      return NextResponse.json(
        { ok: false, error: "시술 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const durationMinutes = resolveDurationMinutes(null, durations);
    const { intervals, error: occError } = await loadOccupiedIntervals({
      supabase,
      artistId,
      bookingDate
    });
    if (occError) {
      console.error("[POST /api/bookings] occupied", occError);
      return NextResponse.json(
        { ok: false, error: "예약 가능 여부를 확인하지 못했습니다." },
        { status: 500 }
      );
    }

    if (!isStartTimeAvailable(bookingTime, durationMinutes, intervals)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "선택하신 시간은 이미 예약되었거나 마감 시간(20:00)을 넘깁니다. 다른 시간을 골라 주세요."
        },
        { status: 409 }
      );
    }

    let { data, error } = await supabase
      .from("bookings")
      .insert(row)
      .select("id, created_at, status, deposit_paid")
      .single();
    // customer_request 컬럼이 아직 없으면 admin_memo로 임시 저장
    if (
      error &&
      (error.message?.includes("customer_request") ||
        error.code === "PGRST204" ||
        error.code === "42703")
    ) {
      const { customer_request: requestText, ...rest } = row;
      const fallback = {
        ...rest,
        admin_memo: requestText ? `[고객요청] ${requestText}` : null
      };
      ({ data, error } = await supabase
        .from("bookings")
        .insert(fallback)
        .select("id, created_at, status, deposit_paid")
        .single());
    }

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
          err instanceof Error && err.message === "SUPABASE_SERVICE_ROLE_KEY missing"
            ? "SUPABASE_SERVICE_ROLE_KEY missing"
            : err instanceof Error && err.message.includes("not set")
              ? "서버에 Supabase 환경 변수가 설정되지 않았습니다."
              : "예약 저장 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
