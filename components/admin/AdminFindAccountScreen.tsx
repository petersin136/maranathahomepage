"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminSpecIcon } from "@/components/admin/AdminSpecIcon";
import "./mobile-admin-login.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminFindAccountScreen({
  layout = "mobile"
}: {
  layout?: "mobile" | "desktop";
}) {
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = EMAIL_RE.test(email.trim());
  const canSubmit = valid && !sent && !loading;
  const isDesktop = layout === "desktop";

  const lineClass = error
    ? "INPUT-LINE-ERROR"
    : focused
      ? "INPUT-LINE-ACTIVE"
      : email
        ? "INPUT-LINE-ACTIVE"
        : "INPUT-LINE-INACTIVE";

  const textClass = email ? "INPUT-TEXT-ACTIVE" : "INPUT-LABEL";

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
    <div className="m-admin-login" data-layout={layout}>
      <div className="m-admin-login-artboard" data-top="default">
        <img className="LOGIN-LOGO" src="/hair-up-logo.png" alt="hair up" width={151} />
        <p className="LOGIN-DESC">
          가입 시 등록한 이메일 주소를 입력해 주세요.
          <br />
          비밀번호를 재설정할 수 있는 링크를 보내드립니다.
        </p>

        <form className="m-admin-login-form" onSubmit={onSubmit} noValidate>
          <div className="m-admin-login-field-email">
            <div className="m-admin-login-input-row">
              <input
                className={textClass}
                type="email"
                autoComplete="username"
                value={email}
                placeholder="이메일"
                aria-invalid={error}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(false);
                  setSent(false);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </div>
            <div className={lineClass} />
            {error ? (
              <div className="m-admin-login-error-row">
                <AdminSpecIcon name="exclamation_line" className="ICO-ERROR" />
                <p className="LOGIN-ERROR-MSG">
                  등록되지 않은 계정입니다. 이메일을 다시 확인해 주세요.
                </p>
              </div>
            ) : null}
            {sent ? (
              <p className="FIND-SUCCESS-MSG" role="status">
                입력하신 이메일로 재설정 링크를 전송했습니다.
                <br />
                메일함을 확인하고 24시간 이내에 변경을 완료해 주세요.
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className={canSubmit ? "BTN-LOGIN" : "BTN-LOGIN is-disabled"}
            disabled={!canSubmit}
          >
            <span className="BTN-LOGIN-TEXT">{sent ? "발송 완료" : "인증 메일 발송"}</span>
          </button>

          <Link href="/admin/login" className="LINK-BACK-LOGIN">
            로그인으로 돌아가기
          </Link>
        </form>

        {isDesktop ? null : (
          <p className="FOOTER-COPYRIGHT">© hair up. All rights reserved.</p>
        )}
      </div>
      {isDesktop ? (
        <p className="FOOTER-COPYRIGHT">© hair up. All rights reserved.</p>
      ) : null}
    </div>
  );
}
