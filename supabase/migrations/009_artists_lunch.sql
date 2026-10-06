-- 디자이너별 점심시간 (캘린더 일간 타임테이블 표시 + 예약 가능 슬롯 판정)
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS lunch_start time,
  ADD COLUMN IF NOT EXISTS lunch_minutes integer DEFAULT 30;

COMMENT ON COLUMN public.artists.lunch_start IS '점심 시작 시각 (NULL = 점심시간 없음)';
COMMENT ON COLUMN public.artists.lunch_minutes IS '점심 시간(분)';
