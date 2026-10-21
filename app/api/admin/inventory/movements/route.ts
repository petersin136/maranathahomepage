import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/admin/auth";
import {
  ITEM_FIELDS,
  MOVEMENT_FIELDS,
  isInventoryKind,
  isInventoryMovementType,
  isInventoryWriteType,
  kstLocalToIso,
  parsePositiveInt,
  parseSignedInt,
  resolveInventoryMonth,
  type InventoryKind,
  type InventoryMovementRow,
  type InventoryMovementType
} from "@/lib/admin/inventory";
import { requireInventoryOwner } from "@/lib/admin/inventory-auth";

export const preferredRegion = "icn1";

function mapMovement(
  row: Record<string, unknown>,
  item: { name: string; kind: InventoryKind },
  booking: { customerName: string; bookingDate: string } | null
): InventoryMovementRow {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    itemName: item.name,
    kind: item.kind,
    type: row.type as InventoryMovementType,
    quantity: Number(row.quantity) || 0,
    unitCost: row.unit_cost == null ? null : Number(row.unit_cost),
    bookingId: row.booking_id ? String(row.booking_id) : null,
    bookingCustomerName: booking?.customerName ?? null,
    bookingDate: booking?.bookingDate ?? null,
    memo: row.memo == null ? null : String(row.memo),
    occurredAt: String(row.occurred_at),
    createdBy: row.created_by ? String(row.created_by) : null
  };
}

export async function GET(request: Request) {
  const auth = await requireInventoryOwner();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const month = resolveInventoryMonth(searchParams.get("year"), searchParams.get("month"));
  if ("error" in month) {
    return NextResponse.json({ ok: false, error: month.error }, { status: 400 });
  }

  const typeRaw = searchParams.get("type");
  if (typeRaw && !isInventoryMovementType(typeRaw)) {
    return NextResponse.json({ ok: false, error: "유형이 올바르지 않습니다." }, { status: 400 });
  }
  const itemId = searchParams.get("itemId");

  const admin = getSupabaseAdmin();
  let query = admin
    .from("inventory_movements")
    .select(MOVEMENT_FIELDS)
    .gte("occurred_at", month.fromIso)
    .lt("occurred_at", month.toExclusiveIso)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);
  if (typeRaw) query = query.eq("type", typeRaw);
  if (itemId) query = query.eq("item_id", itemId);

  const { data: moves, error } = await query;
  if (error) {
    console.error("[admin/inventory movements GET]", error);
    return NextResponse.json({ ok: false, error: "로드 실패" }, { status: 500 });
  }

  const ids = [...new Set((moves ?? []).map((row) => String(row.item_id)))];
  const itemsById = new Map<string, { name: string; kind: InventoryKind }>();
  if (ids.length > 0) {
    const { data: items, error: itemsError } = await admin
      .from("inventory_items")
      .select("id, name, kind")
      .in("id", ids);
    if (itemsError) {
      console.error("[admin/inventory movements GET items]", itemsError);
      return NextResponse.json({ ok: false, error: "로드 실패" }, { status: 500 });
    }
    for (const item of items ?? []) {
      if (!isInventoryKind(String(item.kind))) continue;
      itemsById.set(String(item.id), { name: String(item.name ?? ""), kind: item.kind as InventoryKind });
    }
  }

  const bookingIds = [
    ...new Set((moves ?? []).map((row) => (row.booking_id ? String(row.booking_id) : "")).filter(Boolean))
  ];
  const bookingsById = new Map<string, { customerName: string; bookingDate: string }>();
  if (bookingIds.length > 0) {
    const { data: bookings, error: bookingsError } = await admin
      .from("bookings")
      .select("id, customer_name, booking_date")
      .in("id", bookingIds);
    if (bookingsError) {
      console.error("[admin/inventory movements GET bookings]", bookingsError);
      return NextResponse.json({ ok: false, error: "로드 실패" }, { status: 500 });
    }
    for (const booking of bookings ?? []) {
      bookingsById.set(String(booking.id), {
        customerName: String(booking.customer_name ?? ""),
        bookingDate: String(booking.booking_date ?? "").slice(0, 10)
      });
    }
  }

  return NextResponse.json({
    ok: true,
    year: month.year,
    month: month.month,
    movements: (moves ?? []).map((row) => {
      const item = itemsById.get(String(row.item_id)) ?? { name: "—", kind: "retail" as const };
      const bookingId = row.booking_id ? String(row.booking_id) : "";
      return mapMovement(
        row as Record<string, unknown>,
        item,
        bookingId ? bookingsById.get(bookingId) ?? null : null
      );
    })
  });
}

