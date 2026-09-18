"use client";

import { Suspense } from "react";
import MobileAdminLogin from "@/components/admin/MobileAdminLogin";
import { useAdminViewport } from "@/lib/admin/use-admin-viewport";

export default function AdminLoginPage() {
  const mode = useAdminViewport();

  if (mode === null) {
    return <div className="min-h-dvh bg-white" aria-hidden />;
  }

  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" aria-hidden />}>
      <MobileAdminLogin layout={mode} />
    </Suspense>
  );
}
