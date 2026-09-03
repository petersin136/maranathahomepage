import { getSupabase } from "@/lib/supabase/client";
import type { Artist } from "@/lib/artists/types";

export const ARTIST_IMAGES: Record<string, string> = {
  jay: "/artists/jay.png",
  seoa: "/artists/seoa.jpg",
  kai: "/artists/kai.jpg",
  yumi: "/artists/yumi.jpg"
};

export const ARTISTS_FALLBACK: Artist[] = [
  {
    id: "jay",
    nameKr: "재이",
    nameEn: "JAY",
    role: "Owner & Senior Stylist",
    imageUrl: ARTIST_IMAGES.jay,
    instagramUrl: "https://www.instagram.com/hairup_official/",
    sortOrder: 0
  },
  {
    id: "seoa",
    nameKr: "서아",
    nameEn: "SEOA",
    role: "Stylist",
    imageUrl: ARTIST_IMAGES.seoa,
    instagramUrl: "https://www.instagram.com/hairup_official/",
    sortOrder: 1
  },
  {
    id: "kai",
    nameKr: "카이",
    nameEn: "KAI",
    role: "Stylist",
    imageUrl: ARTIST_IMAGES.kai,
    instagramUrl: "https://www.instagram.com/hairup_official/",
    sortOrder: 2
  },
  {
    id: "yumi",
    nameKr: "유미",
    nameEn: "YUMI",
    role: "Stylist",
    imageUrl: ARTIST_IMAGES.yumi,
    instagramUrl: "https://www.instagram.com/hairup_official/",
    sortOrder: 3
  }
];

function resolveArtistImage(id: string, imageUrl: string | null): string | null {
  return imageUrl || ARTIST_IMAGES[id] || null;
}

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
      imageUrl: resolveArtistImage(row.id, row.image_url),
      instagramUrl: row.instagram_url,
      sortOrder: row.sort_order ?? 0
    }));
  } catch {
    return ARTISTS_FALLBACK;
  }
}
