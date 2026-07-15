-- 고객 요청사항 (선택)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_request text;

COMMENT ON COLUMN public.bookings.customer_request IS '고객 요청사항 (선택 입력)';
