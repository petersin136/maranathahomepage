"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { PendingCountProvider } from "@/components/admin/pending-count";

const AUTH_PATHS = [
  "/admin/login",
  "/admin/signup",
  "/admin/find-account",
  "/admin/update-password"
];

export default function AdminLayoutClient({
  pendingCount,
  children
}: {
  pendingCount: number | null;
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
      <AdminShell>{children}</AdminShell>
    </PendingCountProvider>
  );
}
