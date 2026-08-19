import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * 서버 전용 Supabase 클라이언트. service_role 필수 (anon 폴백 없음).
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();

  if (!url) {
    throw new ConfigError("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  if (!serviceKey) {
    throw new ConfigError("SUPABASE_SERVICE_ROLE_KEY missing");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/** Auth Admin API용 — service_role 필수 (anon 폴백 없음) */
export function getSupabaseServiceRole(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();

  if (!url) {
    throw new ConfigError(
      "NEXT_PUBLIC_SUPABASE_URL이 없습니다. 배포 환경변수를 확인해 주세요."
    );
  }

  if (!serviceKey) {
    throw new ConfigError(
      "SUPABASE_SERVICE_ROLE_KEY가 없습니다. 배포 환경변수에 service_role 키를 넣어 주세요. (anon 키와 다릅니다)"
    );
  }

  const role = jwtRole(serviceKey);
  if (role === "anon") {
    throw new ConfigError(
      "SUPABASE_SERVICE_ROLE_KEY 자리에 anon 키가 들어 있습니다. Supabase → Project Settings → API → service_role 키로 바꿔 주세요."
    );
  }

  if (role && role !== "service_role") {
    throw new ConfigError(
      `SUPABASE_SERVICE_ROLE_KEY가 올바르지 않습니다. (role: ${role})`
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function jwtRole(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
    const json = Buffer.from(padded, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}
