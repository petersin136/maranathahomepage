import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { loadSettlementsView, SettlementsQueryError } from "@/lib/admin/settlements-load";
import { buildArtistSettlementsPdf, buildSettlementsReportPdf } from "@/lib/admin/pdf/settlements-report-pdf";
import { getSalonName, reportDisposition } from "@/lib/admin/salon-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

const STATUSES = new Set(["정산대기", "지급 완료"]);

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  if (auth.role === "designer" && !auth.artistId) {
    return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";
  try {
    const data = await loadSettlementsView({
      yearRaw: searchParams.get("year"),
      monthRaw: searchParams.get("month"),
      role: auth.role,
      artistId: auth.artistId
    });
    const designer = auth.role === "designer";
    const tableRows =
      designer || status === "all" || !STATUSES.has(status)
        ? data.artists
        : data.artists.filter((row) => row.status === status);
    const salon = await getSalonName();
    const periodLabel = `${data.year}년 ${data.month}월`;
    const chip = designer
      ? data.closed
        ? { text: "정산 확정", filled: true }
        : { text: "집계 중", filled: false }
      : data.closed
        ? { text: "마감 확정", filled: true }
        : { text: "집계 중", filled: false };
    const statusLabel = status === "정산대기" || status === "지급 완료" ? ` · 상태: ${status}` : "";
    const pickedIds = new Set(searchParams.getAll("artistId").filter(Boolean));
    const picked = pickedIds.size ? data.artists.filter((row) => pickedIds.has(row.artistId)) : [];
    if (pickedIds.size && !picked.length) {
      return NextResponse.json({ ok: false, error: "선택한 디자이너를 찾을 수 없습니다." }, { status: 404 });
    }
    const fileKey = `${data.year}-${String(data.month).padStart(2, "0")}`;
    const pdf = picked.length
      ? await buildArtistSettlementsPdf({ salon, periodLabel, chip, issuedAt: new Date(), artists: picked })
      : await buildSettlementsReportPdf({
          salon,
          periodLabel,
          subtitle: designer ? `현재 상태 ${chip.text}` : `디자이너 정산${statusLabel}`,
          chip,
          issuedAt: new Date(),
          designer,
          summary: data.summary,
          artists: data.artists,
          tableRows,
          prevMonthPayout: data.prevMonthPayout,
          hasStaff: data.artists.some((row) => !row.isFreelance && row.hasCommission)
        });
    const reportName = picked.length === 1 ? `${picked[0].artistName} 정산 리포트` : picked.length ? "디자이너별 정산 리포트" : "디자이너 정산 리포트";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": reportDisposition(salon, reportName, fileKey, `settlements-${fileKey}.pdf`),
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    if (e instanceof SettlementsQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/settlements/pdf]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "정산 리포트 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
