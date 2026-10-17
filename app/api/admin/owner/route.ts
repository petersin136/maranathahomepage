import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { loadOwnerPnlView, OwnerPnlQueryError } from "@/lib/admin/owner-load";

export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  if (auth.role !== "owner") {
    return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  try {
    const data = await loadOwnerPnlView({
      periodRaw: searchParams.get("period"),
      yearRaw: searchParams.get("year"),
      monthRaw: searchParams.get("month"),
      dateRaw: searchParams.get("date")
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    if (e instanceof OwnerPnlQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/owner]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "원장 정산 집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
