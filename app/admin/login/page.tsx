import { Suspense } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hu-black px-6 text-hu-white">
      <p className="font-serif text-[28px] tracking-[0.1em]">HAIR UP</p>
      <p className="mt-2 font-sans-kr text-[13px] text-white/50">관리자 로그인</p>
      <div className="mt-12 w-full max-w-[420px] bg-[#faf8f6] px-8 py-10 text-hu-black">
        <Suspense fallback={<p className="font-sans-kr text-sm">로딩…</p>}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
