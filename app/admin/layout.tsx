import { headers } from "next/headers";
import AdminLayoutClient from "./admin-layout-client";
import { getPendingBookings, getPendingCount } from "@/lib/admin/dashboard-data";

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
  if (!isAuthPage && pathname.startsWith("/admin")) {
    try {
      pendingCount =
        pathname === "/admin"
          ? (await getPendingBookings()).length
          : await getPendingCount();
    } catch (e) {
      console.error("[admin layout] pending count", e);
    }
  }

  return <AdminLayoutClient pendingCount={pendingCount}>{children}</AdminLayoutClient>;
}
