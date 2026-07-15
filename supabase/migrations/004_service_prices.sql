-- =============================================================================
-- HAIR UP — 디자이너별 시술 단가 (service_prices)
-- Supabase SQL Editor 에 전체 붙여넣고 Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.service_prices (
  service_id   text NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  artist_id    text NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  price        integer NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT service_prices_price_non_negative CHECK (price >= 0),
  PRIMARY KEY (service_id, artist_id)
);

CREATE INDEX IF NOT EXISTS service_prices_artist_id_idx
  ON public.service_prices (artist_id);

CREATE OR REPLACE FUNCTION public.set_service_prices_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_prices_updated_at ON public.service_prices;
CREATE TRIGGER trg_service_prices_updated_at
  BEFORE UPDATE ON public.service_prices
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_service_prices_updated_at();

ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;

-- 게시된 시술의 단가만 공개 조회 (손님 예약 화면용)
DROP POLICY IF EXISTS "service_prices_select_published" ON public.service_prices;
CREATE POLICY "service_prices_select_published"
  ON public.service_prices
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id AND s.is_published = true
    )
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.is_published = true
    )
  );

-- INSERT/UPDATE/DELETE: 공개 차단 (service_role만)

-- 기존 시술×디자이너 조합에 기본가(services.price)로 시드
INSERT INTO public.service_prices (service_id, artist_id, price)
SELECT s.id, a.id, s.price
FROM public.services s
CROSS JOIN public.artists a
ON CONFLICT (service_id, artist_id) DO NOTHING;
