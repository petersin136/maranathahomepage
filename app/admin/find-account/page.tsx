"use client";

import AdminFindAccountScreen from "@/components/admin/AdminFindAccountScreen";
import { useAdminViewport } from "@/lib/admin/use-admin-viewport";

export default function AdminFindAccountPage() {
  const mode = useAdminViewport();

  if (mode === null) {
    return <div className="min-h-dvh bg-white" aria-hidden />;
  }

  return <AdminFindAccountScreen layout={mode} />;
}
