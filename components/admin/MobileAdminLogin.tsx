"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AdminSpecIcon } from "@/components/admin/AdminSpecIcon";
import "./mobile-admin-login.css";

function safeAdminPath(raw: string | null): Route {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("//") || raw.includes("://")) {
    return "/admin";
  }
  return raw as Route;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function MobileAdminLogin({
  layout = "mobile"
}: {
  layout?: "mobile" | "desktop";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeAdminPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailFormatError, setEmailFormatError] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailLineClass = emailFormatError
    ? "INPUT-LINE-ERROR"
    : emailFocused || email
      ? "INPUT-LINE-ACTIVE"
      : "INPUT-LINE-INACTIVE";

  const passwordLineClass =
    passwordFocused || password ? "INPUT-LINE-ACTIVE" : "INPUT-LINE-INACTIVE";

  const emailTextClass = emailFormatError
    ? "INPUT-TEXT-ERROR"
    : email
      ? "INPUT-TEXT-ACTIVE"
      : "INPUT-LABEL";

  const passwordTextClass = !password
    ? "INPUT-LABEL"
    : showPassword
      ? "INPUT-PASSWORD-VISIBLE"
      : "INPUT-PASSWORD";

  const topState = emailFormatError ? "email-error" : loginError ? "login-error" : "default";

  const validateEmail = (value: string) => {
    const invalid = value.trim().length > 0 && !isValidEmail(value);
    setEmailFormatError(invalid);
    return !invalid && value.trim().length > 0 && isValidEmail(value);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!isValidEmail(email)) {
      setEmailFormatError(true);
      return;
    }
    setEmailFormatError(false);

    if (!password) {
      setLoginError("이메일 또는 비밀번호를 확인해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLoginError("이메일 또는 비밀번호를 확인해주세요.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setLoginError("이메일 또는 비밀번호를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const isDesktop = layout === "desktop";

  return (
    <div className="m-admin-login ADMIN-LOGIN-WRAPPER" data-layout={layout}>
      <div className="m-admin-login-artboard ADMIN-LOGIN-CARD" data-top={isDesktop ? "default" : topState}>
        <img
          className="LOGIN-LOGO ADMIN-LOGIN-LOGO-SVG"
          src="/hair-up-logo.png"
          alt="hair up"
          width={151}
        />
        <p className="LOGIN-DESC ADMIN-LOGIN-DESC">
          헤어업 파트너를 위한 관리자 공간입니다.
          <br />
          발급받은 계정으로 로그인해 주세요.
        </p>

        <form className="m-admin-login-form" onSubmit={onSubmit} noValidate>
          <div className="m-admin-login-field-email">
            <div className="m-admin-login-input-row">
              <input
                className={`INPUT-FIELD ${emailTextClass}${emailFocused ? " is-focused" : ""}${emailFormatError ? " IS-ERROR m-admin-login-has-icon" : ""}`}
                type="email"
                autoComplete="username"
                value={email}
                placeholder="이메일"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailFormatError) validateEmail(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => {
                  setEmailFocused(false);
                  if (email.trim()) validateEmail(email);
                }}
              />
              {emailFormatError ? (
                <AdminSpecIcon name="exclamation_line" className="ICO-WARNING INPUT-ERROR-ICON" />
              ) : null}
            </div>
            {isDesktop ? null : <div className={emailLineClass} />}
            {emailFormatError ? (
              <p className="ERROR-MSG INPUT-ERROR-MSG">올바른 이메일 형식을 입력해 주세요.</p>
            ) : null}
          </div>

          <div
            className={
              emailFormatError
                ? "m-admin-login-field-password is-after-email-error"
                : "m-admin-login-field-password"
            }
          >
            <div className="m-admin-login-input-row">
              <input
                className={`INPUT-FIELD ${passwordTextClass}${passwordFocused ? " is-focused" : ""}${password ? " m-admin-login-has-eye" : ""}`}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                placeholder="비밀번호"
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError(null);
                  if (!e.target.value) setShowPassword(false);
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              {password ? (
                <button
                  type="button"
                  className="m-admin-login-eye"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <AdminSpecIcon name="eye-crossed" className="ICO-EYE-OFF INPUT-PASSWORD-ICON" />
                  ) : (
                    <AdminSpecIcon name="eye" className="ICO-EYE INPUT-PASSWORD-ICON" />
                  )}
                </button>
              ) : null}
            </div>
            {isDesktop ? null : <div className={passwordLineClass} />}
            {loginError && !emailFormatError ? (
              <div className="m-admin-login-error-row">
                <AdminSpecIcon name="exclamation_line" className="ICO-ERROR LOGIN-ERROR-ICON" />
                <p className="LOGIN-ERROR-MSG">{loginError}</p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className={
              loginError && !emailFormatError
                ? "m-admin-login-keep is-after-error"
                : "m-admin-login-keep"
            }
            onClick={() => setRemember((v) => !v)}
            aria-pressed={remember}
          >
            {remember ? (
              <span className="CHECKBOX-CHECKED CHECKBOX-CUSTOM">
                <AdminSpecIcon name="check_2" className="ICO-CHECK" />
              </span>
            ) : (
              <span className="CHECKBOX CHECKBOX-CUSTOM" />
            )}
            <span className="KEEP-LOGIN-TEXT KEEP-LOGIN-LABEL">로그인 유지</span>
          </button>

          <button type="submit" className="BTN-LOGIN BTN-ADMIN-LOGIN" disabled={loading}>
            <span className="BTN-LOGIN-TEXT">로그인</span>
          </button>

          <div className="m-admin-login-links">
            <Link href="/admin/find-account" className="LINK-FIND-PW ADMIN-LOGIN-LINK">
              비밀번호 찾기
            </Link>
            <Link href="/" className="LINK-GO-WEBSITE ADMIN-LOGIN-LINK">
              웹사이트 바로가기
            </Link>
          </div>
        </form>

        {isDesktop ? null : (
          <p className="FOOTER-COPYRIGHT ADMIN-FOOTER-COPYRIGHT">© hair up. All rights reserved.</p>
        )}
      </div>
      {isDesktop ? (
        <p className="FOOTER-COPYRIGHT ADMIN-FOOTER-COPYRIGHT">© hair up. All rights reserved.</p>
      ) : null}
    </div>
  );
}
