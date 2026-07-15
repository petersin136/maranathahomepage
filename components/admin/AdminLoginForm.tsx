"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function AdminLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      router.replace((next.startsWith("/admin") ? next : "/admin") as "/admin");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-[400px] space-y-6">
      <div>
        <label className="font-sans-kr text-[12px] text-hu-muted">이메일</label>
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
        <label className="font-sans-kr text-[12px] text-hu-muted">비밀번호</label>
        <div className="relative mt-2">
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-b border-hu-black/50 bg-transparent py-2 pr-10 font-sans-kr text-[15px] outline-none"
            autoComplete="current-password"
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
      {error ? <p className="font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="flex h-[48px] w-full items-center justify-center bg-hu-black font-sans-kr text-[14px] text-white disabled:bg-[#bcbcbc]"
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>
      <p className="text-center font-sans-kr text-[12px] text-hu-muted">
        계정이 없나요?{" "}
        <Link href="/admin/signup" className="text-hu-black underline">
          가입하기
        </Link>
      </p>
    </form>
  );
}
