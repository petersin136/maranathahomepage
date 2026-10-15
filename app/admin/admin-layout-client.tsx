"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { AdminSessionProvider } from "@/components/admin/admin-session";
import { PendingCountProvider } from "@/components/admin/pending-count";
import type { AdminShellSession } from "@/lib/admin/shell-session";

const AUTH_PATHS = [
  "/admin/login",
  "/admin/signup",
  "/admin/find-account",
  "/admin/update-password"
];

export default function AdminLayoutClient({
  pendingCount,
  session,
  children
}: {
  pendingCount: number | null;
  session: AdminShellSession | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <PendingCountProvider initialCount={pendingCount}>
      <AdminSessionProvider value={session}>
        <AdminShell session={session}>{children}</AdminShell>
      </AdminSessionProvider>
    </PendingCountProvider>
  );
}
