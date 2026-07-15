import { NextResponse } from "next/server";
import { authErrorKo } from "@/lib/admin/auth-errors";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "이메일을 확인해 주세요." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "비밀번호는 8자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "admin" }
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: authErrorKo(error.message, "계정 생성에 실패했습니다.") },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, userId: data.user?.id });
  } catch (err) {
    console.error("[admin signup]", err);
    return NextResponse.json(
      { ok: false, error: "계정 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
