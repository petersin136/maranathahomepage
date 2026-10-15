import { headers } from "next/headers";
import AdminLayoutClient from "./admin-layout-client";
import { getAdminShellSession } from "@/lib/admin/auth";
import { getPendingBookings, getPendingCount } from "@/lib/admin/dashboard-data";
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
  if (!isAuthPage && pathname.startsWith("/admin")) {
    try {
      pendingCount =
        pathname === "/admin"
          ? (await getPendingBookings()).length
          : await getPendingCount();
    } catch (e) {
      console.error("[admin layout] pending count", e);
    }
    try {
      session = await getAdminShellSession();
    } catch (e) {
      console.error("[admin layout] session", e);
    }
  }

  return (
    <AdminLayoutClient pendingCount={pendingCount} session={session}>
      {children}
    </AdminLayoutClient>
  );
}
