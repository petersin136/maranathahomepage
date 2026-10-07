import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { loadSettlementsDashboard, SettlementsQueryError } from "@/lib/admin/settlements-load";

export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  try {
    const data = await loadSettlementsDashboard(searchParams.get("year"), searchParams.get("month"));
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    if (e instanceof SettlementsQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/settlements]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "정산 집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
