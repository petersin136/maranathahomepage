"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminSpecIcon } from "@/components/admin/AdminSpecIcon";
import { clsx } from "clsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBER_KEY = "hu-admin-remember";

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
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      setRemember(window.localStorage.getItem(REMEMBER_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const underline = (hasError: boolean, filled: boolean) =>
    hasError ? "border-[#C33C3C]" : filled ? "border-[#1C1A19]" : "border-[#979797]";

  const validateEmail = (value: string) => {
    const ok = EMAIL_RE.test(value.trim());
    setEmailError(!ok);
    return ok;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(false);
    setErrorMessage(null);
    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLoginError(true);
        setErrorMessage("이메일 또는 비밀번호를 확인해주세요.");
        return;
      }
      try {
        window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
      } catch {
        /* ignore */
      }
      router.replace(next);
      router.refresh();
    } catch {
      setLoginError(true);
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-hu-white text-[#1C1A19]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-[24px] pb-[34px] pt-[170px]">
        <h1
          className="text-center font-serif text-[48px] font-medium leading-none tracking-[-0.02em] [text-box-trim:trim-both] [text-box-edge:text_alphabetic]"
        >
          hair up
        </h1>

        <p className="mt-[26px] text-center font-sans-kr text-[13px] leading-[23px] text-[#7C7B7B] [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
          헤어업 파트너를 위한 관리자 공간입니다.
          <br />
          발급받은 계정으로 로그인해 주세요.
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
                  setEmailError(false);
                  setLoginError(false);
                  setErrorMessage(null);
                }}
                onBlur={() => {
                  if (email.trim()) validateEmail(email);
                }}
                placeholder="이메일"
                aria-label="이메일"
                aria-invalid={emailError}
                className={clsx(
                  "block min-h-[26px] w-full appearance-none overflow-visible border-b bg-transparent px-0 py-0 pb-[10px] font-sans-kr text-[14px] leading-[26px] text-[#1C1A19] outline-none placeholder:text-[#979797]",
                  emailError ? "pr-[28px]" : "pr-0",
                  underline(emailError, email.length > 0)
                )}
              />
              {emailError ? (
                <span className="absolute right-0 top-0 flex h-[14px] items-center">
                  <AdminSpecIcon
                    name="exclamation_line"
                    className="h-4 w-4 text-[#C33C3C]"
                  />
                </span>
              ) : null}
            </div>
            {emailError ? (
              <p
                className="mt-[9px] font-sans-kr text-[12px] leading-none text-[#C33C3C] [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]"
                role="alert"
              >
                올바른 이메일 형식을 입력해 주세요.
              </p>
            ) : null}
          </div>

          <div className="mt-[35px]">
            <div className="relative leading-none">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(false);
                  setErrorMessage(null);
                }}
                placeholder="비밀번호"
                aria-label="비밀번호"
                required
                className={clsx(
                  "block min-h-[26px] w-full appearance-none overflow-visible border-b bg-transparent px-0 py-0 pb-[10px] font-sans-kr text-[14px] leading-[26px] text-[#1C1A19] outline-none placeholder:text-[#979797]",
                  password.length > 0 ? "pr-[28px]" : "pr-0",
                  underline(false, password.length > 0)
                )}
              />
              {password.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  className="absolute right-0 top-0 flex h-[14px] w-4 items-center justify-center text-[#979797]"
                >
                  {showPassword ? (
                    <AdminSpecIcon name="eye-crossed" className="h-4 w-4 text-[#979797]" />
                  ) : (
                    <AdminSpecIcon name="eye" className="h-4 w-4 text-[#979797]" />
                  )}
                </button>
              ) : null}
            </div>
            {loginError && errorMessage ? (
              <p
                className="mt-[9px] flex items-start gap-[6px] font-sans-kr text-[12px] leading-none text-[#C33C3C] [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]"
                role="alert"
              >
                <AdminSpecIcon
                  name="exclamation_line"
                  className="mt-[-2px] h-4 w-4 shrink-0 text-[#C33C3C]"
                />
                <span>{errorMessage}</span>
              </p>
            ) : null}
          </div>

          <label
            className={clsx(
              "flex cursor-pointer items-center gap-[8px]",
              loginError && errorMessage ? "mt-[15px]" : "mt-[26px]"
            )}
          >
            <span
              className={clsx(
                "relative box-border flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px]",
                remember
                  ? "border-0 bg-[#2C3A2E]"
                  : "border-[1.5px] border-[#979797] bg-hu-white"
              )}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {remember ? (
                <AdminSpecIcon name="check_2" className="h-[10px] w-[10px] text-hu-white" />
              ) : null}
            </span>
            <span className="font-sans-kr text-[13px] leading-none text-[#666666] [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
              로그인 유지
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-[51px] flex h-[52px] w-full items-center justify-center rounded-[6px] bg-[#2C3A2E] font-sans-kr text-[14px] text-hu-white disabled:opacity-70"
          >
            로그인
          </button>

          <div className="mt-[21px] flex items-center justify-between font-sans-kr text-[12px] leading-none text-[#6F6E6E] [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
            <Link href="/admin/find-account">비밀번호 찾기</Link>
            <Link href="/">웹사이트 바로가기</Link>
          </div>
        </form>

        <p className="mt-auto pt-10 text-center font-sans-kr text-[11px] leading-none text-[#666666] [text-box-trim:trim-both] [text-box-edge:text_alphabetic]">
          © hair up. All rights reserved.
        </p>
      </div>
    </div>
  );
}
