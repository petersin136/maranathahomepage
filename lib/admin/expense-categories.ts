export const EXPENSE_CATEGORIES = [
  { value: "material", label: "재료비" },
  { value: "rent", label: "임차료" },
  { value: "maintenance", label: "관리비" },
  { value: "utility", label: "공과금" },
  { value: "labor", label: "인건비" },
  { value: "advertising", label: "광고선전비" },
  { value: "supplies", label: "소모품비" },
  { value: "fee", label: "지급수수료" },
  { value: "education", label: "교육비" },
  { value: "other", label: "기타" }
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];

export const EXPENSE_CATEGORY_VALUES: ExpenseCategory[] = EXPENSE_CATEGORIES.map(
  (c) => c.value
);

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> =
  Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label])) as Record<
    ExpenseCategory,
    string
  >;

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORY_VALUES as string[]).includes(value);
}

export function expenseCategoryLabel(value: string) {
  return isExpenseCategory(value) ? EXPENSE_CATEGORY_LABEL[value] : value;
}
