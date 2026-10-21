import { redirect } from "next/navigation";
import { loadOwnerPnlView, OwnerPnlQueryError } from "@/lib/admin/owner-load";
import { requireAdminUser } from "@/lib/admin/auth";
import AdminOwnerPage from "./owner-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function StorePnlPage() {
  const auth = await requireAdminUser();
  if (!auth.ok) redirect("/admin/login");
  if (auth.role !== "owner") redirect("/admin");
  try {
    const initial = await loadOwnerPnlView();
    return <AdminOwnerPage initial={initial} initialError={null} />;
  } catch (e) {
    console.error("[admin/pnl page]", e);
    const message =
      e instanceof OwnerPnlQueryError
        ? e.message
        : e instanceof Error
          ? e.message
          : "매장 손익 집계에 실패했습니다.";
    return <AdminOwnerPage initial={null} initialError={message} />;
  }
}
