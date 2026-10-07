import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildExpenseSummary,
  buildRecurringImportPreview,
  previousExpenseMonth,
  resolveExpenseMonth,
  type ExpenseRow,
  type ExpensesDashboard
} from "@/lib/admin/expenses-data";

export class ExpensesQueryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const EXPENSE_FIELDS =
  "id, expense_date, category, amount, vendor, memo, has_tax_invoice, receipt_url, is_recurring, created_at";

export async function fetchMonthExpenses(
  admin: ReturnType<typeof getSupabaseAdmin>,
  from: string,
  to: string
) {
  const { data, error } = await admin
    .from("expenses")
    .select(EXPENSE_FIELDS)
    .gte("expense_date", from)
    .lte("expense_date", to)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseRow[];
}

export async function loadExpensesDashboard(
  yearRaw: string | null,
  monthRaw: string | null
): Promise<ExpensesDashboard> {
  const month = resolveExpenseMonth(yearRaw, monthRaw);
  if ("error" in month) throw new ExpensesQueryError(month.error, 400);

  const admin = getSupabaseAdmin();
  const prev = previousExpenseMonth(month.year, month.month);
  const [current, previous] = await Promise.all([
    fetchMonthExpenses(admin, month.from, month.to),
    fetchMonthExpenses(admin, prev.from, prev.to)
  ]);

  const previousRecurring = previous.filter((e) => e.is_recurring);
  const previousTotal = previous.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return {
    year: month.year,
    month: month.month,
    from: month.from,
    to: month.to,
    summary: buildExpenseSummary(current, previousTotal),
    expenses: current,
    recurringImport: buildRecurringImportPreview({
      targetYear: month.year,
      targetMonth: month.month,
      previousRecurring,
      currentExpenses: current
    })
  };
}
