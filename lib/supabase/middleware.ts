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

function encodeHeader(value: string) {
  const bytes = new TextEncoder().encode(value.replace(/[\r\n]/g, "").slice(0, 80));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function nextWithPathname(
  request: NextRequest,
  user: { id: string; email: string; name: string } | null = null
) {
  const requestHeaders = new Headers(request.headers);
  // 클라이언트가 같은 헤더를 심어도 여기서 지운 뒤, 검증된 경우에만 다시 넣는다.
  requestHeaders.delete("x-hairup-user-id");
  requestHeaders.delete("x-hairup-user-email");
  requestHeaders.delete("x-hairup-user-name");
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  if (user) {
    requestHeaders.set("x-hairup-user-id", user.id);
    if (user.email) requestHeaders.set("x-hairup-user-email", encodeHeader(user.email));
    if (user.name) requestHeaders.set("x-hairup-user-name", encodeHeader(user.name));
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = nextWithPathname(request);
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

        supabaseResponse = nextWithPathname(request);
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
  const meta =
    claims?.user_metadata && typeof claims.user_metadata === "object"
      ? (claims.user_metadata as Record<string, unknown>)
      : {};
  const name =
    typeof meta.name === "string"
      ? meta.name
      : typeof meta.full_name === "string"
        ? meta.full_name
        : "";
  const user =
    claims && typeof claims.sub === "string"
      ? {
          id: claims.sub,
          email: typeof claims.email === "string" ? claims.email : "",
          name
        }
      : null;

  const forwarded = nextWithPathname(request, user);
  for (const cookie of supabaseResponse.headers.getSetCookie()) {
    forwarded.headers.append("set-cookie", cookie);
  }
  for (const header of ["cache-control", "expires", "pragma"] as const) {
    const value = supabaseResponse.headers.get(header);
    if (value) forwarded.headers.set(header, value);
  }

  return { supabaseResponse: forwarded, user };
}

export { copyAuthCookies };
