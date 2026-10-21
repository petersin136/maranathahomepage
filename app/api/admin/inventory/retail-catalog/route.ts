import { NextResponse } from "next/server";
import { getSupabaseAdmin, requireAdminUser } from "@/lib/admin/auth";

export const preferredRegion = "icn1";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("inventory_items")
    .select("catalog_key, name, sale_price, sort_order")
    .eq("kind", "retail")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/inventory retail-catalog GET]", error);
    return NextResponse.json({ ok: false, error: "로드 실패" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    items: (data ?? [])
      .filter((row) => row.catalog_key)
      .map((row) => ({
        catalogKey: String(row.catalog_key),
        name: String(row.name ?? ""),
        salePrice: Number(row.sale_price) || 0
      }))
  });
}
