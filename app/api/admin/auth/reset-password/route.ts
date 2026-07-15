import { NextResponse } from "next/server";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl
} from "@/lib/supabase/env";

export const runtime = "nodejs";

type AuthUser = { id: string; email?: string | null };

function authEnv() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!url) {
    return { error: "NEXT_PUBLIC_SUPABASE_URL이 없습니다." } as const;
  }
  if (!serviceKey) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY가 없습니다. (anon 키가 아니라 service_role 키여야 합니다)"
    } as const;
  }
  return { url, serviceKey } as const;
}

async function findUserByEmail(
  url: string,
  serviceKey: string,
  email: string
): Promise<{ user?: AuthUser; error?: string }> {
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
  if (!res.ok) {
    return {
      error:
        json.error_code === "not_admin" || res.status === 403
          ? "service_role 권한이 없습니다. SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요."
          : json.msg || json.message || `계정 조회 실패 (${res.status})`
    };
  }
  const user = (json.users || []).find((u) => u.email?.toLowerCase() === email);
  if (!user) return { error: "해당 이메일로 가입된 계정이 없습니다." };
  return { user };
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
      { ok: false, error: "새 비밀번호는 8자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  const env = authEnv();
  if ("error" in env) {
    return NextResponse.json({ ok: false, error: env.error }, { status: 500 });
  }

  try {
    const found = await findUserByEmail(env.url, env.serviceKey, email);
    if (found.error || !found.user) {
      return NextResponse.json(
        { ok: false, error: found.error || "계정을 찾을 수 없습니다." },
        { status: found.error?.includes("없습니다") ? 404 : 500 }
      );
    }

    const updateRes = await fetch(`${env.url}/auth/v1/admin/users/${found.user.id}`, {
      method: "PUT",
      headers: {
        apikey: env.serviceKey,
        Authorization: `Bearer ${env.serviceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password, email_confirm: true }),
      cache: "no-store"
    });
    const updateJson = (await updateRes.json()) as {
      id?: string;
      msg?: string;
      message?: string;
    };

    if (!updateRes.ok) {
      console.error("[admin reset] update", updateRes.status, updateJson);
      return NextResponse.json(
        {
          ok: false,
          error: updateJson.msg || updateJson.message || "비밀번호 변경에 실패했습니다."
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin reset]", err);
    return NextResponse.json(
      { ok: false, error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
