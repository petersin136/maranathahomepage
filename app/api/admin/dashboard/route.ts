import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { fetchDashboardData } from "@/lib/admin/dashboard-data";

export const preferredRegion = "icn1";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const data = await fetchDashboardData();
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("[admin/dashboard]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "로드 실패" },
      { status: 500 }
    );
  }
}
