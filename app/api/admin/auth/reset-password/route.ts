import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: {
    email?: string;
    password?: string;
    resetCode?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const resetCode = body.resetCode?.trim() ?? "";
  const expected =
    process.env.ADMIN_RESET_CODE?.trim() || process.env.ADMIN_SIGNUP_CODE?.trim();

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "서버에 ADMIN_RESET_CODE(또는 ADMIN_SIGNUP_CODE)가 설정되지 않았습니다."
      },
      { status: 500 }
    );
  }

  if (!resetCode || resetCode !== expected) {
    return NextResponse.json(
      { ok: false, error: "관리자 확인 코드가 올바르지 않습니다." },
      { status: 403 }
    );
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "이메일을 확인해 주세요." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "새 비밀번호는 8자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) {
      console.error("[admin reset]", error);
      return NextResponse.json(
        { ok: false, error: "계정 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "해당 이메일로 가입된 계정이 없습니다." },
        { status: 404 }
      );
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true
    });

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message || "비밀번호 변경에 실패했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin reset]", err);
    return NextResponse.json(
      { ok: false, error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
