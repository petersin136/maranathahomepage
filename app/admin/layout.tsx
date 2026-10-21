import { headers } from "next/headers";
import AdminLayoutClient from "./admin-layout-client";
import { getAdminShellSession } from "@/lib/admin/auth";
import { getPendingCount } from "@/lib/admin/dashboard-data";
import { getSidebarSalonName } from "@/lib/admin/salon-name";
import type { AdminShellSession } from "@/lib/admin/shell-session";

const AUTH_PATHS = [
  "/admin/login",
  "/admin/signup",
  "/admin/find-account",
  "/admin/update-password"
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") || "";
  const isAuthPage = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  let pendingCount: number | null = null;
  let session: AdminShellSession | null = null;
  let salonName: string | null = null;
  if (!isAuthPage && pathname.startsWith("/admin")) {
    const [pendingResult, sessionResult, salonResult] = await Promise.all([
      getPendingCount().catch((e) => {
        console.error("[admin layout] pending count", e);
        return null;
      }),
      getAdminShellSession().catch((e) => {
        console.error("[admin layout] session", e);
        return null;
      }),
      getSidebarSalonName()
    ]);
    pendingCount = pendingResult;
    session = sessionResult;
    salonName = salonResult;
  }

  return (
    <AdminLayoutClient pendingCount={pendingCount} session={session} salonName={salonName}>
      {children}
    </AdminLayoutClient>
  );
}
