"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.replace(next.startsWith("/admin") ? next : "/admin");
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

      <label className="block">
        <span className="font-serif text-[11px] tracking-[0.14em] text-hu-accent">PASSWORD</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          required
          className="mt-2 w-full border-b border-hu-black/40 bg-transparent pb-2 font-sans-kr text-[15px] outline-none placeholder:text-hu-muted focus:border-hu-black"
        />
      </label>

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
