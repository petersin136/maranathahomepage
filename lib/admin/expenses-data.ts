import {
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  isExpenseCategory,
  type ExpenseCategory
} from "@/lib/admin/expense-categories";
import { isYmd, todayKst } from "@/lib/admin/sales-data";

export type ExpenseRow = {
  id: string;
  expense_date: string;
  category: ExpenseCategory | string;
  amount: number;
  vendor: string | null;
  memo: string | null;
  has_tax_invoice: boolean;
  receipt_url: string | null;
  is_recurring: boolean;
  created_at: string;
};

export type ExpenseCategoryShare = {
  category: string;
  label: string;
  amount: number;
  count: number;
  share: number;
};

export type ExpenseSummary = {
  totalAmount: number;
  prevTotalAmount: number;
  changeAmount: number;
  changeRate: number | null;
  withProofAmount: number;
  withoutProofAmount: number;
  categories: ExpenseCategoryShare[];
};

export type RecurringImportPreview = {
  available: number;
  skipped: number;
  candidates: {
    expense_date: string;
    category: string;
    amount: number;
    vendor: string | null;
    memo: string | null;
    has_tax_invoice: boolean;
  }[];
};

export type ExpensesDashboard = {
  year: number;
  month: number;
  from: string;
  to: string;
  summary: ExpenseSummary;
  expenses: ExpenseRow[];
  recurringImport: RecurringImportPreview;
};

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function formatYmd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function monthEnd(y: number, m: number) {
  return formatYmd(y, m, daysInMonth(y, m));
}

function shiftYearMonth(year: number, month: number, delta: number) {
  const dt = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1 };
}

export function resolveExpenseMonth(
  yearRaw: string | null,
  monthRaw: string | null
): { year: number; month: number; from: string; to: string } | { error: string } {
  const today = todayKst();
  const { y: ty, m: tm } = parseYmd(today);
  let year = ty;
  let month = tm;

  if (yearRaw != null || monthRaw != null) {
    const y = Number(yearRaw);
    const m = Number(monthRaw);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      return { error: "년/월이 올바르지 않습니다." };
    }
    year = y;
    month = m;
  }

  const from = formatYmd(year, month, 1);
  const to = monthEnd(year, month);
  if (!isYmd(from) || !isYmd(to)) {
    return { error: "조회 기간이 올바르지 않습니다." };
  }
  return { year, month, from, to };
}

export function previousExpenseMonth(year: number, month: number) {
  const prev = shiftYearMonth(year, month, -1);
  return {
    year: prev.year,
    month: prev.month,
    from: formatYmd(prev.year, prev.month, 1),
    to: monthEnd(prev.year, prev.month)
  };
}

/** 카테고리 + 거래처 조합 키 (중복 방지용). 거래처는 trim 후 소문자. */
export function expenseDedupeKey(category: string, vendor: string | null | undefined) {
  return `${category}::${(vendor || "").trim().toLowerCase()}`;
}

export function mapRecurringDateToMonth(
  sourceDate: string,
  targetYear: number,
  targetMonth: number
) {
  const { d } = parseYmd(sourceDate);
  const capped = Math.min(d, daysInMonth(targetYear, targetMonth));
  return formatYmd(targetYear, targetMonth, capped);
}

function changeRate(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function buildExpenseSummary(
  current: ExpenseRow[],
  previousTotal: number
): ExpenseSummary {
  const totalAmount = current.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const withProofAmount = current
    .filter((e) => e.has_tax_invoice)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const withoutProofAmount = totalAmount - withProofAmount;

  const byCategory = new Map<string, { amount: number; count: number }>();
  for (const e of current) {
    const key = e.category || "other";
    const cur = byCategory.get(key) ?? { amount: 0, count: 0 };
    cur.amount += Number(e.amount || 0);
    cur.count += 1;
    byCategory.set(key, cur);
  }

  const categories: ExpenseCategoryShare[] = EXPENSE_CATEGORIES.map((c) => {
    const cur = byCategory.get(c.value) ?? { amount: 0, count: 0 };
    return {
      category: c.value,
      label: c.label,
      amount: cur.amount,
      count: cur.count,
      share: totalAmount > 0 ? (cur.amount / totalAmount) * 100 : 0
    };
  })
    .filter((c) => c.amount > 0 || c.count > 0)
    .sort((a, b) => b.amount - a.amount);

  // 알 수 없는 카테고리도 표시
  for (const [key, cur] of byCategory) {
    if (isExpenseCategory(key)) continue;
    categories.push({
      category: key,
      label: expenseCategoryLabel(key),
      amount: cur.amount,
      count: cur.count,
      share: totalAmount > 0 ? (cur.amount / totalAmount) * 100 : 0
    });
  }
  categories.sort((a, b) => b.amount - a.amount);

  return {
    totalAmount,
    prevTotalAmount: previousTotal,
    changeAmount: totalAmount - previousTotal,
    changeRate: changeRate(totalAmount, previousTotal),
    withProofAmount,
    withoutProofAmount,
    categories
  };
}

export function buildRecurringImportPreview(args: {
  targetYear: number;
  targetMonth: number;
  previousRecurring: ExpenseRow[];
  currentExpenses: ExpenseRow[];
}): RecurringImportPreview {
  const existing = new Set(
    args.currentExpenses.map((e) => expenseDedupeKey(e.category, e.vendor))
  );
  const candidates: RecurringImportPreview["candidates"] = [];
  let skipped = 0;

  for (const row of args.previousRecurring) {
    const key = expenseDedupeKey(row.category, row.vendor);
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    existing.add(key);
    candidates.push({
      expense_date: mapRecurringDateToMonth(
        row.expense_date,
        args.targetYear,
        args.targetMonth
      ),
      category: row.category,
      amount: Number(row.amount || 0),
      vendor: row.vendor,
      memo: row.memo,
      has_tax_invoice: Boolean(row.has_tax_invoice)
    });
  }

  return {
    available: candidates.length,
    skipped,
    candidates
  };
}

export function normalizeExpenseInput(body: {
  expense_date?: string;
  category?: string;
  amount?: number | string;
  vendor?: string | null;
  memo?: string | null;
  has_tax_invoice?: boolean;
  is_recurring?: boolean;
}):
  | {
      expense_date: string;
      category: ExpenseCategory;
      amount: number;
      vendor: string | null;
      memo: string | null;
      has_tax_invoice: boolean;
      is_recurring: boolean;
      receipt_url: null;
    }
  | { error: string } {
  const expense_date = (body.expense_date || "").trim();
  if (!isYmd(expense_date)) return { error: "날짜가 올바르지 않습니다." };

  const category = (body.category || "").trim();
  if (!isExpenseCategory(category)) return { error: "카테고리가 올바르지 않습니다." };

  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "금액이 올바르지 않습니다." };
  }

  const vendorRaw = body.vendor == null ? "" : String(body.vendor).trim();
  const memoRaw = body.memo == null ? "" : String(body.memo).trim();

  return {
    expense_date,
    category,
    amount,
    vendor: vendorRaw || null,
    memo: memoRaw || null,
    has_tax_invoice: Boolean(body.has_tax_invoice),
    is_recurring: Boolean(body.is_recurring),
    receipt_url: null
  };
}
