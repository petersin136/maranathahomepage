import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const isSupabaseConfigured = Boolean(getSupabaseUrl() && getSupabaseAnonKey());

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) return null;
  if (!client) {
    client = createClient(url, anon);
  }
  return client;
}
