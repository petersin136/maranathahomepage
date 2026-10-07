-- =============================================================================
-- HAIR UP — 고객별 관리 메모 (customer_notes)
-- 고객은 별도 테이블 없이 bookings.customer_phone 으로 식별 → 전화번호 1개당 메모 1건
-- Supabase SQL Editor 에 전체 붙여넣고 Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customer_notes (
  customer_phone  text PRIMARY KEY,
  memo            text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_notes IS '고객 상세 페이지의 관리자 메모 (customer_phone 기준)';

CREATE OR REPLACE FUNCTION public.set_customer_notes_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_notes_updated_at ON public.customer_notes;
CREATE TRIGGER trg_customer_notes_updated_at
  BEFORE UPDATE ON public.customer_notes
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_customer_notes_updated_at();

-- 공개 정책 없음 → anon/authenticated 차단, 서버 API(service_role)만 접근
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
