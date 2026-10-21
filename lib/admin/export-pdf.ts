import { expenseCategoryLabel, expensePaymentLabel } from "@/lib/admin/expense-categories";
import type { SettlementArtistRow, SettlementSummary } from "@/lib/admin/settlements-data";
import { paidAtToKstYearMonth, shopDisplayName } from "@/lib/admin/tax-data";
import type { ShopSettings, TaxType } from "@/lib/admin/tax-data";
import type { ExportExpenseRow, ExportSaleRow } from "@/lib/admin/export-workbook";
import { METHOD_LABEL } from "@/lib/admin/sales-data";
import { isSettlementMonthClosed } from "@/lib/admin/salon-name";
import {
  createReportDoc,
  drawCover,
  drawHeader,
  drawKpis,
  drawSharePair,
  drawTable,
  finalizeFooters,
  won,
  type HeaderSpec
} from "@/lib/admin/pdf/report-kit";

const TAX_TYPE_LABEL: Record<TaxType, string> = {
  general: "일반과세자",
  simplified: "간이과세자"
};

const METHOD_TONE = { card: "#2F3A2F", transfer: "#8A847C", cash: "#9A948C" } as const;

export type MonthlyClosePdfInput = {
  year: number;
  month: number;
  settings: ShopSettings | null;
  sales: ExportSaleRow[];
  expenses: ExportExpenseRow[];
  artists: SettlementArtistRow[];
  summary: SettlementSummary;
  generatedAtIso: string;
  salesTotal: number;
  expenseTotal: number;
  methodTotals: { card: number; cash: number; transfer: number };
  proofExpenseTotal: number;
  missingProofCount: number;
  cashReceiptMissingCount: number;
  cashReceiptMissingAmount: number;
};

function paidLabel(iso: string) {
  return paidAtToKstYearMonth(iso).ymd.replace(/-/g, ". ");
}

function dotYmd(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || "—";
  const [, m, d] = ymd.split("-");
  return `${m}. ${d}`;
}

function generatedLabel(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));
}

function remainderPercents(amounts: number[]) {
  const total = amounts.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return amounts.map(() => 0);
  const raw = amounts.map((value) => (value / total) * 100);
  const floors = raw.map((value) => Math.floor(value));
  let rest = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value), amount: amounts[index] }))
    .sort((a, b) => b.frac - a.frac || b.amount - a.amount);
  for (const item of order) {
    if (rest <= 0) break;
    floors[item.index] += 1;
    rest -= 1;
  }
  return floors;
}

