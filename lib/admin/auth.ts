import { cache } from "react";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminUser, type AdminUserRow } from "@/lib/admin/admin-users";
import type { AdminShellSession } from "@/lib/admin/shell-session";
import { createClient } from "@/lib/supabase/server";
import {
  ConfigError,
  getSupabaseAdmin
} from "@/lib/supabase/admin";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export { getSupabaseAdmin };

export function requireSupabaseAdmin():
  | { ok: true; admin: SupabaseClient }
  | { ok: false; response: NextResponse } {
  try {
    return { ok: true, admin: getSupabaseAdmin() };
  } catch (e) {
    console.error("[supabase admin]", e);
    if (e instanceof ConfigError) {
      const error = e.message.includes("SUPABASE_SERVICE_ROLE_KEY")
        ? "SUPABASE_SERVICE_ROLE_KEY missing"
        : e.message;
      return {
        ok: false,
        response: NextResponse.json({ ok: false, error }, { status: 500 })
      };
    }
    throw e;
  }
}

const loadAdminUser = cache(async () => {
  // 미들웨어가 JWT를 이미 검증하고 헤더로 넘긴다. 여기서 getUser()를 다시 치면
  // 관리자 화면마다 Auth 서버를 한 번 더 왕복한다.
  const h = await headers();
  const id = h.get("x-hairup-user-id");
  if (id) {
    const name = decodeHeader(h.get("x-hairup-user-name"));
    const user = {
      id,
      email: decodeHeader(h.get("x-hairup-user-email")),
      user_metadata: name ? { name } : {}
    } as User;
    return { user, error: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  return { user: user ?? null, error };
});

function decodeHeader(value: string | null) {
  if (!value) return null;
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export const requireAdminUser = cache(async (): Promise<
  | { ok: true; user: User; role: AdminUserRow["role"]; artistId: string | null }
  | { ok: false; response: NextResponse }
> => {
  const { user, error } = await loadAdminUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 }
      )
    };
  }

  let row: AdminUserRow | null;
  try {
    row = await getAdminUser(user.id);
  } catch (e) {
    console.error("[getAdminUser]", e);
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "권한 정보를 확인하지 못했습니다." },
        { status: 500 }
      )
    };
  }

  if (!row) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "접근 권한이 없습니다." },
        { status: 403 }
      )
    };
  }

  return { ok: true, user, role: row.role, artistId: row.artistId };
});

/** 셸이 그릴 역할. 클라이언트는 이 값만 받고, 역할을 다시 판단하지 않는다. */
export const getAdminShellSession = cache(async (): Promise<AdminShellSession | null> => {
  const auth = await requireAdminUser();
  if (!auth.ok) return null;

  let artistName: string | null = null;
  if (auth.role === "designer" && auth.artistId) {
    try {
      const admin = getSupabaseAdmin();
      const { data } = await admin.from("artists").select("name_kr").eq("id", auth.artistId).maybeSingle();
      artistName = (data?.name_kr as string | null | undefined) ?? null;
    } catch (e) {
      console.error("[admin shell] artist name", e);
    }
  }

  const meta = auth.user.user_metadata ?? {};
  const metaName =
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    "";
  const profileName = metaName || (auth.user.email ? auth.user.email.split("@")[0] : "관리자");

  return { role: auth.role, artistId: auth.artistId, artistName, profileName };
});
