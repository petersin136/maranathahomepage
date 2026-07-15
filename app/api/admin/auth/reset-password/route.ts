import { NextResponse } from "next/server";
import { ConfigError, getSupabaseServiceRole } from "@/lib/supabase/admin";

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
      { ok: false, error: "새 비밀번호는 8자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  try {
    const admin = getSupabaseServiceRole();

    // service_role 필수 — listUsers 로 이메일 매칭
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) {
      console.error("[admin reset] listUsers", error);
      return NextResponse.json(
        {
          ok: false,
          error:
            error.message?.includes("not_admin") || error.status === 403
              ? "service_role 권한이 없습니다. SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요."
              : `계정 조회에 실패했습니다. (${error.message})`
        },
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
      console.error("[admin reset] update", updateError);
      return NextResponse.json(
        { ok: false, error: updateError.message || "비밀번호 변경에 실패했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin reset]", err);
    if (err instanceof ConfigError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
    return NextResponse.json(
      { ok: false, error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
