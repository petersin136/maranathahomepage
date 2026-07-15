import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { mapAuthError } from "@/lib/admin/auth-errors";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";
  const name = body.name?.trim() || "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "올바른 이메일을 입력해 주세요." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "비밀번호는 6자 이상으로 설정해 주세요." },
      { status: 400 }
    );
  }

  try {
    const admin = getSupabaseServiceRole();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { name } : undefined
    });

    if (createError || !created.user) {
      const msg = createError?.message || "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        return NextResponse.json(
          { ok: false, error: "이미 등록된 이메일입니다." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: mapAuthError(createError?.message) },
        { status: 400 }
      );
    }

    // 가입 직후 로그인 세션 발급
    const url = getSupabaseUrl();
    const anon = getSupabaseAnonKey();
    if (!url || !anon) {
      return NextResponse.json({
        ok: true,
        message: "계정이 생성되었습니다. 로그인해 주세요."
      });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name: n, value, options }) =>
            cookieStore.set(n, value, options)
          );
        }
      }
    });

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      return NextResponse.json({
        ok: true,
        message: "계정이 생성되었습니다. 로그인해 주세요."
      });
    }

    return NextResponse.json({
      ok: true,
      signedIn: true,
      user: { id: created.user.id, email: created.user.email }
    });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error && err.message.includes("not set")
            ? "서버에 Supabase 환경 변수가 설정되지 않았습니다."
            : "회원가입 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
