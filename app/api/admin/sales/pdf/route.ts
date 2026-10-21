import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { artistIdsFromSearchParams, monthEnd, monthStart, salesBoardView } from "@/lib/admin/sales-data";
import { loadSalesDashboard, SalesQueryError } from "@/lib/admin/sales-load";
import { buildSalesReportPdf } from "@/lib/admin/pdf/sales-report-pdf";
import { getSalonName, isSettlementMonthClosed, reportDisposition } from "@/lib/admin/salon-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const data = await loadSalesDashboard(
      from && to ? "custom" : searchParams.get("preset"),
      from,
      to,
      auth.role === "designer" ? artistIds : []
    );
    const view = salesBoardView({
      payments: data.payments ?? [],
      previousPayments: data.previousPayments ?? [],
      periodBookings: data.periodBookings ?? [],
      artistIds
    });
    const year = Number(data.period.from.slice(0, 4));
    const month = Number(data.period.from.slice(5, 7));
    const monthSpan = from && to ? from === monthStart(data.period.from) && to === monthEnd(data.period.from) : true;
    const closed = monthSpan ? await isSettlementMonthClosed(year, month) : false;
    const salon = await getSalonName();
    const names = artistIds
      .map((id) => data.artists.find((row) => row.artistId === id)?.artistName)
      .filter((name): name is string => Boolean(name));
    const subtitle = names.length ? `결제 완료 기준 매출 · 담당자: ${names.join(", ")}` : "결제 완료 기준 매출";
    const periodLabel = `${year}년 ${month}월`;
    const pdf = await buildSalesReportPdf({
      salon,
      periodLabel,
      subtitle,
      chip: closed ? { text: "마감 확정", filled: true } : { text: "집계 중", filled: false },
      issuedAt: new Date(),
      view
    });
    const fileKey = `${year}-${String(month).padStart(2, "0")}`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": reportDisposition(salon, "매출 리포트", fileKey, `sales-${fileKey}.pdf`),
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    if (e instanceof SalesQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/sales/pdf]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "매출 리포트 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
