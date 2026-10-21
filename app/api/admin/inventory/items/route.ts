import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/admin/auth";
import {
  ITEM_FIELDS,
  inventoryBadge,
  isInventoryKind,
  parseNonNegInt,
  resolveInventoryMonth,
  type InventoryItemRow,
  type InventoryKind
} from "@/lib/admin/inventory";
import { requireInventoryOwner } from "@/lib/admin/inventory-auth";
import { todayKst } from "@/lib/admin/sales-data";

export const preferredRegion = "icn1";

function mapItem(row: Record<string, unknown>, qty: number, month: { in: number; sale: number; use: number }): InventoryItemRow {
  const safetyStock = Number(row.safety_stock) || 0;
  const kind = row.kind as InventoryKind;
  return {
    id: String(row.id),
    kind,
    catalogKey: row.catalog_key ? String(row.catalog_key) : null,
    name: String(row.name ?? ""),
    unit: String(row.unit ?? "개"),
    costPrice: Number(row.cost_price) || 0,
    salePrice: row.sale_price == null ? null : Number(row.sale_price),
    safetyStock,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order) || 0,
    qty,
    badge: inventoryBadge(qty, safetyStock),
    monthIn: month.in,
    monthOutSale: month.sale,
    monthOutUse: month.use
  };
}

export async function GET(request: Request) {
  const auth = await requireInventoryOwner();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const kindRaw = searchParams.get("kind");
  if (!kindRaw || !isInventoryKind(kindRaw)) {
    return NextResponse.json({ ok: false, error: "종류가 올바르지 않습니다." }, { status: 400 });
  }
  const includeInactive = searchParams.get("includeInactive") === "1";
  const today = todayKst();
  const [ty, tm] = today.split("-").map(Number);
  const month = resolveInventoryMonth(String(ty), String(tm));
  if ("error" in month) {
    return NextResponse.json({ ok: false, error: month.error }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  let itemsQuery = admin
    .from("inventory_items")
    .select(ITEM_FIELDS)
    .eq("kind", kindRaw)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (!includeInactive) itemsQuery = itemsQuery.eq("is_active", true);

  const [{ data: items, error: itemsError }, { data: stock, error: stockError }, { data: moves, error: movesError }] =
    await Promise.all([
      itemsQuery,
      admin.from("inventory_stock").select("item_id, qty"),
      admin
        .from("inventory_movements")
        .select("item_id, type, quantity")
        .gte("occurred_at", month.fromIso)
        .lt("occurred_at", month.toExclusiveIso)
    ]);

  if (itemsError || stockError || movesError) {
    console.error("[admin/inventory items GET]", itemsError || stockError || movesError);
    return NextResponse.json({ ok: false, error: "로드 실패" }, { status: 500 });
  }

  const qtyById = new Map<string, number>();
  for (const row of stock ?? []) {
    qtyById.set(String(row.item_id), Number(row.qty) || 0);
  }
  const monthById = new Map<string, { in: number; sale: number; use: number }>();
  for (const row of moves ?? []) {
    const id = String(row.item_id);
    const cur = monthById.get(id) ?? { in: 0, sale: 0, use: 0 };
    const q = Number(row.quantity) || 0;
    if (row.type === "in") cur.in += q;
    if (row.type === "out_sale") cur.sale += Math.abs(q);
    if (row.type === "out_use") cur.use += Math.abs(q);
    monthById.set(id, cur);
  }

  const mapped = (items ?? []).map((row) =>
    mapItem(row as Record<string, unknown>, qtyById.get(String(row.id)) ?? 0, monthById.get(String(row.id)) ?? { in: 0, sale: 0, use: 0 })
  );

  return NextResponse.json({
    ok: true,
    kind: kindRaw,
    year: month.year,
    month: month.month,
    items: mapped,
    summary: {
      total: mapped.length,
      low: mapped.filter((item) => item.badge === "부족").length,
      out: mapped.filter((item) => item.badge === "품절").length
    }
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

  if (body.kind === "retail") {
    return NextResponse.json({ ok: false, error: "판매 제품은 추가할 수 없습니다." }, { status: 400 });
  }
  if (body.kind != null && body.kind !== "material") {
    return NextResponse.json({ ok: false, error: "수정할 수 없는 항목입니다." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "품목명을 입력해 주세요." }, { status: 400 });
  }
  const unit = String(body.unit ?? "개").trim() || "개";
  const cost = parseNonNegInt(body.cost_price);
  if ("error" in cost) {
    return NextResponse.json({ ok: false, error: "입고가가 올바르지 않습니다." }, { status: 400 });
  }
  const safety = body.safety_stock == null || body.safety_stock === "" ? { value: 0 } : parseNonNegInt(body.safety_stock);
  if ("error" in safety) {
    return NextResponse.json({ ok: false, error: "부족 기준이 올바르지 않습니다." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("inventory_items")
    .insert({
      kind: "material",
      name,
      unit,
      cost_price: cost.value,
      sale_price: null,
      safety_stock: safety.value,
      is_active: true
    })
    .select(ITEM_FIELDS)
    .single();

  if (error || !data) {
    console.error("[admin/inventory items POST]", error);
    return NextResponse.json({ ok: false, error: "등록에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    item: mapItem(data as Record<string, unknown>, 0, { in: 0, sale: 0, use: 0 })
  });
}
