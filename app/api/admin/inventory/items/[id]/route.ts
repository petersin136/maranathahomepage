import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/admin/auth";
import {
  ITEM_FIELDS,
  inventoryBadge,
  parseNonNegInt
} from "@/lib/admin/inventory";
import { requireInventoryOwner } from "@/lib/admin/inventory-auth";

export const preferredRegion = "icn1";

const RETAIL_ALLOWED = new Set(["safety_stock"]);
const MATERIAL_ALLOWED = new Set(["name", "unit", "cost_price", "safety_stock", "is_active", "sort_order"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireInventoryOwner();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return NextResponse.json({ ok: false, error: "수정할 수 없는 항목입니다." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: current, error: findError } = await admin
    .from("inventory_items")
    .select(ITEM_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    console.error("[admin/inventory items PATCH find]", findError);
    return NextResponse.json({ ok: false, error: "로드 실패" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ ok: false, error: "품목을 찾을 수 없습니다." }, { status: 404 });
  }

  const allowed = current.kind === "retail" ? RETAIL_ALLOWED : MATERIAL_ALLOWED;
  if (keys.some((key) => !allowed.has(key))) {
    return NextResponse.json({ ok: false, error: "수정할 수 없는 항목입니다." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ("name" in body) {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "품목명을 입력해 주세요." }, { status: 400 });
    patch.name = name;
  }
  if ("unit" in body) {
    const unit = String(body.unit ?? "").trim();
    if (!unit) return NextResponse.json({ ok: false, error: "단위를 입력해 주세요." }, { status: 400 });
    patch.unit = unit;
  }
  if ("cost_price" in body) {
    const cost = parseNonNegInt(body.cost_price);
    if ("error" in cost) {
      return NextResponse.json({ ok: false, error: "입고가가 올바르지 않습니다." }, { status: 400 });
    }
    patch.cost_price = cost.value;
  }
  if ("safety_stock" in body) {
    const safety = parseNonNegInt(body.safety_stock);
    if ("error" in safety) {
      return NextResponse.json({ ok: false, error: "부족 기준이 올바르지 않습니다." }, { status: 400 });
    }
    patch.safety_stock = safety.value;
  }
  if ("is_active" in body) {
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ ok: false, error: "수정할 수 없는 항목입니다." }, { status: 400 });
    }
    patch.is_active = body.is_active;
  }
  if ("sort_order" in body) {
    const sort = parseNonNegInt(body.sort_order);
    if ("error" in sort) {
      return NextResponse.json({ ok: false, error: "수정할 수 없는 항목입니다." }, { status: 400 });
    }
    patch.sort_order = sort.value;
  }

  const { data, error } = await admin
    .from("inventory_items")
    .update(patch)
    .eq("id", id)
    .select(ITEM_FIELDS)
    .single();

  if (error || !data) {
    console.error("[admin/inventory items PATCH]", error);
    return NextResponse.json({ ok: false, error: "수정에 실패했습니다." }, { status: 500 });
  }

  const { data: stock } = await admin.from("inventory_stock").select("qty").eq("item_id", id).maybeSingle();
  const qty = Number(stock?.qty) || 0;
  const safetyStock = Number(data.safety_stock) || 0;

  return NextResponse.json({
    ok: true,
    item: {
      id: data.id,
      kind: data.kind,
      catalogKey: data.catalog_key,
      name: data.name,
      unit: data.unit,
      costPrice: data.cost_price,
      salePrice: data.sale_price,
      safetyStock,
      isActive: data.is_active,
      sortOrder: data.sort_order,
      qty,
      badge: inventoryBadge(qty, safetyStock)
    }
  });
}
