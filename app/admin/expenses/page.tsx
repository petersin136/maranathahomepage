import { ExpensesQueryError, loadExpensesDashboard } from "@/lib/admin/expenses-load";
import AdminExpensesPage from "./expenses-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function ExpensesPage() {
  try {
    const initial = await loadExpensesDashboard(null, null);
    return <AdminExpensesPage initial={initial} initialError={null} />;
  } catch (e) {
    console.error("[admin/expenses page]", e);
    const message =
      e instanceof ExpensesQueryError
        ? e.message
        : e instanceof Error
          ? e.message
          : "로드 실패";
    return <AdminExpensesPage initial={null} initialError={message} />;
  }
}
