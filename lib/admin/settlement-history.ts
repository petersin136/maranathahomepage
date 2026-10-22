import {
  isRetailServiceName,
  productAmountFromNames,
  retailBareName,
  retailPriceFromName
} from "@/lib/admin/retail-products";
import type { SettlementBookingRow } from "@/lib/admin/settlements-data";

export type HistoryKind = "cut" | "perm" | "color" | "care" | "etc";

export const HISTORY_KIND_ORDER: HistoryKind[] = ["cut", "perm", "color", "care", "etc"];

export const HISTORY_KIND_LABEL: Record<HistoryKind, string> = {
  cut: "컷",
  perm: "펌",
  color: "염색",
  care: "케어",
  etc: "기타"
};

const CATALOG: { name: string; kind: HistoryKind; price: number }[] = [
  { name: "기본 컷", kind: "cut", price: 25000 },
  { name: "시그니처 레이어드 / 디자인 컷", kind: "cut", price: 35000 },
  { name: "맨즈 디자인 컷", kind: "cut", price: 60000 },
  { name: "디자인 일반펌", kind: "perm", price: 90000 },
  { name: "디지털 열펌", kind: "perm", price: 160000 },
  { name: "시그니처 볼륨매직", kind: "perm", price: 200000 },
  { name: "베이직 전체 컬러", kind: "color", price: 100000 },
  { name: "프리미엄 케어 컬러", kind: "color", price: 140000 },
  { name: "디자인 탈색 / 발레아쥬 1회 기준", kind: "color", price: 150000 },
  { name: "수분 단백질 집중 케어", kind: "care", price: 80000 },
  { name: "프리미엄 모발 재생 클리닉", kind: "care", price: 150000 },
  { name: "스칼프 두피 스파 케어", kind: "care", price: 70000 }
];

const byName = new Map(CATALOG.map((row) => [row.name, row]));

export type HistoryVisit = {
  id: string;
  bookingDate: string;
  customerName: string;
  paymentMethodLabel: string;
  names: string[];
  amount: number;
};

export type HistoryLine = {
  id: string;
  bookingId: string;
  bookingDate: string;
  customerName: string;
  paymentMethodLabel: string;
  name: string;
  amount: number;
  kind: HistoryKind;
};

export type HistoryKindGroup = {
  kind: HistoryKind;
  label: string;
  count: number;
  amount: number;
  lines: HistoryLine[];
};

function classifyService(name: string): HistoryKind {
  const hit = byName.get(name);
  if (hit) return hit.kind;
  if (/펌|매직/.test(name)) return "perm";
  if (/염색|컬러|탈색|발레아쥬/.test(name)) return "color";
  if (/클리닉|케어|두피/.test(name)) return "care";
  if (/컷|커트/.test(name)) return "cut";
  return "etc";
}

function catalogPrice(name: string) {
  return byName.get(name)?.price ?? 0;
}

function allocate(weights: number[], total: number) {
  if (weights.length === 0) return [];
  const sum = weights.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    const each = Math.floor(total / weights.length);
    const out = weights.map(() => each);
    out[out.length - 1] += total - each * weights.length;
    return out;
  }
  const out = weights.map((value) => Math.floor((total * value) / sum));
  out[out.length - 1] += total - out.reduce((acc, value) => acc + value, 0);
  return out;
}

export function splitSettlementHistory(bookings: SettlementBookingRow[]) {
  const serviceVisits: HistoryVisit[] = [];
  const serviceLines: HistoryLine[] = [];
  const productVisits: HistoryVisit[] = [];
  const productLines: HistoryLine[] = [];

  for (const booking of bookings) {
    const names = booking.serviceNames ?? [];
    const productNames = names.filter((name) => isRetailServiceName(name));
    const serviceNames = names.filter((name) => !isRetailServiceName(name));
    const productTotal = productAmountFromNames(names, booking.amount);
    const serviceTotal = Math.max(0, booking.amount - productTotal);

    if (serviceTotal > 0) {
      const items = serviceNames.length ? serviceNames : ["시술"];
      const amounts = allocate(items.map(catalogPrice), serviceTotal);
      serviceVisits.push({
        id: booking.id,
        bookingDate: booking.bookingDate,
        customerName: booking.customerName,
        paymentMethodLabel: booking.paymentMethodLabel,
        names: items,
        amount: serviceTotal
      });
      items.forEach((name, index) => {
        serviceLines.push({
          id: `${booking.id}:s:${index}`,
          bookingId: booking.id,
          bookingDate: booking.bookingDate,
          customerName: booking.customerName,
          paymentMethodLabel: booking.paymentMethodLabel,
          name,
          amount: amounts[index] ?? 0,
          kind: classifyService(name)
        });
      });
    }

    if (productTotal > 0 && productNames.length) {
      const amounts = allocate(
        productNames.map((name) => retailPriceFromName(name)),
        productTotal
      );
      const lines = productNames.map((name, index) => ({
        id: `${booking.id}:p:${index}`,
        bookingId: booking.id,
        bookingDate: booking.bookingDate,
        customerName: booking.customerName,
        paymentMethodLabel: booking.paymentMethodLabel,
        name: retailBareName(name),
        amount: amounts[index] ?? 0,
        kind: "etc" as const
      }));
      productLines.push(...lines);
      productVisits.push({
        id: booking.id,
        bookingDate: booking.bookingDate,
        customerName: booking.customerName,
        paymentMethodLabel: booking.paymentMethodLabel,
        names: lines.map((line) => line.name),
        amount: productTotal
      });
    }
  }

  const kindGroups: HistoryKindGroup[] = HISTORY_KIND_ORDER.map((kind) => {
    const lines = serviceLines.filter((line) => line.kind === kind);
    return {
      kind,
      label: HISTORY_KIND_LABEL[kind],
      count: lines.length,
      amount: lines.reduce((sum, line) => sum + line.amount, 0),
      lines
    };
  }).filter((group) => group.lines.length);

  return {
    serviceVisits,
    serviceLines,
    productVisits,
    productLines,
    kindGroups,
    serviceCount: serviceVisits.length,
    serviceAmount: serviceVisits.reduce((sum, row) => sum + row.amount, 0),
    productCount: productVisits.length,
    productAmount: productVisits.reduce((sum, row) => sum + row.amount, 0)
  };
}
