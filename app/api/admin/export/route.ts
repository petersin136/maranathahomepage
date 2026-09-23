import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import {
  buildMonthlyCloseWorkbook,
  monthlyCloseFilename,
  type ExportExpenseRow,
  type ExportSaleRow
} from "@/lib/admin/export-workbook";
import {
  aggregateSettlements,
  resolveSettlementMonth,
  settlementPaidAtRange
} from "@/lib/admin/settlements-data";
import type { ShopSettings } from "@/lib/admin/tax-data";
import type { PaymentMethod } from "@/lib/bookings/types";

export const preferredRegion = "icn1";

const SALE_FIELDS =
  "id, paid_at, booking_date, customer_name, artist_id, artist_name, service_names, payment_method, final_amount, cash_receipt_issued";

const EXPENSE_FIELDS =
  "expense_date, category, vendor, amount, has_tax_invoice, memo";

const ARTIST_FIELDS =
  "id, name_kr, employment_type, commission_rate, bank_name, bank_account, bank_holder";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const month = resolveSettlementMonth(searchParams.get("year"), searchParams.get("month"));
  if ("error" in month) {
    return NextResponse.json({ ok: false, error: month.error }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const paidRange = settlementPaidAtRange(month.from, month.to);

    const [salesRes, expensesRes, artistsRes, settingsRes] = await Promise.all([
      admin
        .from("bookings")
        .select(SALE_FIELDS)
        .eq("status", "completed")
        .not("final_amount", "is", null)
        .gte("paid_at", paidRange.gte)
        .lt("paid_at", paidRange.lt)
        .order("paid_at", { ascending: true })
        .limit(5000),
      admin
        .from("expenses")
        .select(EXPENSE_FIELDS)
        .gte("expense_date", month.from)
        .lte("expense_date", month.to)
        .order("expense_date", { ascending: true })
        .limit(5000),
      admin.from("artists").select(ARTIST_FIELDS).order("sort_order", { ascending: true }),
      admin.from("shop_settings").select("*").limit(1).maybeSingle()
    ]);

    if (salesRes.error) throw new Error(salesRes.error.message);
    if (expensesRes.error) throw new Error(expensesRes.error.message);
    if (artistsRes.error) throw new Error(artistsRes.error.message);
    if (settingsRes.error) throw new Error(settingsRes.error.message);

    const salesRaw = salesRes.data ?? [];
    const sales: ExportSaleRow[] = salesRaw.map((b) => ({
      paid_at: b.paid_at,
      booking_date: b.booking_date,
      customer_name: b.customer_name,
      artist_name: b.artist_name,
      service_names: b.service_names,
      payment_method: b.payment_method as PaymentMethod | null,
      final_amount: Number(b.final_amount) || 0,
      cash_receipt_issued: b.cash_receipt_issued
    }));
    const expenses: ExportExpenseRow[] = (expensesRes.data ?? []).map((e) => ({
      expense_date: e.expense_date,
      category: e.category,
      vendor: e.vendor,
      amount: Number(e.amount) || 0,
      has_tax_invoice: Boolean(e.has_tax_invoice),
      memo: e.memo
    }));

    const settlements = aggregateSettlements({
      year: month.year,
      month: month.month,
      from: month.from,
      to: month.to,
      artists: artistsRes.data ?? [],
      bookings: salesRaw.map((b) => ({
        id: String(b.id || ""),
        artist_id: b.artist_id ?? null,
        booking_date: b.booking_date,
        paid_at: b.paid_at,
        customer_name: b.customer_name,
        service_names: b.service_names,
        payment_method: b.payment_method as PaymentMethod | null,
        final_amount: Number(b.final_amount)
      }))
    });

    const buffer = await buildMonthlyCloseWorkbook({
      year: month.year,
      month: month.month,
      settings: (settingsRes.data as ShopSettings | null) ?? null,
      sales,
      expenses,
      settlements: {
        artists: settlements.artists,
        summary: settlements.summary
      },
      generatedAtIso: new Date().toISOString()
    });

    const filename = monthlyCloseFilename(month.year, month.month);
    const encoded = encodeURIComponent(filename);

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="hairup-close.xlsx"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    console.error("[admin/export GET]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "내보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}
