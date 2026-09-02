import { getSupabase } from "@/lib/supabase/client";
import type { GalleryImage, GallerySlot } from "@/lib/gallery/types";

const SLOTS: GallerySlot[] = [
  "top-left",
  "top-right",
  "center",
  "bottom-left",
  "bottom-right"
];

export const GALLERY_IMAGES: Record<GallerySlot, string> = {
  "top-left": "/gallery/top-left.jpg",
  "top-right": "/gallery/top-right.png",
  center: "/gallery/center.jpg",
  "bottom-left": "/gallery/bottom-left.jpg",
  "bottom-right": "/gallery/bottom-right.png"
};

/** 시안 레이아웃용 기본 슬롯 */
export const GALLERY_FALLBACK: GalleryImage[] = SLOTS.map((slot, index) => ({
  id: `fallback-${slot}`,
  slot,
  src: GALLERY_IMAGES[slot],
  alt: `Selected look ${index + 1}`,
  sortOrder: index
}));

function normalizeRow(row: {
  id: string;
  slot: string;
  src: string | null;
  alt: string | null;
  sort_order: number | null;
}): GalleryImage | null {
  if (!SLOTS.includes(row.slot as GallerySlot)) return null;
  const slot = row.slot as GallerySlot;
  return {
    id: row.id,
    slot,
    src: row.src || GALLERY_IMAGES[slot],
    alt: row.alt ?? "",
    sortOrder: row.sort_order ?? 0
  };
}

/**
 * 갤러리 이미지 조회.
 * - Supabase 설정 + gallery_images 데이터가 있으면 로드
 * - 아니면 5슬롯 로컬 원본 유지 (레이아웃 고정)
 */
export async function getGalleryImages(): Promise<GalleryImage[]> {
  const supabase = getSupabase();
  if (!supabase) return GALLERY_FALLBACK;

  try {
    const { data, error } = await supabase
      .from("gallery_images")
      .select("id, slot, src, alt, sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) return GALLERY_FALLBACK;

    const bySlot = new Map<GallerySlot, GalleryImage>();
    for (const row of data) {
      const item = normalizeRow(row);
      if (!item) continue;
      if (!bySlot.has(item.slot)) bySlot.set(item.slot, item);
    }

    return SLOTS.map(
      (slot, index) =>
        bySlot.get(slot) ?? {
          id: `fallback-${slot}`,
          slot,
          src: GALLERY_IMAGES[slot],
          alt: `Selected look ${index + 1}`,
          sortOrder: index
        }
    );
  } catch {
    return GALLERY_FALLBACK;
  }
}
