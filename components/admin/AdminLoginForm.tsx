"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function safeAdminPath(raw: string | null): Route {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("//") || raw.includes("://")) {
    return "/admin";
  }
  return raw as Route;
}

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeAdminPath(searchParams.get("next"));

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
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <label className="block">
        <span className="font-serif text-[11px] tracking-[0.14em] text-hu-accent">EMAIL</span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="직원 이메일"
          required
          className="mt-2 w-full border-b border-hu-black/40 bg-transparent pb-2 font-sans-kr text-[15px] outline-none placeholder:text-hu-muted focus:border-hu-black"
        />
      </label>

      <div>
        <span className="font-serif text-[11px] tracking-[0.14em] text-hu-accent">PASSWORD</span>
        <div className="relative mt-2">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="w-full border-b border-hu-black/40 bg-transparent pb-2 pr-10 font-sans-kr text-[15px] outline-none placeholder:text-hu-muted focus:border-hu-black"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            className="absolute right-0 top-1/2 -translate-y-[60%] p-1 text-hu-muted transition hover:text-hu-black"
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.9 5.1A10.5 10.5 0 0121 12c-.6 1-1.4 2-2.4 2.8M6.1 6.1C4.5 7.4 3.3 9.1 2.5 12c1.5 4.5 5.5 7.5 9.5 7.5 1.6 0 3.1-.4 4.5-1.1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M2.5 12C4 7.5 8 4.5 12 4.5S20 7.5 21.5 12C20 16.5 16 19.5 12 19.5S4 16.5 2.5 12z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p className="font-sans-kr text-[13px] text-[#9b4a4a]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="flex h-[52px] w-full items-center justify-between bg-hu-cta px-6 font-sans-kr text-[14px] font-medium text-hu-white transition hover:bg-[#222222] disabled:cursor-not-allowed disabled:bg-[#bcbcbc]"
      >
        <span>{loading ? "로그인 중..." : "로그인"}</span>
        <span aria-hidden>›</span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 font-sans-kr text-[12px] text-hu-muted">
        <div className="flex items-center gap-3">
          <Link href="/admin/signup" className="underline underline-offset-2 hover:text-hu-black">
            회원가입
          </Link>
          <Link
            href="/admin/find-account"
            className="underline underline-offset-2 hover:text-hu-black"
          >
            아이디·비밀번호 찾기
          </Link>
        </div>
        <Link href="/" className="hover:text-hu-black">
          홈으로
        </Link>
      </div>
    </form>
  );
}
