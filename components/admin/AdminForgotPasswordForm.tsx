"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.5 10.6a2.5 2.5 0 003.5 3.5M9.9 5.1A10.5 10.5 0 0121 12c-.8 1.6-1.9 3-3.3 4.1M6.1 6.2C4.4 7.5 3.1 9.1 2.2 12c1.5 4.5 5.4 7.5 9.8 7.5 1.5 0 2.9-.3 4.2-.9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.2 12C3.7 7.5 7.6 4.5 12 4.5S20.3 7.5 21.8 12C20.3 16.5 16.4 19.5 12 19.5S3.7 16.5 2.2 12z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function AdminForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== password2) {
      setError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "비밀번호 변경에 실패했습니다.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace("/admin/login"), 1500);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <p className="font-sans-kr text-[14px] text-hu-black">비밀번호가 변경되었습니다.</p>
        <p className="font-sans-kr text-[12px] text-hu-muted">로그인 화면으로 이동합니다…</p>
        <Link href="/admin/login" className="inline-block font-sans-kr text-[13px] underline">
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-[400px] space-y-6">
      <p className="font-sans-kr text-[12px] leading-relaxed text-hu-muted">
        가입 시 사용한 이메일로 새 비밀번호를 설정합니다.
      </p>

      <div>
        <label className="font-sans-kr text-[12px] text-hu-muted">이메일 (로그인 아이디)</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full border-b border-hu-black/50 bg-transparent py-2 font-sans-kr text-[15px] outline-none"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="font-sans-kr text-[12px] text-hu-muted">새 비밀번호 (8자 이상)</label>
        <div className="relative mt-2">
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-b border-hu-black/50 bg-transparent py-2 pr-10 font-sans-kr text-[15px] outline-none"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-hu-muted transition hover:text-hu-black"
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      <div>
        <label className="font-sans-kr text-[12px] text-hu-muted">새 비밀번호 확인</label>
        <input
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className="mt-2 w-full border-b border-hu-black/50 bg-transparent py-2 font-sans-kr text-[15px] outline-none"
          autoComplete="new-password"
        />
      </div>

      {error ? <p className="font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="flex h-[48px] w-full items-center justify-center bg-hu-black font-sans-kr text-[14px] text-white disabled:bg-[#bcbcbc]"
      >
        {loading ? "변경 중..." : "비밀번호 변경"}
      </button>

      <p className="text-center font-sans-kr text-[12px] text-hu-muted">
        <Link href="/admin/login" className="text-hu-black underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}
