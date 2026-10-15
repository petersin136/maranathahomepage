import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { loadSettlementsDashboard, SettlementsQueryError } from "@/lib/admin/settlements-load";

export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  if (auth.role === "designer" && !auth.artistId) {
    return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  try {
    const onlyArtistId = auth.role === "designer" ? auth.artistId ?? undefined : undefined;
    const data = await loadSettlementsDashboard(
      searchParams.get("year"),
      searchParams.get("month"),
      onlyArtistId
    );
    if (auth.role === "designer" && auth.artistId) {
      // 정산은 본인 실지급 확인용이라 본인 계좌를 허용한다.
      // 조회 단계에서도 본인만 읽지만 방어용으로 한 번 더 거른다.
      const artists = data.artists.filter((row) => row.artistId === auth.artistId);
      const summary = {
        totalRevenue: artists.reduce((sum, row) => sum + row.revenue, 0),
        totalIncentive: artists.reduce((sum, row) => sum + (row.incentive ?? 0), 0),
        totalWithholding: artists.reduce((sum, row) => sum + (row.withholding ?? 0), 0),
        totalNetPay: artists.reduce((sum, row) => sum + (row.netPay ?? 0), 0)
      };
      return NextResponse.json({ ok: true, ...data, artists, summary });
    }
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
