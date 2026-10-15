import { loadSalesDashboard, SalesQueryError } from "@/lib/admin/sales-load";
import { requireAdminUser } from "@/lib/admin/auth";
import AdminSalesPage from "./sales-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function SalesPage() {
  const auth = await requireAdminUser();
  const artistIds = auth.ok && auth.role === "designer" && auth.artistId ? [auth.artistId] : [];
  try {
    const initial = await loadSalesDashboard("this_month", null, null, artistIds);
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
