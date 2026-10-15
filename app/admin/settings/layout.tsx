import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin/auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdminUser();
  if (!auth.ok) redirect("/admin/login");
  if (auth.role === "designer") redirect("/admin");
  return children;
}
