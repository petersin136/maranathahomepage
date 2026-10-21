import {
  EXPENSE_CATEGORIES,
  EXPENSE_NATURES,
  EXPENSE_PROOF_BUCKETS,
  EXPENSE_SHARE_GROUPS,
  expenseCategoryLabel,
  expenseNatureKey,
  expenseProofBucket,
  expenseShareGroupKey,
  isExpenseCategory,
  isExpensePaymentMethod,
  isExpenseProofType,
  isMissingExpenseProof,
  normalizeExpenseCategory,
  parseExpenseCategory,
  resolveExpenseProofType,
  type ExpenseCategory,
  type ExpensePaymentMethod,
  type ExpenseProofType
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
  payment_method: ExpensePaymentMethod | null;
  proof_type: ExpenseProofType;
  created_at: string;
};

export type ExpenseCategoryShare = {
  category: string;
  label: string;
  amount: number;
  count: number;
  share: number;
};

export type ExpenseNatureShare = {
  key: string;
  label: string;
  amount: number;
  share: number;
  tone: string;
};

export type ExpenseShareGroup = {
  key: string;
  label: string;
  amount: number;
  count: number;
  share: number;
  tone: string;
};

export type ExpenseProofShare = {
  key: string;
  label: string;
  amount: number;
  share: number;
  tone: string;
};

