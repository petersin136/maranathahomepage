import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminUserRow = {
  role: "owner" | "designer";
  artistId: string | null;
};

export async function getAdminUser(userId: string): Promise<AdminUserRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("admin_users")
    .select("role, artist_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  if (data.role !== "owner" && data.role !== "designer") return null;

  return {
    role: data.role,
    artistId: data.artist_id ?? null
  };
}
