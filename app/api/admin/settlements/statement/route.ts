import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import {
  buildSettlementStatementWorkbook,
  settlementStatementFilename
} from "@/lib/admin/export-workbook";
import { loadSettlementsView, SettlementsQueryError } from "@/lib/admin/settlements-load";

export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  if (auth.role === "designer" && !auth.artistId) {
    return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const requestedArtistId = searchParams.get("artistId")?.trim() || "";
  if (auth.role === "owner" && !requestedArtistId) {
    return NextResponse.json({ ok: false, error: "디자이너가 필요합니다." }, { status: 400 });
  }
  if (auth.role === "designer" && requestedArtistId && requestedArtistId !== auth.artistId) {
    return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  }

  try {
    const data = await loadSettlementsView({
      yearRaw: searchParams.get("year"),
      monthRaw: searchParams.get("month"),
      role: auth.role,
      artistId: auth.artistId
    });
    const artistId = auth.role === "designer" ? auth.artistId : requestedArtistId;
    const artist = data.artists.find((row) => row.artistId === artistId);
    if (!artist) {
      return NextResponse.json({ ok: false, error: "정산 대상 디자이너가 없습니다." }, { status: 404 });
    }

    const buffer = await buildSettlementStatementWorkbook({
      year: data.year,
      month: data.month,
      artist,
      generatedAtIso: new Date().toISOString()
    });
    const filename = settlementStatementFilename(data.year, data.month, artist.artistName);
    const encoded = encodeURIComponent(filename);
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="hairup-statement.xlsx"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    if (e instanceof SettlementsQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/settlements/statement]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "명세서 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
