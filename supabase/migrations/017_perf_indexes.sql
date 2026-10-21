-- =============================================================================
-- HAIR UP — 조회 성능 인덱스 (실행은 대시보드/CLI에서 별도)
-- 기존과 중복되지 않는 컬럼만. CREATE INDEX IF NOT EXISTS.
-- 이미 있음: bookings(booking_date), (status), (created_at DESC), (artist_id),
--   (deposit_paid), (status, booking_date);
--   inventory_items(kind, sort_order), inventory_movements(item_id, occurred_at);
--   settlement_closes UNIQUE(year_month), settlement_payouts UNIQUE(year_month, artist_id);
--   admin_users PK(user_id), customer_notes PK(customer_phone)
-- =============================================================================

-- 매출·지출 월 집계: status=completed AND paid_at 범위
CREATE INDEX IF NOT EXISTS bookings_paid_at_idx
  ON public.bookings (paid_at);

CREATE INDEX IF NOT EXISTS bookings_status_paid_at_idx
  ON public.bookings (status, paid_at);

-- 고객 상세·캘린더 방문 이력: customer_phone IN (...)
CREATE INDEX IF NOT EXISTS bookings_customer_phone_idx
  ON public.bookings (customer_phone);

-- 캘린더 담당자+기간
CREATE INDEX IF NOT EXISTS bookings_artist_id_booking_date_idx
  ON public.bookings (artist_id, booking_date);

-- 지출 월 조회: expense_date 범위
CREATE INDEX IF NOT EXISTS expenses_expense_date_idx
  ON public.expenses (expense_date);
