import AdminAuthFrame from "@/components/admin/AdminAuthFrame";
import AdminSignupForm from "@/components/admin/AdminSignupForm";

export default function AdminSignupPage() {
  return (
    <AdminAuthFrame
      title="SIGN UP"
      subtitle="직원 계정을 생성합니다. 이메일과 비밀번호만 등록하면 바로 이용할 수 있습니다."
    >
      <AdminSignupForm />
    </AdminAuthFrame>
  );
}
