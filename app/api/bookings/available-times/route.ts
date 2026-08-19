import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  filterAvailableTimes,
  resolveDurationMinutes
} from "@/lib/booking/overlap";
import { CANDIDATE_TIMES } from "@/lib/booking/slots";
import {
  loadOccupiedIntervals,
  resolveServiceDurations
} from "@/lib/booking/occupied";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

/**
 * 가능 시간 조회 (check_available_times)
 * GET /api/bookings/available-times?date=&artistId=&serviceIds=id1,id2
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookingDate = searchParams.get("date")?.trim() ?? "";
  const artistId = searchParams.get("artistId")?.trim() ?? "";
  const serviceIdsRaw = searchParams.get("serviceIds")?.trim() ?? "";
  const serviceIds = serviceIdsRaw
    ? serviceIdsRaw.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  if (!bookingDate || !DATE_RE.test(bookingDate)) {
    return badRequest("예약 날짜가 올바르지 않습니다.");
  }
  if (!artistId) {
    return badRequest("디자이너를 선택해 주세요.");
  }
  if (serviceIds.length < 1) {
    return badRequest("시술을 한 개 이상 선택해 주세요.");
  }

  try {
    const supabase = getSupabaseAdmin();

    const { durations, error: durError } = await resolveServiceDurations(
      supabase,
      serviceIds
    );
    if (durError) {
      console.error("[GET /api/bookings/available-times] services", durError);
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
      console.error("[GET /api/bookings/available-times] bookings", occError);
      return NextResponse.json(
        { ok: false, error: "예약 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const times = filterAvailableTimes(
      CANDIDATE_TIMES,
      durationMinutes,
      intervals
    );

    return NextResponse.json({
      ok: true,
      times,
      durationMinutes
    });
  } catch (err) {
    console.error("[GET /api/bookings/available-times]", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error && err.message === "SUPABASE_SERVICE_ROLE_KEY missing"
            ? "SUPABASE_SERVICE_ROLE_KEY missing"
            : err instanceof Error && err.message.includes("not set")
              ? "서버에 Supabase 환경 변수가 설정되지 않았습니다."
              : "가능 시간 조회 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
