import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { loadSettlementsView, SettlementsQueryError } from "@/lib/admin/settlements-load";

export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  if (auth.role === "designer" && !auth.artistId) {
    return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  try {
    const data = await loadSettlementsView({
      yearRaw: searchParams.get("year"),
      monthRaw: searchParams.get("month"),
      role: auth.role,
      artistId: auth.artistId
    });
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
