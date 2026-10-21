import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin/auth";
import AdminInventoryPage from "./inventory-client";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export default async function InventoryPage() {
  const auth = await requireAdminUser();
  if (!auth.ok) redirect("/admin/login");
  if (auth.role !== "owner") redirect("/admin");
  return <AdminInventoryPage />;
}
