export const EXPENSE_CATEGORIES = [
  { value: "material", label: "재료·약제비" },
  { value: "occupancy", label: "매장 임차·관리비" },
  { value: "rental", label: "렌탈·유지비" },
  { value: "supplies", label: "소모품·운영비" },
  { value: "marketing", label: "마케팅·광고비" },
  { value: "other", label: "기타" }
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];

export const EXPENSE_CATEGORY_VALUES: ExpenseCategory[] = EXPENSE_CATEGORIES.map((c) => c.value);

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
) as Record<ExpenseCategory, string>;

/** 예전 10종 회계코드 → 지침 6종. */
const LEGACY_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  material: "material",
  rent: "occupancy",
  maintenance: "occupancy",
  utility: "occupancy",
  occupancy: "occupancy",
  rental: "rental",
  supplies: "supplies",
  advertising: "marketing",
  marketing: "marketing",
  labor: "other",
  fee: "other",
  education: "other",
  other: "other"
};

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORY_VALUES as string[]).includes(value);
}

export function normalizeExpenseCategory(value: string): ExpenseCategory {
  return LEGACY_CATEGORY_MAP[value] ?? (isExpenseCategory(value) ? value : "other");
}

export function parseExpenseCategory(value: string): ExpenseCategory | null {
  if (!value) return null;
  if (isExpenseCategory(value)) return value;
  return LEGACY_CATEGORY_MAP[value] ?? null;
}

export function expenseCategoryLabel(value: string) {
  return EXPENSE_CATEGORY_LABEL[normalizeExpenseCategory(value)];
}

export const EXPENSE_NATURES = [
  { key: "fixed", label: "고정비", categories: ["occupancy", "rental"] as const, tone: "var(--accent)" },
  { key: "material", label: "재료·약제비", categories: ["material"] as const, tone: "var(--muted)" },
  { key: "operating", label: "운영·소모품비", categories: ["supplies", "marketing", "other"] as const, tone: "var(--label)" }
] as const;

export type ExpenseNatureKey = (typeof EXPENSE_NATURES)[number]["key"];

export function expenseNatureKey(category: string): ExpenseNatureKey {
  const normalized = normalizeExpenseCategory(category);
  if (normalized === "occupancy" || normalized === "rental") return "fixed";
  if (normalized === "material") return "material";
  return "operating";
}

/** 지출 탭 「지출 성격별 비중」 전용 5묶음. 손익 natureAmount/EXPENSE_NATURES 와 별개. */
export const EXPENSE_SHARE_GROUPS = [
  { key: "occupancy", label: "매장 임차·관리비", categories: ["occupancy"] as const, tone: "var(--accent)" },
  { key: "material", label: "재료·약제비", categories: ["material"] as const, tone: "var(--muted)" },
  { key: "supplies", label: "소모품·운영비", categories: ["supplies"] as const, tone: "var(--label)" },
  { key: "marketing", label: "마케팅·광고비", categories: ["marketing"] as const, tone: "var(--ink)" },
  { key: "rental_other", label: "렌탈 및 기타", categories: ["rental", "other"] as const, tone: "var(--muted)" }
] as const;

export type ExpenseShareGroupKey = (typeof EXPENSE_SHARE_GROUPS)[number]["key"];

export function expenseShareGroupKey(category: string): ExpenseShareGroupKey {
  const normalized = normalizeExpenseCategory(category);
  if (normalized === "occupancy") return "occupancy";
  if (normalized === "material") return "material";
  if (normalized === "supplies") return "supplies";
  if (normalized === "marketing") return "marketing";
  return "rental_other";
}

export const EXPENSE_PAYMENT_METHODS = [
  { value: "card", label: "카드" },
  { value: "cash", label: "현금" },
  { value: "transfer", label: "계좌이체" }
] as const;

export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number]["value"];

export function isExpensePaymentMethod(value: string): value is ExpensePaymentMethod {
  return EXPENSE_PAYMENT_METHODS.some((m) => m.value === value);
}

export function expensePaymentLabel(value: string | null | undefined) {
  if (!value || !isExpensePaymentMethod(value)) return "—";
  return EXPENSE_PAYMENT_METHODS.find((m) => m.value === value)!.label;
}

export const EXPENSE_PROOF_TYPES = [
  { value: "tax_invoice", label: "세금계산서" },
  { value: "corporate_card", label: "사업자카드" },
  { value: "simple_receipt", label: "간이영수증" },
  { value: "none", label: "미증빙" }
] as const;

export type ExpenseProofType = (typeof EXPENSE_PROOF_TYPES)[number]["value"];

export function isExpenseProofType(value: string): value is ExpenseProofType {
  return EXPENSE_PROOF_TYPES.some((p) => p.value === value);
}

export const EXPENSE_PROOF_BUCKETS = [
  { key: "tax_invoice", label: "세금계산서", tone: "var(--accent)" },
  { key: "corporate_card", label: "사업자카드", tone: "var(--muted)" },
  { key: "other", label: "간이영수증·기타", tone: "var(--label)" }
] as const;

export type ExpenseProofBucket = (typeof EXPENSE_PROOF_BUCKETS)[number]["key"];

export function resolveExpenseProofType(args: {
  proof_type?: string | null;
  has_tax_invoice?: boolean | null;
}): ExpenseProofType {
  const raw = (args.proof_type || "").trim();
  if (isExpenseProofType(raw)) return raw;
  return args.has_tax_invoice ? "tax_invoice" : "none";
}

export function expenseProofLabel(value: ExpenseProofType) {
  return EXPENSE_PROOF_TYPES.find((p) => p.value === value)!.label;
}

export function expenseProofBucket(proof: ExpenseProofType): ExpenseProofBucket {
  if (proof === "tax_invoice") return "tax_invoice";
  if (proof === "corporate_card") return "corporate_card";
  return "other";
}

export function isMissingExpenseProof(proof: ExpenseProofType) {
  return proof === "none";
}
