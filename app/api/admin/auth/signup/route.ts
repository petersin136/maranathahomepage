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

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "이메일을 확인해 주세요." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "비밀번호는 8자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, "");
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "서버 Supabase 설정이 없습니다. NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 확인해 주세요."
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "admin" }
      }),
      cache: "no-store"
    });

    const data = (await res.json()) as {
      id?: string;
      email?: string;
      msg?: string;
      message?: string;
      error_code?: string;
      error?: string;
    };

    if (!res.ok) {
      console.error("[admin signup]", res.status, data);
      return NextResponse.json(
        {
          ok: false,
          error: authErrorKo(
            data.msg || data.message || data.error,
            "계정 생성에 실패했습니다."
          )
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, userId: data.id });
  } catch (err) {
    console.error("[admin signup]", err);
    return NextResponse.json(
      { ok: false, error: "계정 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
