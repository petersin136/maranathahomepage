import { redirect } from "next/navigation";
import { ExpensesQueryError, loadExpensesDashboard } from "@/lib/admin/expenses-load";
import { requireAdminUser } from "@/lib/admin/auth";
import AdminExpensesPage from "./expenses-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function ExpensesPage() {
  const auth = await requireAdminUser();
  if (!auth.ok) redirect("/admin/login");
  if (auth.role === "designer") redirect("/admin");
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
