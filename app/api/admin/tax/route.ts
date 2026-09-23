import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import { kstDayEndExclusiveIso, kstDayStartIso, todayKst } from "@/lib/admin/sales-data";
import {
  aggregateTaxDashboard,
  CASH_RECEIPT_THRESHOLD,
  formatYmd,
  isShopSettingsConfigured,
  paidAtToKstYearMonth,
  parseYmd,
  resolveVatPeriod,
  type ShopSettings,
  type TaxType
} from "@/lib/admin/tax-data";

export const preferredRegion = "icn1";

type BookingRow = {
  paid_at: string | null;
  final_amount: number | null;
  payment_method: string | null;
  cash_receipt_issued: boolean | null;
  artist_id: string | null;
};

type ExpenseRow = {
  expense_date: string;
  amount: number | null;
  has_tax_invoice: boolean | null;
};

function sumByMonth(
  rows: { year: number; month: number; amount: number }[]
) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.year}-${r.month}`;
    map.set(key, (map.get(key) ?? 0) + r.amount);
  }
  return [...map.entries()].map(([key, amount]) => {
    const [year, month] = key.split("-").map(Number);
    return { year, month, amount };
  });
}

async function loadShopSettings(admin: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await admin.from("shop_settings").select("*").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ShopSettings | null) ?? null;
}

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const admin = getSupabaseAdmin();
    const today = todayKst();
    const { y: year } = parseYmd(today);
    const yearStart = formatYmd(year, 1, 1);
    const yearEnd = formatYmd(year, 12, 31);
    const prevYearStart = formatYmd(year - 1, 1, 1);
    const prevYearEnd = formatYmd(year - 1, 12, 31);

    const settings = await loadShopSettings(admin);
    const taxType: TaxType =
      settings?.tax_type === "simplified" ? "simplified" : "general";
    const vatPeriod = resolveVatPeriod(taxType, today);

    const [bookingsRes, prevBookingsRes, expensesRes, artistsRes] = await Promise.all([
      admin
        .from("bookings")
        .select("paid_at, final_amount, payment_method, cash_receipt_issued, artist_id")
        .eq("status", "completed")
        .not("final_amount", "is", null)
        .gte("paid_at", kstDayStartIso(yearStart))
        .lt("paid_at", kstDayEndExclusiveIso(yearEnd))
        .limit(10000),
      admin
        .from("bookings")
        .select("final_amount")
        .eq("status", "completed")
        .not("final_amount", "is", null)
        .gte("paid_at", kstDayStartIso(prevYearStart))
        .lt("paid_at", kstDayEndExclusiveIso(prevYearEnd))
        .limit(10000),
      admin
        .from("expenses")
        .select("expense_date, amount, has_tax_invoice")
        .gte("expense_date", yearStart)
        .lte("expense_date", yearEnd)
        .limit(10000),
      admin.from("artists").select("id, employment_type, commission_rate")
    ]);

    if (bookingsRes.error) throw new Error(bookingsRes.error.message);
    if (prevBookingsRes.error) throw new Error(prevBookingsRes.error.message);
    if (expensesRes.error) throw new Error(expensesRes.error.message);

    const bookings = (bookingsRes.data ?? []) as BookingRow[];
    const expenses = (expensesRes.data ?? []) as ExpenseRow[];
    const previousYearRevenue = (prevBookingsRes.data ?? []).reduce((sum, row) => {
      const amount = Number(row.final_amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const freelanceIds = new Set(
      (artistsRes.data ?? [])
        .filter(
          (a) =>
            a.employment_type === "freelance" &&
            a.commission_rate != null &&
            Number(a.commission_rate) > 0
        )
        .map((a) => a.id as string)
    );

    const revenueMonths: { year: number; month: number; amount: number }[] = [];
    let yearRevenue = 0;
    let vatPeriodRevenue = 0;
    let ytdRevenue = 0;
    let cashReceiptCount = 0;
    let cashReceiptAmount = 0;
    let hasFreelancePayouts = false;

    for (const b of bookings) {
      if (!b.paid_at || b.final_amount == null) continue;
      const amount = Number(b.final_amount);
      if (!Number.isFinite(amount)) continue;
      const { year: by, month: bm, ymd } = paidAtToKstYearMonth(b.paid_at);
      revenueMonths.push({ year: by, month: bm, amount });
      yearRevenue += amount;
      if (ymd >= vatPeriod.from && ymd <= vatPeriod.to) vatPeriodRevenue += amount;
      if (ymd >= yearStart && ymd <= today) ytdRevenue += amount;

      if (
        b.payment_method &&
        b.payment_method !== "card" &&
        amount >= CASH_RECEIPT_THRESHOLD &&
        !b.cash_receipt_issued
      ) {
        cashReceiptCount += 1;
        cashReceiptAmount += amount;
      }
      if (b.artist_id && freelanceIds.has(b.artist_id)) hasFreelancePayouts = true;
    }

    const expenseMonths: { year: number; month: number; amount: number }[] = [];
    const proofMonths: { year: number; month: number; amount: number }[] = [];
    const unprovenMonths: { year: number; month: number; amount: number }[] = [];
    let ytdExpense = 0;
    let ytdUnproven = 0;
    let vatPeriodProof = 0;

    for (const e of expenses) {
      const amount = Number(e.amount || 0);
      if (!Number.isFinite(amount)) continue;
      const { y, m } = parseYmd(e.expense_date);
      expenseMonths.push({ year: y, month: m, amount });
      if (e.has_tax_invoice) {
        proofMonths.push({ year: y, month: m, amount });
      } else {
        unprovenMonths.push({ year: y, month: m, amount });
      }
      if (e.expense_date >= yearStart && e.expense_date <= today) {
        ytdExpense += amount;
        if (!e.has_tax_invoice) ytdUnproven += amount;
      }
      if (e.expense_date >= vatPeriod.from && e.expense_date <= vatPeriod.to && e.has_tax_invoice) {
        vatPeriodProof += amount;
      }
    }

    const data = aggregateTaxDashboard({
      settings,
      today,
      monthlyRevenue: sumByMonth(revenueMonths),
      monthlyExpense: sumByMonth(expenseMonths),
      monthlyProofExpense: sumByMonth(proofMonths),
      monthlyUnprovenExpense: sumByMonth(unprovenMonths),
      yearRevenue,
      previousYearRevenue,
      vatPeriodRevenue,
      vatPeriodProofExpense: vatPeriodProof,
      ytdRevenue,
      ytdExpense,
      ytdUnprovenExpense: ytdUnproven,
      cashReceiptCount,
      cashReceiptAmount,
      hasFreelancePayouts
    });

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
  const business_number =
    body.business_number == null ? null : String(body.business_number).trim() || null;
  const tax_type =
    body.tax_type === "general" || body.tax_type === "simplified" ? body.tax_type : null;
  const vat_rate =
    body.vat_rate == null || body.vat_rate === ("" as never)
      ? tax_type === "general"
        ? 10
        : tax_type === "simplified"
          ? 30
          : null
      : Number(body.vat_rate);

  if (vat_rate != null && (!Number.isFinite(vat_rate) || vat_rate < 0)) {
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
