import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError } from "@/lib/admin/auth-errors";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "올바른 이메일을 입력해 주세요." },
      { status: 400 }
    );
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const redirectTo = origin
    ? `${origin.replace(/\/$/, "")}/admin/update-password`
    : undefined;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: mapAuthError(error.message) },
      { status: 400 }
    );
  }

  // 계정 존재 여부를 드러내지 않음
  return NextResponse.json({
    ok: true,
    message: "등록된 계정이라면 비밀번호 재설정 메일을 보내드렸습니다."
  });
}
