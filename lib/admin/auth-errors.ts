/** Map Supabase Auth English errors to Korean UI copy. */
export function authErrorKo(message?: string | null, fallback = "처리 중 오류가 발생했습니다."): string {
  if (!message) return fallback;
  const m = message.toLowerCase();

  if (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("user already exists") ||
    m.includes("email address is already")
  ) {
    return "이미 가입된 이메일입니다.";
  }

  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }

  if (m.includes("email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다.";
  }

  if (m.includes("password") && (m.includes("least") || m.includes("short") || m.includes("weak"))) {
    return "비밀번호는 8자 이상으로 설정해 주세요.";
  }

  if (m.includes("rate limit") || m.includes("too many")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (m.includes("network") || m.includes("fetch")) {
    return "네트워크 오류가 발생했습니다.";
  }

  // Already Korean or unknown — return as-is if Hangul present, else fallback
  if (/[가-힣]/.test(message)) return message;
  return fallback;
}
