export const RETAIL_PREFIX = "[제품] ";

/** 디자이너 제품 판매 인센. 살롱 리테일 관행(판매가의 10~20%) 가운데 15%. */
export const PRODUCT_DESIGNER_RATE = 15;

/**
 * 시중 살롱 납품가에 가깝게 잡은 데모 카탈로그.
 * 수입 프리미엄은 판매가의 약 55%, 하우스 브랜드는 약 38%.
 */
export const RETAIL_PRODUCTS = [
  { id: "prod-oribe-shampoo", name: "오리베 골드 샴푸 250ml", price: 48000, cost: 26400 },
  { id: "prod-oribe-cond", name: "오리베 컨디셔너 250ml", price: 48000, cost: 26400 },
  { id: "prod-kerastase-oil", name: "케라스타즈 엘릭서 얼팀 오일", price: 62000, cost: 34100 },
  { id: "prod-molton-shampoo", name: "몰튼브라운 리페어 샴푸", price: 42000, cost: 23100 },
  { id: "prod-ampoule", name: "헤어업 홈케어 앰플 세트", price: 38000, cost: 14400 },
  { id: "prod-scalp-kit", name: "두피 스케일링 홈키트", price: 35000, cost: 13300 },
  { id: "prod-curl-essence", name: "컬링 에센스", price: 28000, cost: 10600 }
] as const;

export type RetailProduct = (typeof RETAIL_PRODUCTS)[number];

const byId = new Map<string, RetailProduct>(RETAIL_PRODUCTS.map((row) => [row.id, row]));
const byName = new Map<string, RetailProduct>(RETAIL_PRODUCTS.map((row) => [row.name, row]));

export function isRetailServiceName(name: string) {
  return name.trim().startsWith(RETAIL_PREFIX);
}

export function retailBareName(name: string) {
  const trimmed = name.trim();
  return isRetailServiceName(trimmed) ? trimmed.slice(RETAIL_PREFIX.length).trim() : trimmed;
}

export function retailProductFromName(name: string): RetailProduct | null {
  const trimmed = name.trim();
  if (!isRetailServiceName(trimmed)) return null;
  return byName.get(retailBareName(trimmed)) ?? null;
}

export function retailPriceFromName(name: string) {
  return retailProductFromName(name)?.price ?? 0;
}

export function retailCostFromName(name: string) {
  return retailProductFromName(name)?.cost ?? 0;
}

export function retailPriceFromId(id: string) {
  return byId.get(id)?.price ?? 0;
}

export function retailCostFromId(id: string) {
  return byId.get(id)?.cost ?? 0;
}

export type RetailLine = {
  id: string;
  name: string;
  price: number;
  cost: number;
};

export function retailLinesFromNames(serviceNames: string[] | null | undefined): RetailLine[] {
  const names = Array.isArray(serviceNames) ? serviceNames : [];
  const lines: RetailLine[] = [];
  for (const raw of names) {
    const product = retailProductFromName(String(raw || ""));
    if (!product) continue;
    lines.push({
      id: product.id,
      name: product.name,
      price: product.price,
      cost: product.cost
    });
  }
  return lines;
}

/** 결제 한 건에서 제품 금액. 이름 기준으로 합산하고, 총액을 넘지 않게 자른다. */
export function productAmountFromNames(serviceNames: string[] | null | undefined, totalAmount: number) {
  const names = Array.isArray(serviceNames) ? serviceNames : [];
  let product = 0;
  for (const raw of names) {
    product += retailPriceFromName(String(raw || ""));
  }
  if (product <= 0) return 0;
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return product;
  return Math.min(product, totalAmount);
}

export type ProductEconomics = {
  retail: number;
  cost: number;
  margin: number;
  designerIncentive: number;
  shopKeep: number;
};

function scaleCost(retail: number, rawRetail: number, rawCost: number) {
  if (rawRetail <= 0) return 0;
  if (retail >= rawRetail) return rawCost;
  return Math.floor((rawCost * retail) / rawRetail);
}

export function productEconomicsFromNames(
  serviceNames: string[] | null | undefined,
  totalAmount: number
): ProductEconomics {
  const lines = retailLinesFromNames(serviceNames);
  const rawRetail = lines.reduce((sum, line) => sum + line.price, 0);
  const rawCost = lines.reduce((sum, line) => sum + line.cost, 0);
  const retail =
    Number.isFinite(totalAmount) && totalAmount > 0 ? Math.min(rawRetail, Math.max(0, totalAmount)) : rawRetail;
  const cost = scaleCost(retail, rawRetail, rawCost);
  const designerIncentive = Math.floor((retail * PRODUCT_DESIGNER_RATE) / 100);
  const margin = retail - cost;
  return {
    retail,
    cost,
    margin,
    designerIncentive,
    shopKeep: margin - designerIncentive
  };
}

export function designerPaySplit(args: {
  totalAmount: number;
  serviceNames: string[] | null | undefined;
  commissionRate: number;
  hasCommission: boolean;
}) {
  const product = productEconomicsFromNames(args.serviceNames, args.totalAmount);
  const serviceAmount = Math.max(0, args.totalAmount - product.retail);
  const serviceIncentive = args.hasCommission
    ? Math.floor((serviceAmount * args.commissionRate) / 100)
    : 0;
  const productIncentive = args.hasCommission ? product.designerIncentive : 0;
  return {
    serviceAmount,
    productRetail: product.retail,
    productCost: product.cost,
    productMargin: product.margin,
    serviceIncentive,
    productIncentive,
    incentive: serviceIncentive + productIncentive
  };
}
