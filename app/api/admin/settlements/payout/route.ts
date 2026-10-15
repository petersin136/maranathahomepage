import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import {
  isSettlementSnapshot,
  resolveSettlementMonth,
  yearMonthKey
} from "@/lib/admin/settlements-data";

export const preferredRegion = "icn1";

function rejectDesigner(role: string) {
  if (role !== "designer") return null;
  return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  const denied = rejectDesigner(auth.role);
  if (denied) return denied;

  let body: { year?: unknown; month?: unknown; artistId?: unknown };
  try {
    body = (await request.json()) as { year?: unknown; month?: unknown; artistId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const month = resolveSettlementMonth(
    body.year == null ? null : String(body.year),
    body.month == null ? null : String(body.month)
  );
  if ("error" in month) {
    return NextResponse.json({ ok: false, error: month.error }, { status: 400 });
  }
  const artistId = typeof body.artistId === "string" ? body.artistId.trim() : "";
  if (!artistId) {
    return NextResponse.json({ ok: false, error: "디자이너가 없습니다." }, { status: 400 });
  }

  const ym = yearMonthKey(month.year, month.month);
  const admin = getSupabaseAdmin();

  const closed = await admin
    .from("settlement_closes")
    .select("id, snapshot")
    .eq("year_month", ym)
    .maybeSingle();
  if (closed.error) {
    console.error("[admin/settlements/payout] close", closed.error);
    return NextResponse.json({ ok: false, error: "마감 여부를 확인하지 못했습니다." }, { status: 500 });
  }
  if (!closed.data) {
    return NextResponse.json(
      { ok: false, error: "마감 후 지급 처리할 수 있습니다." },
      { status: 400 }
    );
  }

  const snapshot = closed.data.snapshot;
  const artists = isSettlementSnapshot(snapshot) ? snapshot.artists : [];
  const netPay = artists.find((row) => row.artistId === artistId)?.netPay;
  if (typeof netPay !== "number" || netPay <= 0) {
    return NextResponse.json({ ok: false, error: "지급할 금액이 없습니다." }, { status: 400 });
  }

  const existing = await admin
    .from("settlement_payouts")
    .select("id")
    .eq("year_month", ym)
    .eq("artist_id", artistId)
    .maybeSingle();
  if (existing.error) {
    console.error("[admin/settlements/payout] existing", existing.error);
    return NextResponse.json({ ok: false, error: "지급 여부를 확인하지 못했습니다." }, { status: 500 });
  }
  if (existing.data) {
    return NextResponse.json({ ok: false, error: "이미 지급 처리되었습니다." }, { status: 409 });
  }

  const { data, error } = await admin
    .from("settlement_payouts")
    .insert({
      year_month: ym,
      artist_id: artistId,
      paid_by: auth.user.id
    })
    .select("id, year_month, artist_id, paid_at")
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "이미 지급 처리되었습니다." }, { status: 409 });
    }
    console.error("[admin/settlements/payout]", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, payout: data });
}
