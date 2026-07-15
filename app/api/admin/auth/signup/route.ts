import { NextResponse } from "next/server";
import { authErrorKo } from "@/lib/admin/auth-errors";

export const runtime = "nodejs";

function clean(value?: string | null) {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

type AuthUser = { id: string; email?: string | null };

async function listUsers(url: string, serviceKey: string) {
  const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    },
    cache: "no-store"
  });
  const json = (await res.json()) as {
    users?: AuthUser[];
    msg?: string;
    message?: string;
    error_code?: string;
  };
  return { res, json };
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password ?? "";

  if (!email.includes("@")) {
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
    // 이미 있으면 비밀번호만 갱신 (삭제 후 재가입 / 중복 가입 상황 해결)
    const listed = await listUsers(url, serviceKey);
    if (!listed.res.ok) {
      const raw =
        listed.json.msg || listed.json.message || `listUsers ${listed.res.status}`;
      console.error("[admin signup] list", listed.res.status, listed.json);
      return NextResponse.json(
        {
          ok: false,
          error: authErrorKo(raw, `계정 조회 실패: ${raw}`)
        },
        { status: 500 }
      );
    }

    const existing = (listed.json.users || []).find(
      (u) => u.email?.toLowerCase() === email
    );

    if (existing?.id) {
      const upd = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
        method: "PUT",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password, email_confirm: true }),
        cache: "no-store"
      });
      const updJson = (await upd.json()) as { msg?: string; message?: string };
      if (!upd.ok) {
        const raw = updJson.msg || updJson.message || `update ${upd.status}`;
        return NextResponse.json(
          { ok: false, error: authErrorKo(raw, `비밀번호 갱신 실패: ${raw}`) },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true, userId: existing.id, updated: true });
    }

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
      msg?: string;
      message?: string;
      error?: string;
      error_code?: string;
    };

    if (!res.ok) {
      const raw = data.msg || data.message || data.error || `create ${res.status}`;
      console.error("[admin signup] create", res.status, data);
      return NextResponse.json(
        { ok: false, error: authErrorKo(raw, `계정 생성 실패: ${raw}`) },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, userId: data.id, updated: false });
  } catch (err) {
    console.error("[admin signup]", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? `계정 생성 중 오류: ${err.message}`
            : "계정 생성 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
