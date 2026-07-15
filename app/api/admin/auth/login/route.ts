import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authErrorKo } from "@/lib/admin/auth-errors";

export const runtime = "nodejs";

function clean(value?: string | null) {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

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

  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, error: "서버에 Supabase 환경변수가 없습니다." },
      { status: 500 }
    );
  }

  // Direct password grant — avoids some SSR client edge cases
  const tokenRes = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    user?: { id?: string };
    error_description?: string;
    msg?: string;
    error?: string;
    error_code?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token || !tokenJson.refresh_token) {
    console.error("[admin login]", tokenRes.status, tokenJson);
    return NextResponse.json(
      {
        ok: false,
        error: authErrorKo(
          tokenJson.error_description || tokenJson.msg || tokenJson.error,
          "이메일 또는 비밀번호가 올바르지 않습니다."
        )
      },
      { status: 401 }
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
            // attach on response below
          }
        });
      }
    }
  });

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token
  });

  if (sessionError) {
    console.error("[admin login] setSession", sessionError);
    return NextResponse.json(
      { ok: false, error: "로그인 세션 저장에 실패했습니다. 다시 시도해 주세요." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    userId: tokenJson.user?.id
  });
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}
