"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";

type Tab = "id" | "password";

export default function AdminFindAccountForm() {
  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setMaskedEmail(null);
    setLoading(true);

    try {
      const endpoint =
        tab === "id" ? "/api/admin/auth/find-id" : "/api/admin/auth/reset-password";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "요청에 실패했습니다.");
        return;
      }
      setMessage(data.message || "처리되었습니다.");
      if (data.maskedEmail) setMaskedEmail(data.maskedEmail);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-6 border-b border-hu-black/10">
        {(
          [
            { key: "password" as const, label: "비밀번호 찾기" },
            { key: "id" as const, label: "아이디 확인" }
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setError(null);
              setMessage(null);
              setMaskedEmail(null);
            }}
            className={clsx(
              "pb-3 font-sans-kr text-[13px] transition",
              tab === t.key
                ? "border-b-2 border-hu-black text-hu-black"
                : "text-hu-muted hover:text-hu-body"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-6 font-sans-kr text-[13px] leading-relaxed text-hu-muted">
        {tab === "password"
          ? "가입에 사용한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다."
          : "직원 계정 이메일을 입력하면 등록 여부를 확인해 드립니다. 계정이 없다면 원장에게 문의해 주세요."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <label className="block">
          <span className="font-serif text-[11px] tracking-[0.14em] text-hu-accent">EMAIL</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="직원 이메일"
            required
            className="mt-2 w-full border-b border-hu-black/40 bg-transparent pb-2 font-sans-kr text-[15px] outline-none placeholder:text-hu-muted focus:border-hu-black"
          />
        </label>

        {error ? (
          <p className="font-sans-kr text-[13px] text-[#9b4a4a]" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <div className="font-sans-kr text-[13px] text-hu-black" role="status">
            <p>{message}</p>
            {maskedEmail ? (
              <p className="mt-2 font-serif text-[18px] tracking-[0.04em]">{maskedEmail}</p>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex h-[52px] w-full items-center justify-between bg-hu-cta px-6 font-sans-kr text-[14px] font-medium text-hu-white transition hover:bg-[#222222] disabled:cursor-not-allowed disabled:bg-[#bcbcbc]"
        >
          <span>
            {loading
              ? "처리 중..."
              : tab === "password"
                ? "재설정 메일 받기"
                : "아이디 확인"}
          </span>
          <span aria-hidden>›</span>
        </button>
      </form>

      <div className="mt-8 font-sans-kr text-[12px] text-hu-muted">
        <Link href="/admin/login" className="underline underline-offset-2 hover:text-hu-black">
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
