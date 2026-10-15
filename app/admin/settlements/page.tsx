import { redirect } from "next/navigation";
import { loadSettlementsView, SettlementsQueryError } from "@/lib/admin/settlements-load";
import { requireAdminUser } from "@/lib/admin/auth";
import AdminSettlementsPage from "./settlements-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function SettlementsPage() {
  const auth = await requireAdminUser();
  if (auth.ok && auth.role === "designer" && !auth.artistId) redirect("/admin");
  try {
    const initial = await loadSettlementsView({
      yearRaw: null,
      monthRaw: null,
      role: auth.ok ? auth.role : "owner",
      artistId: auth.ok ? auth.artistId : null
    });
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
