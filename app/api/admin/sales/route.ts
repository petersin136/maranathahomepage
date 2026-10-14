import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { artistIdsFromSearchParams } from "@/lib/admin/sales-data";
import { loadSalesDashboard, SalesQueryError } from "@/lib/admin/sales-load";

export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  let artistIds: string[];
  if (auth.role === "designer") {
    if (!auth.artistId) {
      return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
    }
    artistIds = [auth.artistId];
  } else {
    const parsed = artistIdsFromSearchParams(searchParams);
    if ("error" in parsed) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    artistIds = parsed;
  }
  try {
    const data = await loadSalesDashboard(
      searchParams.get("preset"),
      searchParams.get("from"),
      searchParams.get("to"),
      artistIds
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
