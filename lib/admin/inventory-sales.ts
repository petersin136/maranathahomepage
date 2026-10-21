import { RETAIL_PREFIX, RETAIL_PRODUCTS } from "@/lib/admin/retail-products";

export type RetailQtyInput = {
  catalogKey: string;
  quantity: number;
};

export type RetailAttachInput = {
  catalogKey: string;
  name: string;
  quantity: number;
};

export type SaleMovementPlan = {
  itemId: string;
  quantity: number;
};

export type InventorySaleItem = {
  id: string;
  catalogKey: string | null;
};

export class UnknownRetailError extends Error {
  readonly catalogKey: string;
  constructor(catalogKey: string) {
    super("판매 제품을 찾을 수 없습니다.");
    this.name = "UnknownRetailError";
    this.catalogKey = catalogKey;
  }
}

export function isRetailCatalogKey(value: string) {
  return RETAIL_PRODUCTS.some((row) => row.id === value);
}

export function isRetailServiceId(value: string) {
  return value.startsWith("prod-");
}

export function splitServicesAndRetail(serviceIds: string[] | null | undefined, serviceNames: string[] | null | undefined) {
  const ids = Array.isArray(serviceIds) ? serviceIds.map((id) => String(id)) : [];
  const names = Array.isArray(serviceNames) ? serviceNames.map((name) => String(name)) : [];
  const services: { id: string; name: string }[] = [];
  const retail: { catalogKey: string; name: string }[] = [];
  const len = Math.max(ids.length, names.length);
  for (let i = 0; i < len; i += 1) {
    const id = (ids[i] ?? "").trim();
    const name = names[i] ?? "";
    if (!id && !name) continue;
    if (isRetailServiceId(id) || name.trim().startsWith(RETAIL_PREFIX)) {
      if (id) retail.push({ catalogKey: id, name });
      continue;
    }
    if (id) services.push({ id, name });
  }
  return { services, retail };
}

export function retailQuantitiesFromIds(serviceIds: string[] | null | undefined) {
  const qty: Record<string, number> = {};
  for (const raw of serviceIds ?? []) {
    const id = String(raw);
    if (!isRetailServiceId(id)) continue;
    qty[id] = (qty[id] ?? 0) + 1;
  }
  return qty;
}

export function attachRetailToServices(
  serviceIds: string[] | null | undefined,
  serviceNames: string[] | null | undefined,
  products: RetailAttachInput[]
) {
  const { services } = splitServicesAndRetail(serviceIds, serviceNames);
  const ids = services.map((row) => row.id);
  const names = services.map((row) => row.name);
  for (const product of products) {
    const quantity = Math.max(0, Math.min(99, Math.round(Number(product.quantity) || 0)));
    const name = product.name.trim().startsWith(RETAIL_PREFIX)
      ? product.name.trim()
      : `${RETAIL_PREFIX}${product.name.trim()}`;
    for (let i = 0; i < quantity; i += 1) {
      ids.push(product.catalogKey);
      names.push(name);
    }
  }
  return { service_ids: ids, service_names: names };
}

export function planSaleMovements(
  serviceIds: string[] | null | undefined,
  items: InventorySaleItem[]
): SaleMovementPlan[] {
  const counts = new Map<string, number>();
  for (const raw of serviceIds ?? []) {
    const key = String(raw);
    if (!isRetailServiceId(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const byKey = new Map<string, string>();
  for (const item of items) {
    if (!item.catalogKey) continue;
    byKey.set(item.catalogKey, item.id);
  }

  const planned: SaleMovementPlan[] = [];
  for (const [catalogKey, count] of counts) {
    const itemId = byKey.get(catalogKey);
    if (!itemId) throw new UnknownRetailError(catalogKey);
    planned.push({ itemId, quantity: -count });
  }
  return planned;
}

export function parseRetailProductBody(raw: unknown): { ok: true; products: RetailQtyInput[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "수정할 수 없는 항목입니다." };
  }
  const products: RetailQtyInput[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      return { ok: false, error: "수정할 수 없는 항목입니다." };
    }
    const record = row as Record<string, unknown>;
    const catalogKey = String(record.catalog_key ?? record.catalogKey ?? "").trim();
    if (!catalogKey) return { ok: false, error: "판매 제품을 찾을 수 없습니다." };
    const n = Number(record.quantity);
    if (!Number.isFinite(n) || n < 0 || n > 99) {
      return { ok: false, error: "수정할 수 없는 항목입니다." };
    }
    const quantity = Math.round(n);
    if (quantity === 0) continue;
    products.push({ catalogKey, quantity });
  }
  return { ok: true, products };
}
