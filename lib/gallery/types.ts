export type GallerySlot =
  | "top-left"
  | "top-right"
  | "center"
  | "bottom-left"
  | "bottom-right";

export type GalleryImage = {
  id: string;
  slot: GallerySlot;
  /** Public image URL. null이면 플레이스홀더 표시 */
  src: string | null;
  alt: string;
  sortOrder: number;
};

/**
 * Supabase 권장 테이블: public.gallery_images
 *
 * create table public.gallery_images (
 *   id uuid primary key default gen_random_uuid(),
 *   slot text not null check (slot in (
 *     'top-left','top-right','center','bottom-left','bottom-right'
 *   )),
 *   src text,
 *   alt text not null default '',
 *   sort_order int not null default 0,
 *   is_published boolean not null default true,
 *   created_at timestamptz not null default now()
 * );
 *
 * Storage bucket 예: portfolio-media / gallery/*
 */
