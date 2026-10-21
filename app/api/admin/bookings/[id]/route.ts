import { NextResponse } from "next/server";
import { requireAdminUser, requireSupabaseAdmin } from "@/lib/admin/auth";
import {
  attachRetailToServices,
  isRetailCatalogKey,
  parseRetailProductBody,
  splitServicesAndRetail
} from "@/lib/admin/inventory-sales";
import {
  clearBookingSaleMovements,
  SALE_SYNC_WARNING,
  syncBookingSaleMovements
} from "@/lib/admin/inventory-sales-sync";
import { RETAIL_PRODUCTS } from "@/lib/admin/retail-products";
import {
  SETTLEMENT_LOCK_ERROR,
  bookingLockYearMonths,
  findClosedYearMonths,
  isClosedMonthSafePatch,
  kstYearMonthFromIso
} from "@/lib/admin/settlement-lock";
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
  const currentRes = await db.admin
    .from("bookings")
    .select("id, artist_id, booking_date, booking_time, status, service_ids, service_names, paid_at, deposit_paid")
    .eq("id", id)
    .maybeSingle();
  if (currentRes.error) {
    console.error("[PATCH /api/admin/bookings/:id] current", currentRes.error);
    return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 500 });
  }
  if (!currentRes.data) {
    return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }
  if (auth.role === "designer") {
    if (!auth.artistId) return forbidden();
    if (currentRes.data.artist_id !== auth.artistId) return forbidden();
  }
  const current = currentRes.data;
  const previousStatus = String(current.status);

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
    products?: unknown;
    customer_name?: string;
    customer_request?: string | null;
    booking_date?: string;
    booking_time?: string;
    artist_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const hasPaymentFields =
    body.final_amount !== undefined ||
    body.payment_method !== undefined ||
    body.cash_receipt_issued !== undefined;

  if (!isClosedMonthSafePatch(body as Record<string, unknown>)) {
    const extraMonths: string[] = [];
    if (hasPaymentFields) {
      const existingPaidAt = current.paid_at ? String(current.paid_at) : "";
      const nextPaidAt =
        previousStatus === "completed" && existingPaidAt
          ? existingPaidAt
          : new Date().toISOString();
      const paidYm = kstYearMonthFromIso(nextPaidAt);
      if (paidYm) extraMonths.push(paidYm);
    }
    const lock = await findClosedYearMonths(db.admin, [
      ...bookingLockYearMonths(current),
      ...extraMonths
    ]);
    if (lock.error) {
      console.error("[PATCH /api/admin/bookings/:id] settlement lock", lock.error);
      return NextResponse.json({ ok: false, error: "수정에 실패했습니다." }, { status: 500 });
    }
    if (lock.closed.length > 0) {
      return NextResponse.json({ ok: false, error: SETTLEMENT_LOCK_ERROR }, { status: 409 });
    }
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
    // 확정 = 예약금 확인 후 스케줄 확정. 입금 여부를 따로 안 넘기면 입금 완료로 맞춤.
    // 완료를 푸는 경우에는 예약금 입금 여부를 바꾸지 않는다.
    if (
      body.status === "confirmed" &&
      body.deposit_paid === undefined &&
      previousStatus !== "completed"
    ) {
      patch.deposit_paid = true;
    }
  }

  if (body.status === "completed" && !hasPaymentFields) {
    return NextResponse.json(
      { ok: false, error: "결제 정보를 입력해야 완료 처리할 수 있습니다." },
      { status: 400 }
    );
  }

  if (body.status === "noshow") {
    if (previousStatus !== "confirmed") {
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
  if (body.customer_request !== undefined) {
    const request =
      body.customer_request == null ? null : String(body.customer_request).trim() || null;
    if (request && request.length > 500) {
      return NextResponse.json(
        { ok: false, error: "요청사항은 500자 이내로 입력해 주세요." },
        { status: 400 }
      );
    }
    patch.customer_request = request;
  }
  if (body.deposit_amount !== undefined) {
    patch.deposit_amount =
      body.deposit_amount == null ? null : Math.max(0, Math.round(Number(body.deposit_amount)));
  }
  if (body.serviceIds !== undefined) {
    if (previousStatus === "completed") {
      return NextResponse.json(
        { ok: false, error: "완료된 예약은 시술을 변경할 수 없습니다. 확정으로 되돌린 뒤 수정해 주세요." },
        { status: 400 }
      );
    }
    const serviceIds = [
      ...new Set(
        (Array.isArray(body.serviceIds) ? body.serviceIds : [])
          .map((sid) => String(sid).trim())
          .filter((sid) => sid && !sid.startsWith("prod-"))
      )
    ];
    if (serviceIds.length < 1) {
      return NextResponse.json(
        { ok: false, error: "시술을 한 개 이상 선택해 주세요." },
        { status: 400 }
      );
    }

    const artistId = String(current.artist_id);
    const bookingDate = String(current.booking_date).slice(0, 10);
    const bookingTime = String(current.booking_time);

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

    const blocksSlot = (BLOCKING_STATUSES as readonly string[]).includes(String(current.status));
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

    const preserved = splitServicesAndRetail(
      Array.isArray(current.service_ids) ? current.service_ids.map(String) : [],
      Array.isArray(current.service_names) ? current.service_names.map(String) : []
    ).retail;
    const qtyByKey = new Map<string, { name: string; quantity: number }>();
    for (const row of preserved) {
      const cur = qtyByKey.get(row.catalogKey) ?? { name: row.name, quantity: 0 };
      cur.quantity += 1;
      if (row.name) cur.name = row.name;
      qtyByKey.set(row.catalogKey, cur);
    }
    const attached = attachRetailToServices(
      serviceIds,
      serviceNames,
      [...qtyByKey.entries()].map(([catalogKey, row]) => ({
        catalogKey,
        name: row.name.replace(/^\[제품\]\s*/, ""),
        quantity: row.quantity
      }))
    );
    let productAmount = 0;
    for (const [catalogKey, row] of qtyByKey) {
      const catalog = RETAIL_PRODUCTS.find((item) => item.id === catalogKey);
      productAmount += (catalog?.price ?? 0) * row.quantity;
    }
    patch.service_ids = attached.service_ids;
    patch.service_names = attached.service_names;
    patch.total_amount = totalAmount + productAmount;
    if (current.deposit_paid !== true) {
      patch.deposit_amount = depositAmount;
    }
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
    // 이미 완료된 결제를 다시 저장하면 매출 월·출고 시각이 밀리지 않게 paid_at을 유지한다.
    const existingPaidAt = current.paid_at ? String(current.paid_at) : "";
    patch.paid_at =
      previousStatus === "completed" && existingPaidAt
        ? existingPaidAt
        : new Date().toISOString();
    if (body.status === undefined) {
      patch.status = "completed";
      patch.cancel_reason = null;
    }
    if (body.final_amount !== undefined) {
      patch.total_amount = patch.final_amount;
    }
  }

  if (body.products !== undefined) {
    if (!hasPaymentFields) {
      return NextResponse.json({ ok: false, error: "수정할 수 없는 항목입니다." }, { status: 400 });
    }
    const parsed = parseRetailProductBody(body.products);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    for (const product of parsed.products) {
      if (!isRetailCatalogKey(product.catalogKey)) {
        return NextResponse.json({ ok: false, error: "판매 제품을 찾을 수 없습니다." }, { status: 400 });
      }
    }
    const keys = parsed.products.map((product) => product.catalogKey);
    const nameByKey = new Map<string, string>();
    if (keys.length > 0) {
      const { data: itemRows, error: itemError } = await db.admin
        .from("inventory_items")
        .select("catalog_key, name")
        .eq("kind", "retail")
        .in("catalog_key", keys);
      if (itemError) {
        console.error("[PATCH /api/admin/bookings/:id] retail items", itemError);
        return NextResponse.json({ ok: false, error: "판매 제품을 찾을 수 없습니다." }, { status: 500 });
      }
      for (const row of itemRows ?? []) {
        if (row.catalog_key) nameByKey.set(String(row.catalog_key), String(row.name ?? ""));
      }
      for (const product of parsed.products) {
        if (!nameByKey.has(product.catalogKey)) {
          return NextResponse.json({ ok: false, error: "판매 제품을 찾을 수 없습니다." }, { status: 400 });
        }
      }
    }
    const baseIds = Array.isArray(patch.service_ids)
      ? (patch.service_ids as string[])
      : Array.isArray(current.service_ids)
        ? current.service_ids.map(String)
        : [];
    const baseNames = Array.isArray(patch.service_names)
      ? (patch.service_names as string[])
      : Array.isArray(current.service_names)
        ? current.service_names.map(String)
        : [];
    const attached = attachRetailToServices(
      baseIds,
      baseNames,
      parsed.products.map((product) => ({
        catalogKey: product.catalogKey,
        name: nameByKey.get(product.catalogKey) ?? product.catalogKey,
        quantity: product.quantity
      }))
    );
    patch.service_ids = attached.service_ids;
    patch.service_names = attached.service_names;
  }

  const requestedStatus =
    body.status !== undefined ? body.status : hasPaymentFields ? "completed" : previousStatus;
  const leavingCompleted = previousStatus === "completed" && requestedStatus !== "completed";
  if (leavingCompleted) {
    patch.final_amount = null;
    patch.payment_method = null;
    patch.cash_receipt_issued = false;
    patch.paid_at = null;
    const baseIds = Array.isArray(patch.service_ids)
      ? (patch.service_ids as string[])
      : Array.isArray(current.service_ids)
        ? current.service_ids.map(String)
        : [];
    const baseNames = Array.isArray(patch.service_names)
      ? (patch.service_names as string[])
      : Array.isArray(current.service_names)
        ? current.service_names.map(String)
        : [];
    const { services } = splitServicesAndRetail(baseIds, baseNames);
    patch.service_ids = services.map((row) => row.id);
    patch.service_names = services.map((row) => row.name);

    const serviceIds = services.map((row) => row.id);
    if (serviceIds.length === 0) {
      patch.total_amount = 0;
    } else {
      const artistId = String(current.artist_id);
      const [servicesRes, pricesRes] = await Promise.all([
        db.admin.from("services").select("id, price").in("id", serviceIds),
        db.admin
          .from("service_prices")
          .select("service_id, price")
          .eq("artist_id", artistId)
          .in("service_id", serviceIds)
      ]);
      const serviceById = new Map((servicesRes.data ?? []).map((row) => [String(row.id), row]));
      const priceById = new Map(
        (pricesRes.data ?? []).map((row) => [String(row.service_id), Number(row.price)])
      );
      const canQuote =
        !servicesRes.error &&
        !pricesRes.error &&
        serviceIds.every((sid) => serviceById.has(sid));
      if (canQuote) {
        patch.total_amount = serviceIds.reduce((sum, sid) => {
          const listed = serviceById.get(sid);
          const price = priceById.get(sid) ?? Number(listed?.price) ?? 0;
          return sum + Math.max(0, Math.round(price));
        }, 0);
      } else {
        console.error("[PATCH /api/admin/bookings/:id] service quote", {
          bookingId: id,
          serviceIds,
          servicesError: servicesRes.error,
          pricesError: pricesRes.error
        });
      }
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

  const nextStatus = String(data.status);
  let warning: string | undefined;
  if (nextStatus === "completed" && hasPaymentFields) {
    // 방금 쓴 service_ids를 우선 사용(응답 round-trip 의존 제거)
    const serviceIdsForSync = Array.isArray(patch.service_ids)
      ? (patch.service_ids as string[]).map(String)
      : Array.isArray(data.service_ids)
        ? data.service_ids.map(String)
        : [];
    const sync = await syncBookingSaleMovements({
      admin: db.admin,
      bookingId: id,
      serviceIds: serviceIdsForSync,
      paidAt: data.paid_at ? String(data.paid_at) : null,
      userId: auth.user.id
    });
    if (!sync.ok) {
      console.error("[PATCH /api/admin/bookings/:id] sale sync failed", {
        bookingId: id,
        serviceIdsForSync,
        error: sync.error
      });
      warning = SALE_SYNC_WARNING;
    }
  } else if (previousStatus === "completed" && nextStatus !== "completed") {
    const cleared = await clearBookingSaleMovements(db.admin, id);
    if (cleared.error) {
      console.error("[PATCH /api/admin/bookings/:id] clear out_sale", cleared.error);
      warning = SALE_SYNC_WARNING;
    }
  }

  return NextResponse.json({ ok: true, booking: data, warning: warning ?? null });
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

  const currentRes = await db.admin
    .from("bookings")
    .select("id, booking_date, paid_at")
    .eq("id", id)
    .maybeSingle();
  if (currentRes.error) {
    console.error("[DELETE /api/admin/bookings/:id] current", currentRes.error);
    return NextResponse.json({ ok: false, error: "삭제에 실패했습니다." }, { status: 500 });
  }
  if (!currentRes.data) {
    return NextResponse.json({ ok: false, error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }
  const lock = await findClosedYearMonths(db.admin, bookingLockYearMonths(currentRes.data));
  if (lock.error) {
    console.error("[DELETE /api/admin/bookings/:id] settlement lock", lock.error);
    return NextResponse.json({ ok: false, error: "삭제에 실패했습니다." }, { status: 500 });
  }
  if (lock.closed.length > 0) {
    return NextResponse.json({ ok: false, error: SETTLEMENT_LOCK_ERROR }, { status: 409 });
  }

  const saleCleared = await clearBookingSaleMovements(db.admin, id);
  if (saleCleared.error) {
    console.error("[DELETE /api/admin/bookings/:id] out_sale", saleCleared.error);
    return NextResponse.json(
      { ok: false, error: "이 예약의 재고 출고를 지우지 못해 삭제할 수 없습니다." },
      { status: 500 }
    );
  }

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
