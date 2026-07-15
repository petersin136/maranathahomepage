import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

export { getSupabaseAdmin };

export async function requireAdminUser(): Promise<
  { ok: true; user: User } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

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
