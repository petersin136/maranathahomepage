-- =============================================================================
-- HAIR UP — bookings 테이블 마이그레이션
-- Supabase Dashboard > SQL Editor 에 전체 붙여넣고 Run
-- =============================================================================

-- 필수 확장 (uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1) 테이블
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- 예약 일정
  booking_date    date NOT NULL,
  booking_time    text NOT NULL,

  -- 디자이너 (id + 스냅샷 이름)
  artist_id       text NOT NULL,
  artist_name     text,

  -- 시술 (id 배열 + 스냅샷 이름들)
  service_ids     text[] NOT NULL,
  service_names   text[],

  -- 고객
  customer_name   text NOT NULL,
  customer_gender text,
  customer_phone  text NOT NULL,
  privacy_agreed  boolean NOT NULL,

  -- 운영
  status          text NOT NULL DEFAULT 'pending',
  deposit_paid    boolean NOT NULL DEFAULT false,
  admin_memo      text,

  -- 금액 (NULL 허용 — 나중에 대시보드/매출용)
  total_amount    integer,
  deposit_amount  integer,

  -- 제약
  CONSTRAINT bookings_customer_gender_check
    CHECK (customer_gender IS NULL OR customer_gender IN ('W', 'M')),

  CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'noshow')),

  CONSTRAINT bookings_privacy_agreed_check
    CHECK (privacy_agreed = true),

  CONSTRAINT bookings_service_ids_not_empty
    CHECK (cardinality(service_ids) >= 1),

  CONSTRAINT bookings_booking_time_not_empty
    CHECK (char_length(trim(booking_time)) > 0),

  CONSTRAINT bookings_amounts_non_negative
    CHECK (
      (total_amount IS NULL OR total_amount >= 0)
      AND (deposit_amount IS NULL OR deposit_amount >= 0)
    )
);

COMMENT ON TABLE public.bookings IS 'HAIR UP salon bookings';
COMMENT ON COLUMN public.bookings.artist_name IS '디자이너 표시명 스냅샷 (생성 시점)';
COMMENT ON COLUMN public.bookings.service_names IS '시술명 스냅샷 배열 (생성 시점)';
COMMENT ON COLUMN public.bookings.total_amount IS '총 시술 금액(원). NULL 허용';
COMMENT ON COLUMN public.bookings.deposit_amount IS '예약금(원). NULL 허용 / PG 미연동 시 관리자 수동';
COMMENT ON COLUMN public.bookings.deposit_paid IS '예약금 입금 여부 (관리자 수동 체크)';
COMMENT ON COLUMN public.bookings.status IS 'pending|confirmed|completed|cancelled|noshow';

-- -----------------------------------------------------------------------------
-- 2) 인덱스
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS bookings_booking_date_idx ON public.bookings (booking_date);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_artist_id_idx ON public.bookings (artist_id);
CREATE INDEX IF NOT EXISTS bookings_deposit_paid_idx ON public.bookings (deposit_paid);

-- -----------------------------------------------------------------------------
-- 3) updated_at 자동 갱신 트리거
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_bookings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_bookings_updated_at();

-- -----------------------------------------------------------------------------
-- 4) RLS
--    - 손님(anon/authenticated): INSERT만 (생성 시 pending + deposit_paid=false)
--    - SELECT / UPDATE / DELETE: 공개 정책 없음 → 클라이언트 직접 조회·수정 불가
--    - 서버 API / 관리자는 service_role 키 사용 (RLS 우회)
-- -----------------------------------------------------------------------------
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있으면 정리 후 재생성 (재실행 안전)
DROP POLICY IF EXISTS "bookings_insert_public" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_none" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_none" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_none" ON public.bookings;

CREATE POLICY "bookings_insert_public"
  ON public.bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    privacy_agreed = true
    AND status = 'pending'
    AND deposit_paid = false
  );

-- SELECT / UPDATE / DELETE 정책은 의도적으로 없음 (anon·authenticated 차단)
-- service_role 은 RLS를 우회하므로 서버 API·관리자 도구에서 사용

-- -----------------------------------------------------------------------------
-- 5) (선택) Realtime 필요 시 주석 해제
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
-- -----------------------------------------------------------------------------
