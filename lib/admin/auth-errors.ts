export function mapAuthError(message?: string | null): string {
  const m = (message || "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (m.includes("email not confirmed")) {
    return "이메일 인증이 완료되지 않은 계정입니다.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (m.includes("user not found")) {
    return "등록된 계정을 찾을 수 없습니다.";
  }
  return "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
