import { NextResponse } from "next/server";
import { ConfigError, getSupabaseServiceRole } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "이메일을 확인해 주세요." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "새 비밀번호는 8자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  try {
    const admin = getSupabaseServiceRole();

    // email 쿼리로 직접 조회 (전체 listUsers 보다 안정적)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim().replace(/^["']|["']$/g, "");

    const lookup = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        },
        cache: "no-store"
      }
    );

    const lookupJson = (await lookup.json()) as {
      users?: { id: string; email?: string }[];
      msg?: string;
      error_code?: string;
      message?: string;
    };

    if (!lookup.ok) {
      console.error("[admin reset] lookup", lookup.status, lookupJson);
      if (lookup.status === 403 || lookupJson.error_code === "not_admin") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "service_role 권한이 없습니다. 배포 환경의 SUPABASE_SERVICE_ROLE_KEY가 올바른지 확인해 주세요. (anon 키를 넣으면 이 오류가 납니다)"
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: lookupJson.msg || lookupJson.message || "계정 조회에 실패했습니다."
        },
        { status: 500 }
      );
    }

    const users = lookupJson.users ?? [];
    const user = users.find((u) => u.email?.toLowerCase() === email) ?? users[0];

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "해당 이메일로 가입된 계정이 없습니다." },
        { status: 404 }
      );
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true
    });

    if (updateError) {
      console.error("[admin reset] update", updateError);
      return NextResponse.json(
        { ok: false, error: updateError.message || "비밀번호 변경에 실패했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin reset]", err);
    if (err instanceof ConfigError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
    return NextResponse.json(
      { ok: false, error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
