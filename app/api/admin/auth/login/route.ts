import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authErrorKo } from "@/lib/admin/auth-errors";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "이메일과 비밀번호를 입력해 주세요." },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, error: "서버 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] =
    [];

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
          try {
            cookieStore.set(name, value, options);
          } catch {
            // ignore — also attach to response below
          }
        });
      }
    }
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[admin login]", error.message, error.code);
    return NextResponse.json(
      { ok: false, error: authErrorKo(error.message, "이메일 또는 비밀번호가 올바르지 않습니다.") },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true, userId: data.user?.id });
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}
