-- 실제 DB에는 이미 존재. 레포 마이그레이션만 맞춤 (재실행 안전)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancel_reason text;

COMMENT ON COLUMN public.bookings.cancel_reason IS '취소 사유 (예: admin_cancel, deposit_timeout)';
