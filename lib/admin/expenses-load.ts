import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildExpenseSummary,
  buildRecurringImportPreview,
  mapExpenseRow,
  previousExpenseMonth,
  resolveExpenseMonth,
  type ExpenseRow,
  type ExpensesDashboard
} from "@/lib/admin/expenses-data";
import { kstDayEndExclusiveIso, kstDayStartIso } from "@/lib/admin/sales-data";

export class ExpensesQueryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const EXPENSE_FIELDS_BASE =
  "id, expense_date, category, amount, vendor, memo, has_tax_invoice, receipt_url, is_recurring, created_at";
export const EXPENSE_FIELDS = `${EXPENSE_FIELDS_BASE}, payment_method, proof_type`;

export function missingExpenseExtraColumns(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  if (error.code === "42703") return true;
  return /payment_method|proof_type/.test(error.message || "");
}

export async function fetchMonthExpenses(
  admin: ReturnType<typeof getSupabaseAdmin>,
  from: string,
  to: string
) {
  const query = (fields: string) =>
    admin
      .from("expenses")
      .select(fields)
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000);

  let { data, error } = await query(EXPENSE_FIELDS);
  if (error && missingExpenseExtraColumns(error)) {
    ({ data, error } = await query(EXPENSE_FIELDS_BASE));
  }
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapExpenseRow);
}

async function fetchMonthRevenue(
  admin: ReturnType<typeof getSupabaseAdmin>,
  from: string,
  to: string
) {
  const { data, error } = await admin
    .from("bookings")
    .select("final_amount")
    .eq("status", "completed")
    .not("final_amount", "is", null)
    .gte("paid_at", kstDayStartIso(from))
    .lt("paid_at", kstDayEndExclusiveIso(to))
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, row) => sum + Number(row.final_amount || 0), 0);
}

export async function loadExpensesDashboard(
  yearRaw: string | null,
  monthRaw: string | null
): Promise<ExpensesDashboard> {
  const month = resolveExpenseMonth(yearRaw, monthRaw);
  if ("error" in month) throw new ExpensesQueryError(month.error, 400);

  const admin = getSupabaseAdmin();
  const prev = previousExpenseMonth(month.year, month.month);
  const [current, previous, monthRevenue] = await Promise.all([
    fetchMonthExpenses(admin, month.from, month.to),
    fetchMonthExpenses(admin, prev.from, prev.to),
    fetchMonthRevenue(admin, month.from, month.to)
  ]);

  const previousRecurring = previous.filter((e: ExpenseRow) => e.is_recurring);

  return {
    year: month.year,
    month: month.month,
    from: month.from,
    to: month.to,
    summary: buildExpenseSummary(current, previous, monthRevenue),
    expenses: current,
    recurringImport: buildRecurringImportPreview({
      targetYear: month.year,
      targetMonth: month.month,
      previousRecurring,
      currentExpenses: current
    })
  };
}
