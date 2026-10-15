import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import {
  buildRecurringImportPreview,
  expenseInsertRow,
  normalizeExpenseInput,
  previousExpenseMonth,
  resolveExpenseMonth
} from "@/lib/admin/expenses-data";
import {
  EXPENSE_FIELDS,
  EXPENSE_FIELDS_BASE,
  ExpensesQueryError,
  fetchMonthExpenses,
  loadExpensesDashboard,
  missingExpenseExtraColumns
} from "@/lib/admin/expenses-load";

export const preferredRegion = "icn1";

function rejectDesigner(role: string) {
  if (role !== "designer") return null;
  return NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
}

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  const denied = rejectDesigner(auth.role);
  if (denied) return denied;

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

async function insertExpenses(
  admin: ReturnType<typeof getSupabaseAdmin>,
  rows: Record<string, unknown>[],
  single: boolean
) {
  const run = (fields: string, payload: Record<string, unknown>[]) => {
    const q = admin.from("expenses").insert(payload).select(fields);
    return single ? q.single() : q;
  };

  let { data, error } = await run(EXPENSE_FIELDS, rows);
  if (error && missingExpenseExtraColumns(error)) {
    const stripped = rows.map((row) => {
      const next = { ...row };
      delete next.payment_method;
      delete next.proof_type;
      return next;
    });
    ({ data, error } = await run(EXPENSE_FIELDS_BASE, stripped));
  }
  if (error || !data) throw new Error(error?.message || "등록에 실패했습니다.");
  return data;
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;
  const denied = rejectDesigner(auth.role);
  if (denied) return denied;

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

      const rows = preview.candidates.map((c) =>
        expenseInsertRow(
          {
            expense_date: c.expense_date,
            category: c.category as never,
            amount: c.amount,
            vendor: c.vendor,
            memo: c.memo,
            has_tax_invoice: c.has_tax_invoice,
            is_recurring: true,
            payment_method: c.payment_method,
            proof_type: c.proof_type,
            receipt_url: null
          },
          true
        )
      );

      const data = await insertExpenses(admin, rows, false);
      const list = Array.isArray(data) ? data : [data];
      return NextResponse.json({
        ok: true,
        created: list.length,
        skipped: preview.skipped,
        expenses: list
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
    const data = await insertExpenses(admin, [expenseInsertRow(normalized, true)], true);
    return NextResponse.json({ ok: true, expense: data });
  } catch (e) {
    console.error("[admin/expenses POST]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
