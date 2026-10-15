import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import {
  isPastKstMonth,
  resolveSettlementMonth,
  toSettlementSnapshot,
  yearMonthKey
} from "@/lib/admin/settlements-data";
import { loadSettlementsDashboard, SettlementsQueryError } from "@/lib/admin/settlements-load";

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

  let body: { year?: unknown; month?: unknown; notifyRequested?: unknown };
  try {
    body = (await request.json()) as { year?: unknown; month?: unknown; notifyRequested?: unknown };
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
  if (!isPastKstMonth(month.year, month.month)) {
    return NextResponse.json({ ok: false, error: "지난 달만 마감할 수 있습니다." }, { status: 400 });
  }

  const ym = yearMonthKey(month.year, month.month);
  const admin = getSupabaseAdmin();
  const existing = await admin.from("settlement_closes").select("id").eq("year_month", ym).maybeSingle();
  if (existing.error) {
    console.error("[admin/settlements/close]", existing.error);
    return NextResponse.json({ ok: false, error: "마감 여부를 확인하지 못했습니다." }, { status: 500 });
  }
  if (existing.data) {
    return NextResponse.json({ ok: false, error: "이미 마감된 달입니다." }, { status: 409 });
  }

  try {
    const live = await loadSettlementsDashboard(String(month.year), String(month.month));
    const snapshot = toSettlementSnapshot(live);
    const { data, error } = await admin
      .from("settlement_closes")
      .insert({
        year_month: ym,
        closed_by: auth.user.id,
        notify_requested: Boolean(body.notifyRequested),
        snapshot
      })
      .select("id, year_month, closed_at, notify_requested")
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: false, error: "이미 마감된 달입니다." }, { status: 409 });
      }
      throw new Error(error.message);
    }
    return NextResponse.json({ ok: true, close: data });
  } catch (e) {
    if (e instanceof SettlementsQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/settlements/close]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "마감에 실패했습니다." },
      { status: 500 }
    );
  }
}
