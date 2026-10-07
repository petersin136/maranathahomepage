import { cache } from "react";
import { NextResponse } from "next/server";
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
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  return { user: user ?? null, error };
});

export async function requireAdminUser(): Promise<
  { ok: true; user: User } | { ok: false; response: NextResponse }
> {
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

  return { ok: true, user };
}
