import { isYmd, kstDayEndExclusiveIso, kstDayStartIso, todayKst } from "@/lib/admin/sales-data";

export const INVENTORY_KINDS = ["retail", "material"] as const;
export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export const INVENTORY_MOVEMENT_TYPES = ["in", "out_sale", "out_use", "adjust"] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const INVENTORY_WRITE_TYPES = ["in", "out_use", "adjust"] as const;
export type InventoryWriteType = (typeof INVENTORY_WRITE_TYPES)[number];

export type InventoryBadge = "품절" | "부족" | "정상";

export type InventoryItemRow = {
  id: string;
  kind: InventoryKind;
  catalogKey: string | null;
  name: string;
  unit: string;
  costPrice: number;
  salePrice: number | null;
  safetyStock: number;
  isActive: boolean;
  sortOrder: number;
  qty: number;
  badge: InventoryBadge;
  monthIn: number;
  monthOutSale: number;
  monthOutUse: number;
};

export type InventoryMovementRow = {
  id: string;
  itemId: string;
  itemName: string;
  kind: InventoryKind;
  type: InventoryMovementType;
  quantity: number;
  unitCost: number | null;
  bookingId: string | null;
  bookingCustomerName: string | null;
  bookingDate: string | null;
  memo: string | null;
  occurredAt: string;
  createdBy: string | null;
};

export function isInventoryKind(value: string): value is InventoryKind {
  return (INVENTORY_KINDS as readonly string[]).includes(value);
}

export function isInventoryMovementType(value: string): value is InventoryMovementType {
  return (INVENTORY_MOVEMENT_TYPES as readonly string[]).includes(value);
}

export function isInventoryWriteType(value: string): value is InventoryWriteType {
  return (INVENTORY_WRITE_TYPES as readonly string[]).includes(value);
}

export function inventoryBadge(qty: number, safetyStock: number): InventoryBadge {
  if (qty <= 0) return "품절";
  if (safetyStock > 0 && qty <= safetyStock) return "부족";
  return "정상";
}

export function kindLabel(kind: InventoryKind) {
  return kind === "retail" ? "판매 제품" : "시술 약제";
}

export function movementTypeLabel(type: InventoryMovementType) {
  if (type === "in") return "입고";
  if (type === "out_sale") return "판매";
  if (type === "out_use") return "소진";
  return "조정";
}

export function resolveInventoryMonth(yearRaw: string | null, monthRaw: string | null) {
  const today = todayKst();
  const [ty, tm] = today.split("-").map(Number);
  const year = yearRaw == null || yearRaw === "" ? ty : Number(yearRaw);
  const month = monthRaw == null || monthRaw === "" ? tm : Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { error: "연·월이 올바르지 않습니다." } as const;
  }
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  if (!isYmd(from)) return { error: "연·월이 올바르지 않습니다." } as const;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const toYmd = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return {
    year,
    month,
    from: from,
    to: toYmd,
    fromIso: kstDayStartIso(from),
    toExclusiveIso: kstDayEndExclusiveIso(toYmd)
  };
}

export function parseNonNegInt(value: unknown) {
  if (value == null || value === "") return { error: true } as const;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { error: true } as const;
  return { value: Math.round(n) } as const;
}

export function parsePositiveInt(value: unknown) {
  if (value == null || value === "") return { error: true } as const;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return { error: true } as const;
  return { value: Math.round(n) } as const;
}

export function parseSignedInt(value: unknown) {
  if (value == null || value === "") return { error: true } as const;
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return { error: true } as const;
  return { value: Math.round(n) } as const;
}

export function kstLocalToIso(local: string) {
  const trimmed = local.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const sec = match[3] ?? "00";
  return `${match[1]}T${match[2]}:${sec}+09:00`;
}

export function formatOccurredAtKst(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}. ${get("month")}. ${get("day")} ${get("hour")}:${get("minute")}`;
}

export function nowKstLocalInput() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export const ITEM_FIELDS =
  "id, kind, catalog_key, name, unit, cost_price, sale_price, safety_stock, is_active, sort_order, created_at, updated_at";

export const MOVEMENT_FIELDS =
  "id, item_id, type, quantity, unit_cost, booking_id, memo, occurred_at, created_by, created_at";
