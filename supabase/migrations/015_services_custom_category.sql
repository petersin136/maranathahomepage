-- 매장 고유 시술(기타/직접 입력) 카테고리 허용
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_category_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_category_check
  CHECK (char_length(btrim(category)) BETWEEN 1 AND 40);
