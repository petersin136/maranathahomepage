import { Suspense } from "react";
import AdminAuthFrame from "@/components/admin/AdminAuthFrame";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
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
