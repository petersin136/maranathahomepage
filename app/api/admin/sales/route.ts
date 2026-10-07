import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { loadSalesDashboard, SalesQueryError } from "@/lib/admin/sales-load";

export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  try {
    const data = await loadSalesDashboard(
      searchParams.get("preset"),
      searchParams.get("from"),
      searchParams.get("to")
    );
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    if (e instanceof SalesQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/sales]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
