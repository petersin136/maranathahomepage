-- =============================================================================
-- HAIR UP — 정산 마감·지급 완료 (settlement_closes, settlement_payouts)
-- salons / salon_id 없음 → unique 는 year_month (및 artist_id) 만
-- 공개 정책 없음 → anon/authenticated 차단, 서버 API(service_role)만 접근
-- Supabase SQL Editor 에 전체 붙여넣고 Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.settlement_closes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month       text NOT NULL,
  closed_at        timestamptz NOT NULL DEFAULT now(),
  closed_by        uuid REFERENCES auth.users (id),
  notify_requested boolean NOT NULL DEFAULT false,
  snapshot         jsonb NOT NULL,
  CONSTRAINT settlement_closes_year_month_check CHECK (year_month ~ '^\d{4}-\d{2}$'),
  CONSTRAINT settlement_closes_year_month_key UNIQUE (year_month)
);

COMMENT ON TABLE public.settlement_closes IS '월 정산 마감. snapshot 은 마감 시점 정산 결과(행·합계) 전체';
COMMENT ON COLUMN public.settlement_closes.year_month IS 'YYYY-MM';
COMMENT ON COLUMN public.settlement_closes.notify_requested IS '마감 시 명세서 알림톡 발송 요청 여부. 발송 수단은 아직 없음';

CREATE TABLE IF NOT EXISTS public.settlement_payouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month  text NOT NULL,
  artist_id   text NOT NULL REFERENCES public.artists (id),
  paid_at     timestamptz NOT NULL DEFAULT now(),
  paid_by     uuid REFERENCES auth.users (id),
  CONSTRAINT settlement_payouts_year_month_check CHECK (year_month ~ '^\d{4}-\d{2}$'),
  CONSTRAINT settlement_payouts_year_month_artist_key UNIQUE (year_month, artist_id)
);

COMMENT ON TABLE public.settlement_payouts IS '월·디자이너 단위 지급 완료';

ALTER TABLE public.settlement_closes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payouts ENABLE ROW LEVEL SECURITY;
