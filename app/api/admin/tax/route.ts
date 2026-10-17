import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import { isShopSettingsConfigured, type ShopSettings, type TaxType } from "@/lib/admin/tax-data";
import { loadShopSettings, loadTaxDashboard } from "@/lib/admin/tax-load";

export const preferredRegion = "icn1";

function rejectDesigner(role: string) {
  if (role !== "designer") return null;
  return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
}

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  const denied = rejectDesigner(auth.role);
  if (denied) return denied;

  try {
    const data = await loadTaxDashboard();
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("[admin/tax GET]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "집계에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  const denied = rejectDesigner(auth.role);
  if (denied) return denied;

  let body: {
    business_name?: string | null;
    business_number?: string | null;
    tax_type?: TaxType | null;
    vat_rate?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const business_name =
    body.business_name == null ? null : String(body.business_name).trim() || null;
  const business_number_raw =
    body.business_number == null ? null : String(body.business_number).trim() || null;
  const business_number = business_number_raw
    ? business_number_raw.replace(/[^0-9]/g, "") || null
    : null;
  if (business_number && business_number.length !== 10) {
    return NextResponse.json(
      { ok: false, error: "사업자번호는 숫자 10자리로 입력해 주세요." },
      { status: 400 }
    );
  }
  const tax_type =
    body.tax_type === "general" || body.tax_type === "simplified" ? body.tax_type : null;

  // DB vat_rate는 numeric(4,3) — 10/30(%)이 아니라 0.1/0.3 비율로 저장
  function normalizeVatRate(raw: unknown, tax: TaxType | null): number | null {
    if (raw == null || raw === "") {
      if (tax === "general") return 0.1;
      if (tax === "simplified") return 0.3;
      return null;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return NaN;
    if (n > 1) return n / 100;
    return n;
  }
  const vat_rate = normalizeVatRate(body.vat_rate, tax_type);

  if (vat_rate != null && (!Number.isFinite(vat_rate) || vat_rate < 0 || vat_rate >= 10)) {
    return NextResponse.json({ ok: false, error: "부가가치율이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const existing = await loadShopSettings(admin);
    const patch = {
      business_name,
      business_number,
      tax_type,
      vat_rate
    };

    let data: ShopSettings | null = null;
    if (existing && (existing as { id?: string }).id) {
      const { data: updated, error } = await admin
        .from("shop_settings")
        .update(patch)
        .eq("id", (existing as { id: string }).id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      data = updated as ShopSettings;
    } else {
      const { data: inserted, error } = await admin
        .from("shop_settings")
        .insert(patch)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      data = inserted as ShopSettings;
    }

    return NextResponse.json({
      ok: true,
      settings: data,
      settingsConfigured: isShopSettingsConfigured(data)
    });
  } catch (e) {
    console.error("[admin/tax PATCH]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "설정 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
