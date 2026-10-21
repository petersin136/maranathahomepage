-- =============================================================================
-- HAIR UP — 재고 (inventory_items, inventory_movements)
-- 공개 정책 없음 → anon/authenticated 차단, 서버 API(service_role)만 접근
-- 현재 재고 = movements.quantity 합계 (부호 있는 정수)
-- Supabase SQL Editor 에 전체 붙여넣고 Run
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1) inventory_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL,
  catalog_key   text,
  name          text NOT NULL,
  unit          text NOT NULL DEFAULT '개',
  cost_price    integer NOT NULL,
  sale_price    integer,
  safety_stock  integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_kind_check
    CHECK (kind IN ('retail', 'material')),
  CONSTRAINT inventory_items_name_not_empty
    CHECK (char_length(trim(name)) > 0),
  CONSTRAINT inventory_items_unit_not_empty
    CHECK (char_length(trim(unit)) > 0),
  CONSTRAINT inventory_items_cost_price_non_negative
    CHECK (cost_price >= 0),
  CONSTRAINT inventory_items_sale_price_non_negative
    CHECK (sale_price IS NULL OR sale_price >= 0),
  CONSTRAINT inventory_items_retail_sale_price_check
    CHECK (kind <> 'retail' OR sale_price IS NOT NULL),
  CONSTRAINT inventory_items_material_sale_price_check
    CHECK (kind <> 'material' OR sale_price IS NULL),
  CONSTRAINT inventory_items_safety_stock_non_negative
    CHECK (safety_stock >= 0),
  CONSTRAINT inventory_items_catalog_key_key UNIQUE (catalog_key)
);

COMMENT ON TABLE public.inventory_items IS '판매 제품(retail) · 시술 약제(material) 품목. 수량은 movements 합계';
COMMENT ON COLUMN public.inventory_items.kind IS 'retail | material';
COMMENT ON COLUMN public.inventory_items.catalog_key IS '코드 카탈로그 RETAIL_PRODUCTS.id (prod-…) 와 1:1. material 은 NULL';
COMMENT ON COLUMN public.inventory_items.cost_price IS '입고가(원)';
COMMENT ON COLUMN public.inventory_items.sale_price IS '판매가(원). retail 필수, material NULL';
COMMENT ON COLUMN public.inventory_items.safety_stock IS '이 수량 이하면 부족 알림. 0이면 품절만';

CREATE INDEX IF NOT EXISTS inventory_items_kind_sort_idx
  ON public.inventory_items (kind, sort_order, name);

CREATE OR REPLACE FUNCTION public.set_inventory_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_inventory_items_updated_at();

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
-- SELECT/INSERT/UPDATE/DELETE 정책 없음 → anon·authenticated 차단, service_role만

-- -----------------------------------------------------------------------------
-- 2) inventory_movements
--    quantity 부호: in = 양수, out_sale/out_use = 음수, adjust = 양·음 모두
--    현재 재고 = SUM(quantity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid NOT NULL REFERENCES public.inventory_items (id) ON DELETE RESTRICT,
  type         text NOT NULL,
  quantity     integer NOT NULL,
  unit_cost    integer,
  booking_id   uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
  memo         text,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users (id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movements_type_check
    CHECK (type IN ('in', 'out_sale', 'out_use', 'adjust')),
  CONSTRAINT inventory_movements_quantity_not_zero
    CHECK (quantity <> 0),
  CONSTRAINT inventory_movements_quantity_sign_check
    CHECK (
      (type = 'in' AND quantity > 0)
      OR (type IN ('out_sale', 'out_use') AND quantity < 0)
      OR type = 'adjust'
    ),
  CONSTRAINT inventory_movements_unit_cost_non_negative
    CHECK (unit_cost IS NULL OR unit_cost >= 0)
);

COMMENT ON TABLE public.inventory_movements IS '입고·판매출고·시술소진·조정. 재고 = SUM(quantity)';
COMMENT ON COLUMN public.inventory_movements.type IS 'in 입고 | out_sale 판매 | out_use 시술 소진 | adjust 조정';
COMMENT ON COLUMN public.inventory_movements.quantity IS 'in 양수, out_sale/out_use 음수, adjust 부호 자유. 0 금지';
COMMENT ON COLUMN public.inventory_movements.unit_cost IS '입고 시 단가(원). 그 외 NULL 가능';
COMMENT ON COLUMN public.inventory_movements.booking_id IS '판매 출고와 예약 연결. 예약 삭제 시 NULL';
COMMENT ON COLUMN public.inventory_movements.occurred_at IS '발생 시각(timestamptz). 앱에서 KST 시각을 넣어 저장';
COMMENT ON COLUMN public.inventory_movements.created_by IS 'admin auth.users.id';

CREATE INDEX IF NOT EXISTS inventory_movements_item_occurred_idx
  ON public.inventory_movements (item_id, occurred_at);

CREATE INDEX IF NOT EXISTS inventory_movements_booking_id_idx
  ON public.inventory_movements (booking_id)
  WHERE booking_id IS NOT NULL;

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
-- SELECT/INSERT/UPDATE/DELETE 정책 없음 → anon·authenticated 차단, service_role만

-- -----------------------------------------------------------------------------
-- 3) 현재 재고 view (security_invoker → 아래 테이블 RLS 그대로)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.inventory_stock
WITH (security_invoker = true) AS
SELECT
  item_id,
  COALESCE(SUM(quantity), 0)::bigint AS qty
FROM public.inventory_movements
GROUP BY item_id;

COMMENT ON VIEW public.inventory_stock IS '품목별 현재 재고 = movements.quantity 합계';
