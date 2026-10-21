import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import {
  buildMonthlyCloseWorkbook,
  monthlyCloseFilename,
  summarizeMonthlyClose,
  type ExportExpenseRow,
  type ExportSaleRow
} from "@/lib/admin/export-workbook";
import { buildMonthlyClosePdf } from "@/lib/admin/export-pdf";
import {
  aggregateSettlements,
  resolveSettlementMonth,
  settlementPaidAtRange
} from "@/lib/admin/settlements-data";
import { artistIdsFromSearchParams, isYmd } from "@/lib/admin/sales-data";
import { missingExpenseExtraColumns } from "@/lib/admin/expenses-load";
import { shopDisplayName, type ShopSettings } from "@/lib/admin/tax-data";
import { reportDisposition } from "@/lib/admin/salon-name";
import type { PaymentMethod } from "@/lib/bookings/types";

export const preferredRegion = "icn1";

const SALE_FIELDS =
  "id, paid_at, booking_date, customer_name, artist_id, artist_name, service_names, payment_method, final_amount, cash_receipt_issued";

const EXPENSE_FIELDS_BASE = "expense_date, category, vendor, amount, has_tax_invoice, memo";
const EXPENSE_FIELDS = `${EXPENSE_FIELDS_BASE}, payment_method, proof_type`;

const ARTIST_FIELDS =
  "id, name_kr, employment_type, commission_rate, bank_name, bank_account, bank_holder";

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
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  let range: { year: number; month: number; from: string; to: string };
  if (fromRaw != null || toRaw != null) {
    if (!fromRaw || !toRaw || !isYmd(fromRaw) || !isYmd(toRaw)) {
      return NextResponse.json({ ok: false, error: "날짜 범위가 올바르지 않습니다." }, { status: 400 });
    }
    if (fromRaw > toRaw) {
      return NextResponse.json({ ok: false, error: "시작일이 종료일보다 늦을 수 없습니다." }, { status: 400 });
    }
    range = {
      year: Number(fromRaw.slice(0, 4)),
      month: Number(fromRaw.slice(5, 7)),
      from: fromRaw,
      to: toRaw
    };
  } else {
    const month = resolveSettlementMonth(searchParams.get("year"), searchParams.get("month"));
    if ("error" in month) {
      return NextResponse.json({ ok: false, error: month.error }, { status: 400 });
    }
    range = month;
  }

  try {
    const admin = getSupabaseAdmin();
    const paidRange = settlementPaidAtRange(range.from, range.to);

    let salesQuery = admin
      .from("bookings")
      .select(SALE_FIELDS)
      .eq("status", "completed")
      .not("final_amount", "is", null)
      .gte("paid_at", paidRange.gte)
      .lt("paid_at", paidRange.lt)
      .order("paid_at", { ascending: true });
    if (artistIds.length > 0) salesQuery = salesQuery.in("artist_id", artistIds);

    const expensesSelect = (fields: string) =>
      admin
        .from("expenses")
        .select(fields)
        .gte("expense_date", range.from)
        .lte("expense_date", range.to)
        .order("expense_date", { ascending: true })
        .limit(5000);

    let artistsQuery = admin.from("artists").select(ARTIST_FIELDS).order("sort_order", { ascending: true });
    if (auth.role === "designer" && auth.artistId) artistsQuery = artistsQuery.eq("id", auth.artistId);

    const [salesRes, expensesFirst, artistsRes, settingsRes] = await Promise.all([
      salesQuery.limit(5000),
      auth.role === "designer"
        ? Promise.resolve({ data: [] as Record<string, unknown>[], error: null })
        : expensesSelect(EXPENSE_FIELDS),
      artistsQuery,
      admin.from("shop_settings").select("*").limit(1).maybeSingle()
    ]);

    let expensesRes = expensesFirst;
    if (auth.role !== "designer" && expensesRes.error && missingExpenseExtraColumns(expensesRes.error)) {
      expensesRes = await expensesSelect(EXPENSE_FIELDS_BASE);
    }

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
    const expenseRaw = (expensesRes.data ?? []) as unknown as Record<string, unknown>[];
    const expenses: ExportExpenseRow[] = expenseRaw.map((e) => ({
      expense_date: String(e.expense_date || ""),
      category: String(e.category || ""),
      vendor: e.vendor == null ? null : String(e.vendor),
      amount: Number(e.amount) || 0,
      has_tax_invoice: Boolean(e.has_tax_invoice),
      memo: e.memo == null ? null : String(e.memo),
      payment_method: e.payment_method == null ? null : String(e.payment_method),
      proof_type: e.proof_type == null ? null : String(e.proof_type)
    }));

    const settlements = aggregateSettlements({
      year: range.year,
      month: range.month,
      from: range.from,
      to: range.to,
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

    const generatedAtIso = new Date().toISOString();
    const closeInput = {
      year: range.year,
      month: range.month,
      settings: (settingsRes.data as ShopSettings | null) ?? null,
      sales,
      expenses,
      settlements: {
        artists: settlements.artists,
        summary: settlements.summary
      },
      generatedAtIso
    };
    const format = searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
    const figures = summarizeMonthlyClose(sales, expenses);
    const buffer =
      format === "pdf"
        ? await buildMonthlyClosePdf({
            year: range.year,
            month: range.month,
            settings: closeInput.settings,
            sales,
            expenses,
            artists: settlements.artists,
            summary: settlements.summary,
            generatedAtIso,
            ...figures
          })
        : await buildMonthlyCloseWorkbook(closeInput);

    const filename = monthlyCloseFilename(range.year, range.month, format);
    const encoded = encodeURIComponent(filename);
    const contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const fileKey = `${range.year}-${String(range.month).padStart(2, "0")}`;
    const disposition =
      format === "pdf"
        ? reportDisposition(shopDisplayName(closeInput.settings), "월 마감 자료", fileKey, `close-${fileKey}.pdf`)
        : `attachment; filename="hairup-close.${format}"; filename*=UTF-8''${encoded}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
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
