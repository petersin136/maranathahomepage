export type Artist = {
  id: string;
  nameKr: string;
  nameEn: string;
  role: string;
  imageUrl: string | null;
  instagramUrl: string | null;
  sortOrder: number;
};

/**
 * Supabase 권장 테이블: public.artists
 *
 * create table public.artists (
 *   id uuid primary key default gen_random_uuid(),
 *   name_kr text not null,
 *   name_en text not null,
 *   role text not null,
 *   image_url text,
 *   instagram_url text,
 *   sort_order int not null default 0,
 *   is_published boolean not null default true,
 *   created_at timestamptz not null default now()
 * );
 */
