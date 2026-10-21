import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import { loadOwnerPnlView, OwnerPnlQueryError } from "@/lib/admin/owner-load";
import { buildPnlReportPdf, type PnlSummary } from "@/lib/admin/pnl-report-pdf";
import { getSalonName, reportDisposition } from "@/lib/admin/salon-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  if (auth.role !== "owner") {
    return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  try {
    const admin = getSupabaseAdmin();
    const [view, salonName] = await Promise.all([
      loadOwnerPnlView({
        periodRaw: searchParams.get("period"),
        yearRaw: searchParams.get("year"),
        monthRaw: searchParams.get("month"),
        dateRaw: searchParams.get("date")
      }),
      getSalonName()
    ]);

    const isMonth = view.period === "month";
    const mm = String(view.month).padStart(2, "0");
    const periodLabel = isMonth ? `${view.year}년 ${view.month}월` : `${view.from} ~ ${view.to}`;

    let closed = false;
    if (isMonth) {
      const { data, error } = await admin
        .from("settlement_closes")
        .select("year_month")
        .eq("year_month", `${view.year}-${mm}`)
        .maybeSingle();
      if (error) throw new Error(error.message);
      closed = Boolean(data);
    }

    const pdf = await buildPnlReportPdf(view.summary as PnlSummary, {
      salonName,
      periodLabel,
      closed,
      issuedAt: new Date(),
      period: view.period
    });

    const fileKey = isMonth ? `${view.year}-${mm}` : `${view.from}_${view.to}`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": reportDisposition(salonName, "매장 손익 리포트", fileKey, `pnl-${fileKey}.pdf`),
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    if (e instanceof OwnerPnlQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/owner/pdf]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "원장 정산 집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
