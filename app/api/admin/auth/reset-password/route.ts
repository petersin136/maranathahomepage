import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { mapAuthError } from "@/lib/admin/auth-errors";

async function hasStaffUser(email: string): Promise<boolean> {
  const admin = getSupabaseServiceRole();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.some((u) => u.email?.toLowerCase() === email);
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "올바른 이메일을 입력해 주세요." },
      { status: 400 }
    );
  }

  try {
    const found = await hasStaffUser(email);
    if (!found) {
      return NextResponse.json(
        {
          ok: false,
          error: "등록되지 않은 계정입니다. 이메일을 다시 확인해 주세요."
        },
        { status: 404 }
      );
    }
  } catch (err) {
    console.error("[reset-password] lookup", err);
    return NextResponse.json(
      { ok: false, error: "확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const redirectTo = origin
    ? `${origin.replace(/\/$/, "")}/admin/update-password`
    : undefined;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: mapAuthError(error.message) },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "입력하신 이메일로 재설정 링크를 전송했습니다."
  });
}
