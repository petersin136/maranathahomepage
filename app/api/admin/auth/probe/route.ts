import { NextResponse } from "next/server";

export const runtime = "nodejs";

function clean(value?: string | null) {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

/** 배포에서 Auth가 실제로 되는지 점검 (비밀번호/키 값 미노출) */
export async function GET() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, "");
  const anon = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const out: Record<string, unknown> = {
    urlHost: null as string | null,
    listUsersStatus: null as number | null,
    listUsersCount: null as number | null,
    listUsersError: null as string | null,
    healthStatus: null as number | null
  };

  try {
    out.urlHost = url ? new URL(url).hostname : null;
  } catch {
    out.urlHost = "invalid_url";
  }

  if (url && service) {
    try {
      const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=5`, {
        headers: { apikey: service, Authorization: `Bearer ${service}` },
        cache: "no-store"
      });
      out.listUsersStatus = res.status;
      const json = (await res.json()) as { users?: unknown[]; msg?: string; message?: string };
      if (res.ok) out.listUsersCount = Array.isArray(json.users) ? json.users.length : null;
      else out.listUsersError = json.msg || json.message || `HTTP ${res.status}`;
    } catch (e) {
      out.listUsersError = e instanceof Error ? e.message : "fetch failed";
    }
  }

  if (url && anon) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anon },
        cache: "no-store"
      });
      out.healthStatus = res.status;
    } catch (e) {
      out.healthStatus = -1;
      out.healthError = e instanceof Error ? e.message : "fetch failed";
    }
  }

  return NextResponse.json({
    ok: out.listUsersStatus === 200 && out.healthStatus === 200,
    ...out
  });
}
