import { NextResponse } from "next/server";
import { requireAdminUser, requireSupabaseAdmin } from "@/lib/admin/auth";
import { BLOCKING_STATUSES, isStartTimeAvailable, resolveDurationMinutes } from "@/lib/booking/overlap";
import { loadOccupiedIntervals, resolveServiceDurations } from "@/lib/booking/occupied";
import type { BookingStatus, PaymentMethod } from "@/lib/bookings/types";

const STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "noshow"
];

const PAYMENT_METHODS: PaymentMethod[] = ["card", "cash", "transfer"];

const ADMIN_CANCEL_REASON = "admin_cancel";
const CANCEL_REASONS = [ADMIN_CANCEL_REASON, "customer_request"];

function forbidden() {
  return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const db = requireSupabaseAdmin();
  if (!db.ok) return db.response;

  const { id } = await context.params;
  const { data, error } = await db.admin.from("bookings").select("*").eq("id", id).single();

  if (error || !data) {
    console.error("[GET /api/admin/bookings/:id]", error);
    return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  const phone = String(data.customer_phone || "").trim();
  let previous: {
    id: string;
    booking_date: string;
    booking_time: string;
    service_names: string[] | null;
    artist_name: string | null;
    status: string;
  }[] = [];

  if (phone) {
    const history = await db.admin
      .from("bookings")
      .select("id, booking_date, booking_time, service_names, artist_name, status, customer_phone")
      .eq("customer_phone", phone)
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false })
      .limit(40);
    if (!history.error && history.data) {
      previous = history.data.filter((row) => {
        if (row.id === data.id) return false;
        if (row.status === "cancelled" || row.status === "noshow") return false;
        if (row.booking_date < data.booking_date) return true;
        if (row.booking_date > data.booking_date) return false;
        return String(row.booking_time) < String(data.booking_time);
      });
    }
  }

  let booking = data;
  if (auth.role === "designer" && data.artist_id !== auth.artistId) {
    const next = { ...data };
    delete next.final_amount;
    delete next.deposit_amount;
    delete next.total_amount;
    booking = next;
  }

  return NextResponse.json({
    ok: true,
    booking,
    customer: {
      priorCount: previous.length,
      visitLabel: previous.length === 0 ? "첫 방문" : "단골",
      previous: previous.slice(0, 5)
    }
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const db = requireSupabaseAdmin();
  if (!db.ok) return db.response;

  const { id } = await context.params;
  if (auth.role === "designer") {
    if (!auth.artistId) return forbidden();
    const current = await db.admin.from("bookings").select("artist_id").eq("id", id).maybeSingle();
    if (current.error) {
      console.error("[PATCH /api/admin/bookings/:id] artist", current.error);
      return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 500 });
    }
    if (!current.data) {
      return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }
    if (current.data.artist_id !== auth.artistId) return forbidden();
  }

  let body: {
    status?: BookingStatus;
    cancel_reason?: string | null;
    deposit_paid?: boolean;
    admin_memo?: string | null;
    deposit_amount?: number | null;
    final_amount?: number | null;
    payment_method?: PaymentMethod | null;
    cash_receipt_issued?: boolean | null;
    serviceIds?: string[];
    customer_name?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === "cancelled") {
      const reason = body.cancel_reason;
      if (reason != null && !CANCEL_REASONS.includes(reason)) {
        return NextResponse.json({ ok: false, error: "취소 사유가 올바르지 않습니다." }, { status: 400 });
      }
      patch.cancel_reason = reason ?? ADMIN_CANCEL_REASON;
    } else {
      patch.cancel_reason = null;
    }
  }

  const hasPaymentFields =
    body.final_amount !== undefined ||
    body.payment_method !== undefined ||
    body.cash_receipt_issued !== undefined;

  if (body.status === "completed" && !hasPaymentFields) {
    return NextResponse.json(
      { ok: false, error: "결제 정보를 입력해야 완료 처리할 수 있습니다." },
      { status: 400 }
    );
  }

  if (body.status === "noshow") {
    const currentStatus = await db.admin.from("bookings").select("status").eq("id", id).maybeSingle();
    if (currentStatus.error) {
      console.error("[PATCH /api/admin/bookings/:id] status", currentStatus.error);
      return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 500 });
    }
    if (!currentStatus.data) {
      return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }
    if (currentStatus.data.status !== "confirmed") {
      return NextResponse.json(
        { ok: false, error: "확정된 예약만 노쇼 처리할 수 있습니다." },
        { status: 400 }
      );
    }
  }
  if (body.customer_name !== undefined) {
    const name = String(body.customer_name ?? "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "고객명을 입력해 주세요." }, { status: 400 });
    }
    if (name.length > 40) {
      return NextResponse.json({ ok: false, error: "고객명은 40자까지 입력할 수 있습니다." }, { status: 400 });
    }
    patch.customer_name = name;
  }
  if (body.deposit_paid !== undefined) patch.deposit_paid = Boolean(body.deposit_paid);
  if (body.admin_memo !== undefined) patch.admin_memo = body.admin_memo;
  if (body.deposit_amount !== undefined) {
    patch.deposit_amount =
      body.deposit_amount == null ? null : Math.max(0, Math.round(Number(body.deposit_amount)));
  }
  if (body.serviceIds !== undefined) {
    const serviceIds = [
      ...new Set(
        (Array.isArray(body.serviceIds) ? body.serviceIds : [])
          .map((sid) => String(sid).trim())
          .filter(Boolean)
      )
    ];
    if (serviceIds.length < 1) {
      return NextResponse.json(
        { ok: false, error: "시술을 한 개 이상 선택해 주세요." },
        { status: 400 }
      );
    }

    const current = await db.admin
      .from("bookings")
      .select("id, artist_id, booking_date, booking_time, status")
      .eq("id", id)
      .maybeSingle();
    if (current.error || !current.data) {
      return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }

    const artistId = String(current.data.artist_id);
    const bookingDate = String(current.data.booking_date).slice(0, 10);
    const bookingTime = String(current.data.booking_time);

    const [servicesRes, pricesRes] = await Promise.all([
      db.admin.from("services").select("id, name, price, deposit_amount").in("id", serviceIds),
      db.admin
        .from("service_prices")
        .select("service_id, price")
        .eq("artist_id", artistId)
        .in("service_id", serviceIds)
    ]);
    if (servicesRes.error || pricesRes.error) {
      return NextResponse.json(
        { ok: false, error: "시술 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }
    const serviceById = new Map((servicesRes.data ?? []).map((s) => [String(s.id), s]));
    if (serviceIds.some((sid) => !serviceById.has(sid))) {
      return NextResponse.json({ ok: false, error: "시술 정보를 찾을 수 없습니다." }, { status: 400 });
    }
    const priceById = new Map(
      (pricesRes.data ?? []).map((p) => [String(p.service_id), Number(p.price)])
    );

    let totalAmount = 0;
    let depositAmount = 0;
    const serviceNames: string[] = [];
    for (const sid of serviceIds) {
      const s = serviceById.get(sid)!;
      serviceNames.push(String(s.name));
      totalAmount += Math.max(0, Math.round(priceById.get(sid) ?? Number(s.price) ?? 0));
      if (s.deposit_amount != null && !Number.isNaN(Number(s.deposit_amount))) {
        depositAmount += Math.max(0, Math.round(Number(s.deposit_amount)));
      }
    }

    const blocksSlot = (BLOCKING_STATUSES as readonly string[]).includes(String(current.data.status));
    if (blocksSlot) {
      const { durations, error: durError } = await resolveServiceDurations(db.admin, serviceIds);
      if (durError) {
        return NextResponse.json(
          { ok: false, error: "시술 정보를 불러오지 못했습니다." },
          { status: 500 }
        );
      }
      const { intervals, error: occError } = await loadOccupiedIntervals({
        supabase: db.admin,
        artistId,
        bookingDate,
        excludeBookingId: id
      });
      if (occError) {
        return NextResponse.json(
          { ok: false, error: "예약 가능 여부를 확인하지 못했습니다." },
          { status: 500 }
        );
      }
      if (!isStartTimeAvailable(bookingTime, resolveDurationMinutes(null, durations), intervals)) {
        return NextResponse.json(
          { ok: false, error: "바꾼 시술 시간이 다른 예약과 겹치거나 마감 시간(20:00)을 넘깁니다." },
          { status: 409 }
        );
      }
    }

    patch.service_ids = serviceIds;
    patch.service_names = serviceNames;
    patch.total_amount = totalAmount;
    patch.deposit_amount = depositAmount;
  }

  if (hasPaymentFields) {
    if (body.payment_method !== undefined) {
      if (body.payment_method != null && !PAYMENT_METHODS.includes(body.payment_method)) {
        return NextResponse.json(
          { ok: false, error: "결제 수단이 올바르지 않습니다." },
          { status: 400 }
        );
      }
      patch.payment_method = body.payment_method;
    }
    if (body.final_amount !== undefined) {
      if (body.final_amount == null || Number.isNaN(Number(body.final_amount))) {
        return NextResponse.json(
          { ok: false, error: "최종 결제 금액이 올바르지 않습니다." },
          { status: 400 }
        );
      }
      patch.final_amount = Math.max(0, Math.round(Number(body.final_amount)));
    }
    if (body.cash_receipt_issued !== undefined) {
      patch.cash_receipt_issued = Boolean(body.cash_receipt_issued);
    }
    // 결제 정보 저장 시 완료 시각 기록 (클라이언트 시각 신뢰하지 않음)
    patch.paid_at = new Date().toISOString();
    if (body.status === undefined) {
      patch.status = "completed";
      patch.cancel_reason = null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  const { data, error } = await db.admin
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[PATCH /api/admin/bookings/:id]", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "수정에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, booking: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  if (auth.role === "designer") return forbidden();

  const db = requireSupabaseAdmin();
  if (!db.ok) return db.response;

  const { id } = await context.params;

  const logs = await db.admin.from("message_logs").delete().eq("booking_id", id);
  if (logs.error && logs.error.code !== "42P01") {
    console.error("[DELETE /api/admin/bookings/:id] message_logs", logs.error);
    return NextResponse.json(
      { ok: false, error: "이 예약의 발송 기록을 지우지 못해 삭제할 수 없습니다." },
      { status: 500 }
    );
  }

  const reminders = await db.admin.from("customer_reminders").update({ booking_id: null }).eq("booking_id", id);
  if (reminders.error && reminders.error.code !== "42P01") {
    if (reminders.error.code === "23502") {
      const removed = await db.admin.from("customer_reminders").delete().eq("booking_id", id);
      if (removed.error) {
        console.error("[DELETE /api/admin/bookings/:id] customer_reminders", removed.error);
        return NextResponse.json(
          { ok: false, error: "이 예약에 연결된 알림을 지우지 못해 삭제할 수 없습니다." },
          { status: 500 }
        );
      }
    } else {
      console.error("[DELETE /api/admin/bookings/:id] customer_reminders", reminders.error);
      return NextResponse.json(
        { ok: false, error: "이 예약에 연결된 알림을 정리하지 못해 삭제할 수 없습니다." },
        { status: 500 }
      );
    }
  }

  const { data, error } = await db.admin.from("bookings").delete().eq("id", id).select("id");

  if (error) {
    console.error("[DELETE /api/admin/bookings/:id]", error);
    const blocked = error.code === "23503";
    return NextResponse.json(
      {
        ok: false,
        error: blocked
          ? "이 예약에 연결된 기록이 남아 삭제할 수 없습니다."
          : "삭제에 실패했습니다."
      },
      { status: blocked ? 409 : 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