export async function buildMonthlyClosePdf(input: MonthlyClosePdfInput): Promise<Buffer> {
  const salon = shopDisplayName(input.settings);
  const reportName = "월 마감 자료";
  const periodLabel = `${input.year}년 ${input.month}월`;
  const closed = await isSettlementMonthClosed(input.year, input.month);
  const chip = closed ? { text: "마감 확정", filled: true } : { text: "집계 중", filled: false };
  const issuedAt = new Date(input.generatedAtIso);
  const diff = input.salesTotal - input.expenseTotal;
  const tax = input.settings?.tax_type ? TAX_TYPE_LABEL[input.settings.tax_type] : "";
  const subtitle = [input.settings?.business_number, tax, `작성 ${generatedLabel(input.generatedAtIso)}`]
    .filter(Boolean)
    .join(" · ");
  const methods = [
    { key: "card" as const, label: METHOD_LABEL.card, amount: input.methodTotals.card },
    { key: "transfer" as const, label: METHOD_LABEL.transfer, amount: input.methodTotals.transfer },
    { key: "cash" as const, label: METHOD_LABEL.cash, amount: input.methodTotals.cash }
  ];
  const methodPercents = remainderPercents(methods.map((row) => row.amount));
  const missingAmount = Math.max(0, input.expenseTotal - input.proofExpenseTotal);
  const proofRows = [
    { label: "증빙 있는 지출", amount: input.proofExpenseTotal },
    { label: `증빙 미비 (${input.missingProofCount}건)`, amount: missingAmount },
    { label: `현금영수증 미발급 (${input.cashReceiptMissingCount}건)`, amount: input.cashReceiptMissingAmount }
  ];
  const proofPercents = remainderPercents(proofRows.map((row) => row.amount));

  const { doc, done, addPage } = createReportDoc(`${salon} ${reportName} ${periodLabel}`);
  drawCover(doc, {
    salon,
    kicker: "MONTHLY CLOSING",
    title: `${periodLabel} 월 마감 자료`,
    subtitle: subtitle || "사업자번호 · 과세유형 · 작성일",
    heroLabel: "총 매출",
    heroValue: won(input.salesTotal),
    mini: [
      { label: "총 지출", value: won(input.expenseTotal) },
      { label: "차액", value: won(diff) },
      { label: "실지급액", value: won(input.summary.totalNetPay) }
    ],
    chip,
    issuedAt
  });
  addPage();
  const header: HeaderSpec = {
    salon,
    kicker: "MONTHLY CLOSING",
    subtitle: `${periodLabel} · ${subtitle || "사업자번호 · 과세유형 · 작성일"}`,
    chip,
    issuedAt
  };
  let y = drawHeader(doc, header);
  const nextPage = () => {
    addPage();
    return drawHeader(doc, header, true);
  };
  y = drawKpis(doc, y, [
    { label: "총 매출", value: won(input.salesTotal), caption: "결제 완료 기준", dark: true },
    { label: "총 지출", value: won(input.expenseTotal), caption: "이번 달 지출" },
    { label: "차액", value: won(diff), caption: "매출 − 지출" },
    { label: "실지급액", value: won(input.summary.totalNetPay), caption: "디자이너 정산" }
  ]);
  y = drawSharePair(
    doc,
    y,
    {
      title: "결제 수단별 매출",
      bar: true,
      base: input.salesTotal,
      rows: methods.map((row, index) => ({
        label: row.label,
        amount: row.amount,
        pctText: `${methodPercents[index]}%`,
        color: METHOD_TONE[row.key]
      }))
    },
    {
      title: "증빙 현황",
      bar: true,
      base: proofRows.reduce((sum, row) => sum + row.amount, 0),
      rows: proofRows.map((row, index) => ({
        ...row,
        pctText: `${proofPercents[index]}%`,
        color: ["#2F3A2F", "#8A847C", "#9A948C"][index]
      }))
    }
  );
  y = drawTable(
    doc,
    y,
    {
      title: "매출 내역",
      count: `${input.sales.length}건`,
      cols: [
        { key: "at", label: "결제일", w: 11 },
        { key: "customer", label: "고객명", w: 11 },
        { key: "artist", label: "디자이너", w: 10 },
        { key: "service", label: "시술", w: 40 },
        { key: "method", label: "결제", w: 10 },
        { key: "amount", label: "금액", w: 14, align: "right", bold: true }
      ],
      rows: input.sales.map((row) => ({
        at: paidLabel(row.paid_at),
        customer: row.customer_name || "—",
        artist: row.artist_name || "—",
        service: row.service_names?.length ? row.service_names.join(" + ") : "—",
        method: row.payment_method ? METHOD_LABEL[row.payment_method] : "—",
        amount: won(row.final_amount)
      }))
    },
    nextPage
  );
  drawTable(
    doc,
    y,
    {
      title: "지출 내역",
      count: `${input.expenses.length}건`,
      cols: [
        { key: "at", label: "지출일", w: 11 },
        { key: "category", label: "카테고리", w: 14 },
        { key: "vendor", label: "거래처", w: 14 },
        { key: "memo", label: "내용", w: 33 },
        { key: "method", label: "결제", w: 10 },
        { key: "amount", label: "금액", w: 14, align: "right", bold: true }
      ],
      rows: input.expenses.map((row) => ({
        at: dotYmd(row.expense_date),
        category: expenseCategoryLabel(row.category),
        vendor: row.vendor || "—",
        memo: row.memo || "—",
        method: expensePaymentLabel(row.payment_method),
        amount: won(row.amount)
      }))
    },
    nextPage
  );
  finalizeFooters(doc, `${salon} · ${reportName} · ${periodLabel}`);
  doc.end();
  return done;
}
