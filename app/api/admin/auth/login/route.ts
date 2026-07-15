import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { mapAuthError } from "@/lib/admin/auth-errors";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "이메일과 비밀번호를 입력해 주세요." },
      { status: 400 }
    );
  }

  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, error: "서버 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      }
    }
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, error: mapAuthError(error?.message) },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: { id: data.user.id, email: data.user.email }
  });
}
