import { getSupabase } from "@/lib/supabase/client";
import type { Artist } from "@/lib/artists/types";

export const ARTISTS_FALLBACK: Artist[] = [
  {
    id: "jay",
    nameKr: "재이",
    nameEn: "JAY",
    role: "Owner & Senior Stylist",
    imageUrl: null,
    instagramUrl: "https://instagram.com",
    sortOrder: 0
  },
  {
    id: "seoa",
    nameKr: "서아",
    nameEn: "SEOA",
    role: "Stylist",
    imageUrl: null,
    instagramUrl: "https://instagram.com",
    sortOrder: 1
  },
  {
    id: "kai",
    nameKr: "카이",
    nameEn: "KAI",
    role: "Stylist",
    imageUrl: null,
    instagramUrl: "https://instagram.com",
    sortOrder: 2
  },
  {
    id: "yumi",
    nameKr: "유미",
    nameEn: "YUMI",
    role: "Stylist",
    imageUrl: null,
    instagramUrl: "https://instagram.com",
    sortOrder: 3
  }
];

export async function getArtists(): Promise<Artist[]> {
  const supabase = getSupabase();
  if (!supabase) return ARTISTS_FALLBACK;

  try {
    const { data, error } = await supabase
      .from("artists")
      .select("id, name_kr, name_en, role, image_url, instagram_url, sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) return ARTISTS_FALLBACK;

    return data.map((row) => ({
      id: row.id,
      nameKr: row.name_kr,
      nameEn: row.name_en,
      role: row.role,
      imageUrl: row.image_url,
      instagramUrl: row.instagram_url,
      sortOrder: row.sort_order ?? 0
    }));
  } catch {
    return ARTISTS_FALLBACK;
  }
}