export async function POST(request: Request) {
  const auth = await requireInventoryOwner();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const typeRaw = String(body.type ?? "");
  if (typeRaw === "out_sale") {
    return NextResponse.json(
      { ok: false, error: "판매 출고는 결제 완료 시 자동으로 등록됩니다." },
      { status: 400 }
    );
  }
  if (!isInventoryWriteType(typeRaw)) {
    return NextResponse.json({ ok: false, error: "수정할 수 없는 항목입니다." }, { status: 400 });
  }

  const itemId = String(body.itemId ?? body.item_id ?? "").trim();
  if (!itemId) {
    return NextResponse.json({ ok: false, error: "품목을 찾을 수 없습니다." }, { status: 400 });
  }

  let quantity: number;
  if (typeRaw === "adjust") {
    const parsed = parseSignedInt(body.quantity);
    if ("error" in parsed) {
      return NextResponse.json({ ok: false, error: "조정 수량은 0이 될 수 없습니다." }, { status: 400 });
    }
    quantity = parsed.value;
  } else {
    const parsed = parsePositiveInt(body.quantity);
    if ("error" in parsed) {
      return NextResponse.json({ ok: false, error: "수량을 1 이상 입력해 주세요." }, { status: 400 });
    }
    quantity = typeRaw === "in" ? parsed.value : -parsed.value;
  }

  let occurredAt: string | undefined;
  if (body.occurred_at != null && String(body.occurred_at).trim() !== "") {
    const iso = kstLocalToIso(String(body.occurred_at));
    if (!iso) {
      return NextResponse.json({ ok: false, error: "일시가 올바르지 않습니다." }, { status: 400 });
    }
    occurredAt = iso;
  }

  const memo = body.memo == null ? null : String(body.memo).trim() || null;

  const admin = getSupabaseAdmin();
  const { data: item, error: findError } = await admin
    .from("inventory_items")
    .select(ITEM_FIELDS)
    .eq("id", itemId)
    .maybeSingle();

  if (findError) {
    console.error("[admin/inventory movements POST find]", findError);
    return NextResponse.json({ ok: false, error: "로드 실패" }, { status: 500 });
  }
  if (!item) {
    return NextResponse.json({ ok: false, error: "품목을 찾을 수 없습니다." }, { status: 404 });
  }
  if (typeRaw === "out_use" && item.kind === "retail") {
    return NextResponse.json(
      { ok: false, error: "판매 제품은 시술 소진으로 등록할 수 없습니다." },
      { status: 400 }
    );
  }

  let unitCost: number | null = null;
  if (typeRaw === "in") {
    if (body.unit_cost == null || body.unit_cost === "") {
      unitCost = Number(item.cost_price) || 0;
    } else {
      const n = Number(body.unit_cost);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ ok: false, error: "입고가가 올바르지 않습니다." }, { status: 400 });
      }
      unitCost = Math.round(n);
    }
  }

  const insert: Record<string, unknown> = {
    item_id: itemId,
    type: typeRaw,
    quantity,
    unit_cost: unitCost,
    memo,
    created_by: auth.user.id
  };
  if (occurredAt) insert.occurred_at = occurredAt;

  const { data, error } = await admin.from("inventory_movements").insert(insert).select(MOVEMENT_FIELDS).single();
  if (error || !data) {
    console.error("[admin/inventory movements POST]", error);
    return NextResponse.json({ ok: false, error: "등록에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    movement: mapMovement(
      data as Record<string, unknown>,
      {
        name: String(item.name ?? ""),
        kind: item.kind as InventoryKind
      },
      null
    )
  });
}
