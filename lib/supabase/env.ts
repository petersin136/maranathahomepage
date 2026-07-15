/** Normalize env values pasted into Vercel / .env.local */

export function cleanEnv(value?: string | null): string {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

/**
 * Project URL only — strips accidental paths like /rest/v1 or /auth/v1
 * that cause "Invalid path specified in request URL".
 */
export function getSupabaseUrl(): string {
  const raw = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

export function getSupabaseAnonKey(): string {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseServiceRoleKey(): string {
  return cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
