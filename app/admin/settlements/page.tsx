import { loadSettlementsDashboard, SettlementsQueryError } from "@/lib/admin/settlements-load";
import AdminSettlementsPage from "./settlements-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function SettlementsPage() {
  try {
    const initial = await loadSettlementsDashboard(null, null);
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
