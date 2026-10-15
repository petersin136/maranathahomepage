import { loadSettlementsDashboard, SettlementsQueryError } from "@/lib/admin/settlements-load";
import { requireAdminUser } from "@/lib/admin/auth";
import AdminSettlementsPage from "./settlements-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function SettlementsPage() {
  const auth = await requireAdminUser();
  try {
    const initial = await loadSettlementsDashboard(null, null);
    if (auth.ok && auth.role === "designer" && auth.artistId) {
      const artists = initial.artists.filter((row) => row.artistId === auth.artistId);
      const summary = {
        totalRevenue: artists.reduce((sum, row) => sum + row.revenue, 0),
        totalIncentive: artists.reduce((sum, row) => sum + (row.incentive ?? 0), 0),
        totalWithholding: artists.reduce((sum, row) => sum + (row.withholding ?? 0), 0),
        totalNetPay: artists.reduce((sum, row) => sum + (row.netPay ?? 0), 0)
      };
      return <AdminSettlementsPage initial={{ ...initial, artists, summary }} initialError={null} />;
    }
    return <AdminSettlementsPage initial={initial} initialError={null} />;
  } catch (e) {
    console.error("[admin/settlements page]", e);
    const message =
      e instanceof SettlementsQueryError
        ? e.message
        : e instanceof Error
          ? e.message
          : "정산 집계에 실패했습니다.";
    return <AdminSettlementsPage initial={null} initialError={message} />;
  }
}
