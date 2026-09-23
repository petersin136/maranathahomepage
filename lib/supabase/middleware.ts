import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

function copyAuthCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  for (const header of ["cache-control", "expires", "pragma"] as const) {
    const value = from.headers.get(header);
    if (value) to.headers.set(header, value);
  }
  return to;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();

  if (!url || !anon) {
    return { supabaseResponse, user: null as { id: string } | null };
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // 값이 바뀐 쿠키만 응답에 실어 RSC 재요청 루프를 막는다
        const changed = cookiesToSet.some(
          ({ name, value }) => request.cookies.get(name)?.value !== value
        );

        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        if (!changed) return;

        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      }
    }
  });

  // getUser()는 매 요청 Auth 서버 왕복 → 탭 전환이 느려짐.
  // getClaims()는 JWT 검증(가능하면 로컬) + 만료 임박 시만 갱신.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user =
    claims && typeof claims.sub === "string" ? { id: claims.sub } : null;

  return { supabaseResponse, user };
}

export { copyAuthCookies };
