-- 디자이너 주 1회 정기 휴무 (캘린더 주간 열 표시)
-- 0=일 ~ 6=토, NULL = 휴무 없음. 주 2회·날짜 지정 임시휴무는 범위 밖.
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS day_off smallint;

ALTER TABLE public.artists
  DROP CONSTRAINT IF EXISTS artists_day_off_check;

ALTER TABLE public.artists
  ADD CONSTRAINT artists_day_off_check
  CHECK (day_off IS NULL OR (day_off >= 0 AND day_off <= 6));

COMMENT ON COLUMN public.artists.day_off IS '정기 휴무 요일 (0=일 ~ 6=토, NULL = 없음)';
