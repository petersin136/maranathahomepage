"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

const AUTH_PATHS = [
  "/admin/login",
  "/admin/signup",
  "/admin/find-account",
  "/admin/update-password"
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
