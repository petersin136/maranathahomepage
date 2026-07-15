import AdminAuthFrame from "@/components/admin/AdminAuthFrame";
import AdminFindAccountForm from "@/components/admin/AdminFindAccountForm";

export default function AdminFindAccountPage() {
  return (
    <AdminAuthFrame
      title="ACCOUNT"
      subtitle="아이디 확인 또는 비밀번호 재설정을 진행할 수 있습니다."
    >
      <AdminFindAccountForm />
    </AdminAuthFrame>
  );
}
