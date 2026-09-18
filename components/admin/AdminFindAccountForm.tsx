"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { AdminSpecIcon } from "@/components/admin/AdminSpecIcon";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminFindAccountForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = EMAIL_RE.test(email.trim());
  const canSubmit = valid && !sent && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError(false);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(true);
        return;
      }
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-hu-white text-[#1C1A19]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-[24px] pb-[34px] pt-[224px]">
        <h1 className="text-center font-serif text-[48px] font-medium leading-none tracking-[-0.02em] [text-box-trim:trim-both] [text-box-edge:text_alphabetic]">
          hair up
        </h1>

        <p className="mt-[26px] text-center font-sans-kr text-[13px] leading-[23px] text-[#7C7B7B] [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
          가입 시 등록한 이메일 주소를 입력해 주세요.
          <br />
          비밀번호를 재설정할 수 있는 링크를 보내드립니다.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-[66px] flex flex-col leading-none">
          <div>
            <div className="relative leading-none">
              <input
                type="email"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(false);
                  setSent(false);
                }}
                placeholder="이메일"
                aria-label="이메일"
                aria-invalid={error}
                className={clsx(
                  "block h-[27px] w-full appearance-none border-b bg-transparent px-0 py-0 pb-[12px] font-sans-kr text-[14px] leading-none text-[#1C1A19] outline-none placeholder:text-[#979797]",
                  error ? "border-[#C33C3C]" : email.length > 0 ? "border-[#1C1A19]" : "border-[#979797]"
                )}
              />
            </div>
            {error ? (
              <p
                className="mt-[9px] flex items-start gap-[6px] font-sans-kr text-[12px] leading-none text-[#C33C3C] [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]"
                role="alert"
              >
                <AdminSpecIcon
                  name="exclamation_line"
                  className="mt-[-2px] h-4 w-4 shrink-0 text-[#C33C3C]"
                />
                <span>등록되지 않은 계정입니다. 이메일을 다시 확인해 주세요.</span>
              </p>
            ) : null}
            {sent ? (
              <p
                className="mt-[9px] font-sans-kr text-[12px] leading-[20px] text-[#666666] [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]"
                role="status"
              >
                입력하신 이메일로 재설정 링크를 전송했습니다.
                <br />
                메일함을 확인하고 24시간 이내에 변경을 완료해 주세요.
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={clsx(
              "mt-[51px] flex h-[52px] w-full items-center justify-center rounded-[6px] font-sans-kr text-[14px]",
              canSubmit
                ? "bg-[#2C3A2E] text-hu-white"
                : "cursor-not-allowed bg-[#EEEEEE] text-[#A3A3A3]"
            )}
          >
            {sent ? "발송 완료" : "인증 메일 발송"}
          </button>

          <Link
            href="/admin/login"
            className="mt-[21px] text-center font-sans-kr text-[12px] leading-none text-[#1C1A19] [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]"
          >
            로그인으로 돌아가기
          </Link>
        </form>

        <p className="mt-auto pt-10 text-center font-sans-kr text-[11px] leading-none text-[#666666] [text-box-trim:trim-both] [text-box-edge:text_alphabetic]">
          © hair up. All rights reserved.
        </p>
      </div>
    </div>
  );
}
