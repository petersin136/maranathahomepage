import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin/auth";
import { loadTaxDashboard } from "@/lib/admin/tax-load";
import AdminTaxPage from "./tax-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function TaxPage() {
  const auth = await requireAdminUser();
  if (!auth.ok) redirect("/admin/login");
  if (auth.role === "designer") redirect("/admin");

  try {
    const initial = await loadTaxDashboard();
    return <AdminTaxPage initial={initial} initialError={null} />;
  } catch (e) {
    console.error("[admin/tax page]", e);
    const message = e instanceof Error ? e.message : "집계에 실패했습니다.";
    return <AdminTaxPage initial={null} initialError={message} />;
  }
}
