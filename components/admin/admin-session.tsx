"use client";

import { createContext, useContext } from "react";
import type { AdminShellSession } from "@/lib/admin/shell-session";

const AdminSessionContext = createContext<AdminShellSession | null>(null);

export function AdminSessionProvider({
  value,
  children
}: {
  value: AdminShellSession | null;
  children: React.ReactNode;
}) {
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession() {
  return useContext(AdminSessionContext);
}
