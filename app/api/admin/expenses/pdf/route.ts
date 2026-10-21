import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { loadExpensesDashboard, ExpensesQueryError } from "@/lib/admin/expenses-load";
import { buildExpensesReportPdf, categorySubtitle, type ExpensePdfRow } from "@/lib/admin/pdf/expenses-report-pdf";
import { getSalonName, isSettlementMonthClosed, reportDisposition } from "@/lib/admin/salon-name";

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
  const categories = searchParams.getAll("category").filter(Boolean);
  try {
    const data = await loadExpensesDashboard(searchParams.get("year"), searchParams.get("month"));
    const rows = (data.expenses as ExpensePdfRow[]).filter((row) =>
      categories.length === 0 ? true : categories.includes(row.category)
    );
    const salon = await getSalonName();
    const closed = await isSettlementMonthClosed(data.year, data.month);
    const periodLabel = `${data.year}년 ${data.month}월`;
    const pdf = await buildExpensesReportPdf({
      salon,
      periodLabel,
      subtitle: categorySubtitle(categories),
      chip: closed ? { text: "마감 확정", filled: true } : { text: "집계 중", filled: false },
      issuedAt: new Date(),
      summary: data.summary,
      rows
    });
    const fileKey = `${data.year}-${String(data.month).padStart(2, "0")}`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": reportDisposition(salon, "지출 리포트", fileKey, `expenses-${fileKey}.pdf`),
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    if (e instanceof ExpensesQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/expenses/pdf]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "지출 리포트 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
