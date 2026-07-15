import AdminForgotPasswordForm from "@/components/admin/AdminForgotPasswordForm";

export default function AdminForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hu-black px-6 text-hu-white">
      <p className="font-serif text-[28px] tracking-[0.1em]">HAIR UP</p>
      <p className="mt-2 font-sans-kr text-[13px] text-white/50">비밀번호 찾기</p>
      <div className="mt-12 w-full max-w-[420px] bg-[#faf8f6] px-8 py-10 text-hu-black">
        <AdminForgotPasswordForm />
      </div>
    </div>
  );
}
