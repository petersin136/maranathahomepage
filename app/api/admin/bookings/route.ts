import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import { isStartTimeAvailable, resolveDurationMinutes } from "@/lib/booking/overlap";
import { loadOccupiedIntervals, resolveServiceDurations } from "@/lib/booking/occupied";
import { normalizePhone } from "@/lib/admin/customers-data";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

type AdminCreateBody = {
  bookingDate?: string;
  bookingTime?: string;
  artistId?: string;
  serviceIds?: string[];
  customerName?: string;
  customerPhone?: string;
  customerRequest?: string | null;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function rejectDesigner(role: string) {
  if (role !== "designer") return null;
  return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
}

function stripOtherDesignerAmounts<T extends { artist_id?: string | null }>(
  rows: T[],
  role: string,
  artistId: string | null
) {
  if (role !== "designer") return rows;
  return rows.map((row) => {
    if (row.artist_id === artistId) return row;
    const next = { ...row } as T & {
      final_amount?: unknown;
      deposit_amount?: unknown;
      total_amount?: unknown;
    };
    delete next.final_amount;
    delete next.deposit_amount;
    delete next.total_amount;
    return next;
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  let body: AdminCreateBody;
  try {
    body = (await request.json()) as AdminCreateBody;
  } catch {
    return badRequest("잘못된 요청 본문입니다.");
  }

  const bookingDate = body.bookingDate?.trim();
  const bookingTime = body.bookingTime?.trim();
  const artistId = body.artistId?.trim();
  if (auth.role === "designer" && artistId !== auth.artistId) {
    return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  }
  const customerName = body.customerName?.trim();
  const customerPhone = body.customerPhone?.trim();
  const customerRequest = body.customerRequest?.trim() || null;
  const serviceIds = Array.isArray(body.serviceIds)
    ? body.serviceIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (!bookingDate || !DATE_RE.test(bookingDate)) return badRequest("예약 날짜가 올바르지 않습니다.");
  if (!bookingTime || !TIME_RE.test(bookingTime)) return badRequest("예약 시간이 올바르지 않습니다.");
  if (!artistId) return badRequest("담당자를 선택해 주세요.");
  if (serviceIds.length < 1) return badRequest("시술을 한 개 이상 선택해 주세요.");
  if (!customerName) return badRequest("고객명을 입력해 주세요.");
  if (!customerPhone || !PHONE_RE.test(customerPhone)) return badRequest("연락처를 올바르게 입력해 주세요.");
  if (customerRequest && customerRequest.length > 500) return badRequest("요청사항은 500자 이내로 입력해 주세요.");

  const admin = getSupabaseAdmin();

  const [artistRes, servicesRes, pricesRes] = await Promise.all([
    admin.from("artists").select("id, name_kr").eq("id", artistId).maybeSingle(),
    admin.from("services").select("id, name, price, deposit_amount").in("id", serviceIds),
    admin.from("service_prices").select("service_id, price").eq("artist_id", artistId).in("service_id", serviceIds)
  ]);
  if (artistRes.error || servicesRes.error) {
    return NextResponse.json({ ok: false, error: "담당자·시술 정보를 불러오지 못했습니다." }, { status: 500 });
  }
  if (!artistRes.data) return badRequest("담당자를 찾을 수 없습니다.");

  const serviceById = new Map((servicesRes.data ?? []).map((s) => [String(s.id), s]));
  if (serviceIds.some((id) => !serviceById.has(id))) return badRequest("시술 정보를 찾을 수 없습니다.");
  const priceById = new Map((pricesRes.data ?? []).map((p) => [String(p.service_id), Number(p.price)]));

  let totalAmount = 0;
  let depositAmount = 0;
  const serviceNames: string[] = [];
  for (const id of serviceIds) {
    const s = serviceById.get(id)!;
    serviceNames.push(String(s.name));
    totalAmount += Math.max(0, Math.round(priceById.get(id) ?? Number(s.price) ?? 0));
    if (s.deposit_amount != null && !Number.isNaN(Number(s.deposit_amount))) {
      depositAmount += Math.max(0, Math.round(Number(s.deposit_amount)));
    }
  }

  const { durations, error: durError } = await resolveServiceDurations(admin, serviceIds);
  if (durError) {
    return NextResponse.json({ ok: false, error: "시술 정보를 불러오지 못했습니다." }, { status: 500 });
  }
  const { intervals, error: occError } = await loadOccupiedIntervals({ supabase: admin, artistId, bookingDate });
  if (occError) {
    return NextResponse.json({ ok: false, error: "예약 가능 여부를 확인하지 못했습니다." }, { status: 500 });
  }
  if (!isStartTimeAvailable(bookingTime, resolveDurationMinutes(null, durations), intervals)) {
    return NextResponse.json(
      { ok: false, error: "선택한 시간은 이미 예약되었거나 마감 시간(20:00)을 넘깁니다." },
      { status: 409 }
    );
  }

  const row = {
    booking_date: bookingDate,
    booking_time: bookingTime,
    artist_id: artistId,
    artist_name: String(artistRes.data.name_kr ?? "").trim() || null,
    service_ids: serviceIds,
    service_names: serviceNames,
    customer_name: customerName,
    customer_gender: null,
    customer_phone: normalizePhone(customerPhone),
    customer_request: customerRequest,
    privacy_agreed: true,
    status: "pending" as const,
    deposit_paid: false,
    admin_memo: null,
    total_amount: totalAmount,
    deposit_amount: depositAmount
  };

  const { data, error } = await admin.from("bookings").insert(row).select("*").single();
  if (error) {
    return NextResponse.json({ ok: false, error: "예약 저장에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, booking: data });
}

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;


  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // pending|confirmed|completed|cancelled_noshow|all
  const admin = getSupabaseAdmin();

  if (searchParams.get("count") === "1") {
    let countQuery = admin.from("bookings").select("*", { count: "exact", head: true });
    if (status === "pending") countQuery = countQuery.eq("status", "pending");
    else if (status === "confirmed") countQuery = countQuery.eq("status", "confirmed");
    else if (status === "completed") countQuery = countQuery.eq("status", "completed");
    else if (status === "cancelled_noshow") countQuery = countQuery.in("status", ["cancelled", "noshow"]);
    const { count, error } = await countQuery;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: count ?? 0 });
  }

  let query = admin.from("bookings").select("*").order("booking_date", { ascending: false }).order("booking_time", { ascending: true });

  if (status === "pending") query = query.eq("status", "pending");
  else if (status === "confirmed") query = query.eq("status", "confirmed");
  else if (status === "completed") query = query.eq("status", "completed");
  else if (status === "cancelled_noshow") query = query.in("status", ["cancelled", "noshow"]);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    bookings: stripOtherDesignerAmounts(data ?? [], auth.role, auth.artistId)
  });
}

export async function DELETE() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  const denied = rejectDesigner(auth.role);
  if (denied) return denied;
  return NextResponse.json({ ok: false, error: "지원하지 않는 요청입니다." }, { status: 405 });
}
