import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import { normalizeExpenseInput, resolveExpenseMonth } from "@/lib/admin/expenses-data";
import { ExpensesQueryError, loadExpensesDashboard } from "@/lib/admin/expenses-load";

export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  try {
    const data = await loadExpensesDashboard(searchParams.get("year"), searchParams.get("month"));
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    if (e instanceof ExpensesQueryError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/expenses GET]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "로드 실패" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  if (body.action === "import_recurring") {
    const month = resolveExpenseMonth(
      body.year != null ? String(body.year) : null,
      body.month != null ? String(body.month) : null
    );
    if ("error" in month) {
      return NextResponse.json({ ok: false, error: month.error }, { status: 400 });
    }

    try {
      const prev = previousExpenseMonth(month.year, month.month);
      const [current, previous] = await Promise.all([
        fetchMonthExpenses(admin, month.from, month.to),
        fetchMonthExpenses(admin, prev.from, prev.to)
      ]);
      const preview = buildRecurringImportPreview({
        targetYear: month.year,
        targetMonth: month.month,
        previousRecurring: previous.filter((e) => e.is_recurring),
        currentExpenses: current
      });

      if (preview.candidates.length === 0) {
        return NextResponse.json({
          ok: true,
          created: 0,
          skipped: preview.skipped,
          expenses: []
        });
      }

      const rows = preview.candidates.map((c) => ({
        expense_date: c.expense_date,
        category: c.category,
        amount: c.amount,
        vendor: c.vendor,
        memo: c.memo,
        has_tax_invoice: c.has_tax_invoice,
        is_recurring: true,
        receipt_url: null
      }));

      const { data, error } = await admin.from("expenses").insert(rows).select(FIELDS);
      if (error) throw new Error(error.message);

      return NextResponse.json({
        ok: true,
        created: data?.length ?? 0,
        skipped: preview.skipped,
        expenses: data ?? []
      });
    } catch (e) {
      console.error("[admin/expenses import_recurring]", e);
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "가져오기에 실패했습니다." },
        { status: 500 }
      );
    }
  }

  const normalized = normalizeExpenseInput(body as never);
  if ("error" in normalized) {
    return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });
  }

  try {
    const { data, error } = await admin
      .from("expenses")
      .insert(normalized)
      .select(FIELDS)
      .single();
    if (error || !data) throw new Error(error?.message || "등록에 실패했습니다.");
    return NextResponse.json({ ok: true, expense: data });
  } catch (e) {
    console.error("[admin/expenses POST]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
