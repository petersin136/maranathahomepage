-- =============================================================================
-- HAIR UP — artists / services 테이블 + 시드
-- Supabase SQL Editor 에 전체 붙여넣고 Run
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1) artists
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.artists (
  id              text PRIMARY KEY,
  name_kr         text NOT NULL,
  name_en         text NOT NULL,
  role            text NOT NULL DEFAULT 'Stylist',
  image_url       text,
  instagram_url   text,
  sort_order      integer NOT NULL DEFAULT 0,
  is_published    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artists_sort_order_idx ON public.artists (sort_order);
CREATE INDEX IF NOT EXISTS artists_is_published_idx ON public.artists (is_published);

CREATE OR REPLACE FUNCTION public.set_artists_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_artists_updated_at ON public.artists;
CREATE TRIGGER trg_artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_artists_updated_at();

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artists_select_published" ON public.artists;
CREATE POLICY "artists_select_published"
  ON public.artists
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- INSERT/UPDATE/DELETE: 정책 없음 → 공개 차단 (service_role만)

-- -----------------------------------------------------------------------------
-- 2) services
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id                 text PRIMARY KEY,
  category           text NOT NULL,
  name               text NOT NULL,
  price              integer NOT NULL,
  duration_minutes   integer NOT NULL DEFAULT 60,
  deposit_amount     integer,
  sort_order         integer NOT NULL DEFAULT 0,
  is_published       boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT services_category_check
    CHECK (category IN ('Cut', 'Perm', 'Color', 'Clinic')),
  CONSTRAINT services_price_non_negative
    CHECK (price >= 0),
  CONSTRAINT services_duration_positive
    CHECK (duration_minutes > 0),
  CONSTRAINT services_deposit_non_negative
    CHECK (deposit_amount IS NULL OR deposit_amount >= 0)
);

CREATE INDEX IF NOT EXISTS services_category_idx ON public.services (category);
CREATE INDEX IF NOT EXISTS services_sort_order_idx ON public.services (sort_order);
CREATE INDEX IF NOT EXISTS services_is_published_idx ON public.services (is_published);

CREATE OR REPLACE FUNCTION public.set_services_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_services_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_published" ON public.services;
CREATE POLICY "services_select_published"
  ON public.services
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- -----------------------------------------------------------------------------
-- 3) 시드 (기존 Booking 하드코딩과 동일 id)
-- -----------------------------------------------------------------------------
INSERT INTO public.artists (id, name_kr, name_en, role, sort_order, is_published) VALUES
  ('jay',  '재이', 'JAY',  'Owner & Senior Stylist', 0, true),
  ('seoa', '서아', 'SEOA', 'Stylist', 1, true),
  ('kai',  '카이', 'KAI',  'Stylist', 2, true),
  ('yumi', '유미', 'YUMI', 'Stylist', 3, true)
ON CONFLICT (id) DO UPDATE SET
  name_kr = EXCLUDED.name_kr,
  name_en = EXCLUDED.name_en,
  role = EXCLUDED.role,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published;

INSERT INTO public.services (id, category, name, price, duration_minutes, deposit_amount, sort_order, is_published) VALUES
  ('cut-basic',      'Cut',    '기본 컷',                          25000,  40, 10000, 0, true),
  ('cut-signature',  'Cut',    '시그니처 레이어드 / 디자인 컷',     35000,  60, 10000, 1, true),
  ('cut-mens',       'Cut',    '맨즈 디자인 컷',                   60000,  50, 20000, 2, true),
  ('perm-design',    'Perm',   '디자인 일반펌',                    90000, 120, 30000, 0, true),
  ('perm-digital',   'Perm',   '디지털 열펌',                     160000, 150, 50000, 1, true),
  ('perm-volume',    'Perm',   '시그니처 볼륨매직',               200000, 180, 50000, 2, true),
  ('color-basic',    'Color',  '베이직 전체 컬러',                100000, 120, 30000, 0, true),
  ('color-premium',  'Color',  '프리미엄 케어 컬러',              140000, 150, 40000, 1, true),
  ('color-bleach',   'Color',  '디자인 탈색 / 발레아쥬 1회 기준', 150000, 180, 50000, 2, true),
  ('clinic-protein', 'Clinic', '수분 단백질 집중 케어',            80000,  60, 20000, 0, true),
  ('clinic-regen',   'Clinic', '프리미엄 모발 재생 클리닉',       150000,  90, 40000, 1, true),
  ('clinic-scalp',   'Clinic', '스칼프 두피 스파 케어',            70000,  50, 20000, 2, true)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes,
  deposit_amount = EXCLUDED.deposit_amount,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published;
