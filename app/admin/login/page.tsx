"use client";

import { Suspense, useEffect, useState } from "react";
import AdminAuthFrame from "@/components/admin/AdminAuthFrame";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import MobileAdminLogin from "@/components/admin/MobileAdminLogin";

const DESKTOP_MQ = "(min-width: 1440px)";

export default function AdminLoginPage() {
  const [mode, setMode] = useState<"mobile" | "desktop" | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => setMode(mq.matches ? "desktop" : "mobile");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (mode === null) {
    return <div className="min-h-dvh bg-white" aria-hidden />;
  }

  if (mode === "desktop") {
    return (
      <AdminAuthFrame
        title="LOGIN"
        subtitle="직원 전용 관리자 로그인입니다. 원장이 발급한 이메일로 접속해 주세요."
      >
        <Suspense fallback={<p className="font-sans-kr text-[13px] text-hu-muted">불러오는 중…</p>}>
          <AdminLoginForm />
        </Suspense>
      </AdminAuthFrame>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" aria-hidden />}>
      <MobileAdminLogin />
    </Suspense>
  );
}
