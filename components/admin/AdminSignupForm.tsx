"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminSignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("비밀번호는 6자 이상으로 설정해 주세요.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "회원가입에 실패했습니다.");
        return;
      }

      if (data.signedIn) {
        router.replace("/admin");
        router.refresh();
        return;
      }

      router.replace("/admin/login");
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
        <span className="font-serif text-[11px] tracking-[0.14em] text-hu-accent">NAME</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름 (선택)"
          className="mt-2 w-full border-b border-hu-black/40 bg-transparent pb-2 font-sans-kr text-[15px] outline-none placeholder:text-hu-muted focus:border-hu-black"
        />
      </label>

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (6자 이상)"
          required
          className="mt-2 w-full border-b border-hu-black/40 bg-transparent pb-2 font-sans-kr text-[15px] outline-none placeholder:text-hu-muted focus:border-hu-black"
        />
      </label>

      <label className="block">
        <span className="font-serif text-[11px] tracking-[0.14em] text-hu-accent">CONFIRM</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="비밀번호 확인"
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
        <span>{loading ? "가입 중..." : "회원가입"}</span>
        <span aria-hidden>›</span>
      </button>

      <div className="flex items-center justify-between pt-1 font-sans-kr text-[12px] text-hu-muted">
        <Link href="/admin/login" className="underline underline-offset-2 hover:text-hu-black">
          이미 계정이 있어요
        </Link>
        <Link href="/" className="hover:text-hu-black">
          홈으로
        </Link>
      </div>
    </form>
  );
}
