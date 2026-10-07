import { loadSalesDashboard, SalesQueryError } from "@/lib/admin/sales-load";
import AdminSalesPage from "./sales-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function SalesPage() {
  try {
    const initial = await loadSalesDashboard("this_month");
    return <AdminSalesPage initial={initial} initialError={null} />;
  } catch (e) {
    console.error("[admin/sales page]", e);
    const message =
      e instanceof SalesQueryError
        ? e.message
        : e instanceof Error
          ? e.message
          : "집계에 실패했습니다.";
    return <AdminSalesPage initial={null} initialError={message} />;
  }
}