export type ExpenseSummary = {
  totalAmount: number;
  prevTotalAmount: number;
  changeAmount: number;
  changeRate: number | null;
  materialAmount: number;
  prevMaterialAmount: number;
  fixedAmount: number;
  withProofAmount: number;
  withoutProofAmount: number;
  withoutProofCount: number;
  monthRevenue: number;
  categories: ExpenseCategoryShare[];
  natures: ExpenseNatureShare[];
  shareGroups: ExpenseShareGroup[];
  proofs: ExpenseProofShare[];
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
    payment_method: ExpensePaymentMethod | null;
    proof_type: ExpenseProofType;
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
  return `${normalizeExpenseCategory(category)}::${(vendor || "").trim().toLowerCase()}`;
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

export function mapExpenseRow(raw: Record<string, unknown>): ExpenseRow {
  const proof = resolveExpenseProofType({
    proof_type: raw.proof_type == null ? null : String(raw.proof_type),
    has_tax_invoice: Boolean(raw.has_tax_invoice)
  });
  const paymentRaw = raw.payment_method == null ? "" : String(raw.payment_method);
  return {
    id: String(raw.id || ""),
    expense_date: String(raw.expense_date || ""),
    category: normalizeExpenseCategory(String(raw.category || "other")),
    amount: Number(raw.amount || 0),
    vendor: raw.vendor == null ? null : String(raw.vendor),
    memo: raw.memo == null ? null : String(raw.memo),
    has_tax_invoice: proof === "tax_invoice",
    receipt_url: raw.receipt_url == null ? null : String(raw.receipt_url),
    is_recurring: Boolean(raw.is_recurring),
    payment_method: isExpensePaymentMethod(paymentRaw) ? paymentRaw : null,
    proof_type: proof,
    created_at: String(raw.created_at || "")
  };
}

export function remainderPercents(amounts: number[]): number[] {
  const total = amounts.reduce((sum, value) => sum + value, 0);
  if (total === 0) return amounts.map(() => 0);
  const shares = amounts.map((value) => (value / total) * 100);
  const floors = shares.map((share) => Math.floor(share));
  let rest = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = shares
    .map((share, index) => ({
      index,
      frac: share - Math.floor(share),
      amount: amounts[index]
    }))
    .sort((a, b) => b.frac - a.frac || b.amount - a.amount);
  const percents = floors.slice();
  for (const item of order) {
    if (rest <= 0) break;
    percents[item.index] += 1;
    rest -= 1;
  }
  return percents;
}

function sumBy(rows: ExpenseRow[], pred: (row: ExpenseRow) => boolean) {
  return rows.reduce((sum, row) => (pred(row) ? sum + Number(row.amount || 0) : sum), 0);
}

export function buildExpenseSummary(
  current: ExpenseRow[],
  previous: ExpenseRow[],
  monthRevenue: number
): ExpenseSummary {
  const totalAmount = current.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const prevTotalAmount = previous.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const materialAmount = sumBy(current, (e) => expenseNatureKey(e.category) === "material");
  const prevMaterialAmount = sumBy(previous, (e) => expenseNatureKey(e.category) === "material");
  const fixedAmount = sumBy(current, (e) => expenseNatureKey(e.category) === "fixed");
  const withProofAmount = sumBy(current, (e) => !isMissingExpenseProof(e.proof_type));
  const withoutProofAmount = totalAmount - withProofAmount;
  const withoutProofCount = current.filter((e) => isMissingExpenseProof(e.proof_type)).length;

  const byCategory = new Map<string, { amount: number; count: number }>();
  for (const e of current) {
    const key = normalizeExpenseCategory(String(e.category || "other"));
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

  const natures: ExpenseNatureShare[] = EXPENSE_NATURES.map((n) => {
    const amount = sumBy(current, (e) => expenseNatureKey(e.category) === n.key);
    return {
      key: n.key,
      label: n.label,
      amount,
      share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      tone: n.tone
    };
  });

  const shareGroups: ExpenseShareGroup[] = EXPENSE_SHARE_GROUPS.map((g) => {
    const rows = current.filter((e) => expenseShareGroupKey(e.category) === g.key);
    const amount = rows.reduce((sum, row) => sum + row.amount, 0);
    return {
      key: g.key,
      label: g.label,
      amount,
      count: rows.length,
      share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      tone: g.tone
    };
  });

  const proofs: ExpenseProofShare[] = EXPENSE_PROOF_BUCKETS.map((b) => {
    const amount = sumBy(current, (e) => expenseProofBucket(e.proof_type) === b.key);
    return {
      key: b.key,
      label: b.label,
      amount,
      share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      tone: b.tone
    };
  });

  return {
    totalAmount,
    prevTotalAmount,
    changeAmount: totalAmount - prevTotalAmount,
    changeRate: changeRate(totalAmount, prevTotalAmount),
    materialAmount,
    prevMaterialAmount,
    fixedAmount,
    withProofAmount,
    withoutProofAmount,
    withoutProofCount,
    monthRevenue,
    categories,
    natures,
    shareGroups,
    proofs
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
    const proof = resolveExpenseProofType(row);
    candidates.push({
      expense_date: mapRecurringDateToMonth(row.expense_date, args.targetYear, args.targetMonth),
      category: normalizeExpenseCategory(String(row.category || "other")),
      amount: Number(row.amount || 0),
      vendor: row.vendor,
      memo: row.memo,
      has_tax_invoice: proof === "tax_invoice",
      payment_method: row.payment_method,
      proof_type: proof
    });
  }

  return {
    available: candidates.length,
    skipped,
    candidates
  };
}

export type NormalizedExpenseInput = {
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string | null;
  memo: string | null;
  has_tax_invoice: boolean;
  is_recurring: boolean;
  payment_method: ExpensePaymentMethod | null;
  proof_type: ExpenseProofType;
  receipt_url: null;
};

export function normalizeExpenseInput(body: {
  expense_date?: string;
  category?: string;
  amount?: number | string;
  vendor?: string | null;
  memo?: string | null;
  has_tax_invoice?: boolean;
  is_recurring?: boolean;
  payment_method?: string | null;
  proof_type?: string | null;
}): NormalizedExpenseInput | { error: string } {
  const expense_date = (body.expense_date || "").trim();
  if (!isYmd(expense_date)) return { error: "날짜가 올바르지 않습니다." };

  const category = parseExpenseCategory((body.category || "").trim());
  if (!category) return { error: "카테고리가 올바르지 않습니다." };

  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "금액이 올바르지 않습니다." };
  }

  const vendorRaw = body.vendor == null ? "" : String(body.vendor).trim();
  const memoRaw = body.memo == null ? "" : String(body.memo).trim();

  const paymentRaw = body.payment_method == null ? "" : String(body.payment_method).trim();
  const payment_method = paymentRaw === "" ? null : isExpensePaymentMethod(paymentRaw) ? paymentRaw : null;
  if (paymentRaw && !payment_method) return { error: "결제 수단이 올바르지 않습니다." };

  const proofRaw = body.proof_type == null ? "" : String(body.proof_type).trim();
  let proof_type: ExpenseProofType;
  if (proofRaw) {
    if (!isExpenseProofType(proofRaw)) return { error: "증빙 상태가 올바르지 않습니다." };
    proof_type = proofRaw;
  } else {
    proof_type = body.has_tax_invoice ? "tax_invoice" : "none";
  }

  return {
    expense_date,
    category,
    amount,
    vendor: vendorRaw || null,
    memo: memoRaw || null,
    has_tax_invoice: proof_type === "tax_invoice",
    is_recurring: Boolean(body.is_recurring),
    payment_method,
    proof_type,
    receipt_url: null
  };
}

export function expenseInsertRow(input: NormalizedExpenseInput, extras: boolean) {
  const base = {
    expense_date: input.expense_date,
    category: input.category,
    amount: input.amount,
    vendor: input.vendor,
    memo: input.memo,
    has_tax_invoice: input.has_tax_invoice,
    is_recurring: input.is_recurring,
    receipt_url: input.receipt_url
  };
  if (!extras) return base;
  return {
    ...base,
    payment_method: input.payment_method,
    proof_type: input.proof_type
  };
}
