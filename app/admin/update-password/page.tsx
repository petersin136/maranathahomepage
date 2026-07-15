import AdminAuthFrame from "@/components/admin/AdminAuthFrame";
import AdminUpdatePasswordForm from "@/components/admin/AdminUpdatePasswordForm";

export default function AdminUpdatePasswordPage() {
  return (
    <AdminAuthFrame
      title="NEW PASSWORD"
      subtitle="메일로 받으신 링크를 통해 접속하셨다면 새 비밀번호를 설정해 주세요."
    >
      <AdminUpdatePasswordForm />
    </AdminAuthFrame>
  );
}