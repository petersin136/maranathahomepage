import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

/** 옛 원장 경로 → 매장 손익 */
export default async function OwnerRedirectPage() {
  const auth = await requireAdminUser();
  if (!auth.ok) redirect("/admin/login");
  if (auth.role !== "owner") redirect("/admin");
  redirect("/admin/pnl" as never);
}
