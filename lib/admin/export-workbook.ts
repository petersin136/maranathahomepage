import ExcelJS from "exceljs";
import type { PaymentMethod } from "@/lib/bookings/types";
import {
  expenseCategoryLabel,
  expensePaymentLabel,
  expenseProofLabel,
  isMissingExpenseProof,
  resolveExpenseProofType
} from "@/lib/admin/expense-categories";
import type { SettlementArtistRow, SettlementSummary } from "@/lib/admin/settlements-data";
import { CASH_RECEIPT_THRESHOLD, paidAtToKstYearMonth, shopDisplayName } from "@/lib/admin/tax-data";
import type { ShopSettings, TaxType } from "@/lib/admin/tax-data";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체"
};

const TAX_TYPE_LABEL: Record<TaxType, string> = {
  general: "일반과세자",
  simplified: "간이과세자"
};

const GREEN = "FF2F3A2F";
const INK = "FF1C1C1C";
const CREAM = "FFF6F4F0";
const BAND = "FFF3EFEA";
const LINE = "FFE6E1DA";
const MUTED = "FF8A847C";
const WHITE = "FFFFFFFF";
const FONT = "Apple SD Gothic Neo";

const FILL = (argb: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb }
});

const THIN = (argb = LINE): ExcelJS.Border => ({ style: "thin", color: { argb } });

export type ExportSaleRow = {
  paid_at: string;
  booking_date: string;
  customer_name: string;
  artist_name: string | null;
  service_names: string[] | null;
  payment_method: PaymentMethod | null;
  final_amount: number;
  cash_receipt_issued: boolean | null;
};

export type ExportExpenseRow = {
  expense_date: string;
  category: string;
  vendor: string | null;
  amount: number;
  has_tax_invoice: boolean;
  memo: string | null;
  payment_method?: string | null;
  proof_type?: string | null;
};

function applySheetChrome(sheet: ExcelJS.Worksheet, shop: string) {
  sheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.6, right: 0.6, top: 0.6, bottom: 0.5, header: 0.2, footer: 0.2 }
  };
  sheet.headerFooter.oddFooter = `&L${shop.replace(/&/g, "＆")}&R&P / &N`;
  sheet.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
  sheet.properties.tabColor = { argb: GREEN };
}

function banner(sheet: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  sheet.mergeCells(1, 1, 1, cols);
  sheet.mergeCells(2, 1, 2, cols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: FONT, size: 16, bold: true, color: { argb: INK } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  const sub = sheet.getCell(2, 1);
  sub.value = subtitle;
  sub.font = { name: FONT, size: 10, color: { argb: MUTED } };
  sub.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sub.border = { bottom: { style: "thin", color: { argb: GREEN } } };
  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 20;
  sheet.getRow(3).height = 8;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: MUTED } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.border = { bottom: { style: "thin", color: { argb: "FFC9C3BB" } } };
  });
}

function paintDataCell(cell: ExcelJS.Cell, alt: boolean, align: "left" | "right" = "left") {
  cell.font = { name: FONT, size: 10, color: { argb: INK } };
  cell.fill = FILL(alt ? CREAM : WHITE);
  cell.alignment = { vertical: "middle", horizontal: align, indent: align === "left" ? 1 : 0 };
  cell.border = { bottom: THIN() };
}

function styleTotalRow(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: INK } };
    cell.fill = FILL(BAND);
    cell.alignment = { vertical: "middle", horizontal: cell.alignment?.horizontal || "left", indent: 1 };
    cell.border = { top: THIN(GREEN) };
  });
}

function parseYmdToDate(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function cashReceiptLabel(row: ExportSaleRow) {
  if (!row.payment_method || row.payment_method === "card") return "해당없음";
  if (row.final_amount < CASH_RECEIPT_THRESHOLD) {
    return row.cash_receipt_issued ? "발급" : "미발급";
  }
  return row.cash_receipt_issued ? "발급" : "미발급";
}

function addSalesSheet(wb: ExcelJS.Workbook, rows: ExportSaleRow[], period: string, shop: string) {
  const sheet = wb.addWorksheet("매출내역");
  const widths = [16, 14, 14, 28, 12, 16, 14];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  banner(sheet, shop, `${period}  ·  결제 완료 매출`, widths.length);
  applySheetChrome(sheet, shop);
  const header = sheet.addRow(["결제일", "고객명", "디자이너", "시술", "결제 수단", "금액", "현금영수증"]);
  styleHeader(header);

  let total = 0;
  if (rows.length === 0) {
    sheet.mergeCells(5, 1, 5, widths.length);
    const empty = sheet.getCell(5, 1);
    empty.value = "이 달의 결제 완료 매출이 없습니다.";
    empty.font = { name: FONT, size: 10, color: { argb: MUTED } };
    empty.alignment = { vertical: "middle", indent: 1 };
    sheet.getRow(5).height = 24;
  }
  rows.forEach((row, index) => {
    const amount = Number(row.final_amount) || 0;
    total += amount;
    const excelRow = sheet.addRow([
      paidAtToKstYearMonth(row.paid_at).ymd.replace(/-/g, ". "),
      row.customer_name || "—",
      row.artist_name || "—",
      (row.service_names || []).filter(Boolean).join(" / ") || "—",
      row.payment_method ? METHOD_LABEL[row.payment_method] : "—",
      amount,
      cashReceiptLabel(row)
    ]);
    excelRow.height = 20;
    excelRow.eachCell((cell, col) => paintDataCell(cell, index % 2 === 1, col === 6 ? "right" : "left"));
    excelRow.getCell(6).numFmt = '#,##0"원"';
  });

  const totalRow = sheet.addRow(["합계", "", "", "", "", total, ""]);
  styleTotalRow(totalRow);
  totalRow.getCell(6).numFmt = '#,##0"원"';
  totalRow.getCell(6).alignment = { vertical: "middle", horizontal: "right" };
}

function addExpensesSheet(wb: ExcelJS.Workbook, rows: ExportExpenseRow[], period: string, shop: string) {
  const sheet = wb.addWorksheet("지출내역");
  const widths = [14, 18, 18, 28, 12, 16, 16];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  banner(sheet, shop, `${period}  ·  지출`, widths.length);
  applySheetChrome(sheet, shop);
  const header = sheet.addRow(["지출일", "카테고리", "거래처", "지출 내용", "결제 수단", "금액", "증빙"]);
  styleHeader(header);

  let total = 0;
  let withProof = 0;
  let withoutProof = 0;
  if (rows.length === 0) {
    sheet.mergeCells(5, 1, 5, widths.length);
    const empty = sheet.getCell(5, 1);
    empty.value = "이 달의 지출이 없습니다.";
    empty.font = { name: FONT, size: 10, color: { argb: MUTED } };
    empty.alignment = { vertical: "middle", indent: 1 };
    sheet.getRow(5).height = 24;
  }
  rows.forEach((row, index) => {
    const amount = Number(row.amount) || 0;
    total += amount;
    const proof = resolveExpenseProofType(row);
    if (isMissingExpenseProof(proof)) withoutProof += amount;
    else withProof += amount;
    const excelRow = sheet.addRow([
      row.expense_date.replace(/-/g, ". "),
      expenseCategoryLabel(row.category),
      row.vendor || "—",
      row.memo || "—",
      expensePaymentLabel(row.payment_method),
      amount,
      expenseProofLabel(proof)
    ]);
    excelRow.height = 20;
    excelRow.eachCell((cell, col) => paintDataCell(cell, index % 2 === 1, col === 6 ? "right" : "left"));
    excelRow.getCell(6).numFmt = '#,##0"원"';
  });

  const totalRow = sheet.addRow(["합계", "", "", "", "", total, ""]);
  styleTotalRow(totalRow);
  totalRow.getCell(6).numFmt = '#,##0"원"';
  totalRow.getCell(6).alignment = { vertical: "middle", horizontal: "right" };

  const proofRow = sheet.addRow(["증빙 있음", "", "", "", "", withProof, ""]);
  proofRow.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, color: { argb: INK } };
  });
  proofRow.getCell(6).numFmt = '#,##0"원"';
  const noProofRow = sheet.addRow(["증빙 미비", "", "", "", "", withoutProof, ""]);
  noProofRow.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, color: { argb: MUTED } };
  });
  noProofRow.getCell(6).numFmt = '#,##0"원"';
}

function addSettlementsSheet(
  wb: ExcelJS.Workbook,
  artists: SettlementArtistRow[],
  summary: SettlementSummary,
  period: string,
  shop: string
) {
  const sheet = wb.addWorksheet("디자이너정산");
  const widths = [14, 16, 12, 16, 16, 16, 28];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  banner(sheet, shop, `${period}  ·  디자이너 정산`, widths.length);
  applySheetChrome(sheet, shop);
  const header = sheet.addRow(["디자이너", "담당 매출", "커미션 요율", "발생 인센티브", "원천징수", "실지급액", "지급 계좌"]);
  styleHeader(header);
  header.eachCell((cell, col) => {
    if (col >= 2 && col <= 6) cell.alignment = { vertical: "middle", horizontal: "right" };
  });

  if (artists.length === 0) {
    sheet.mergeCells(5, 1, 5, widths.length);
    const empty = sheet.getCell(5, 1);
    empty.value = "정산할 디자이너가 없습니다.";
    empty.font = { name: FONT, size: 10, color: { argb: MUTED } };
    empty.alignment = { vertical: "middle", indent: 1 };
    sheet.getRow(5).height = 24;
  }
  artists.forEach((artist, index) => {
    const excelRow = sheet.addRow([
      artist.artistName,
      artist.revenue,
      artist.hasCommission ? artist.commissionRate / 100 : null,
      artist.incentive,
      artist.withholding,
      artist.netPay,
      [artist.bankName, artist.bankAccount].filter(Boolean).join(" ") || "—"
    ]);
    excelRow.height = 20;
    excelRow.eachCell((cell, col) => paintDataCell(cell, index % 2 === 1, col >= 2 && col <= 6 ? "right" : "left"));
    excelRow.getCell(3).numFmt = "0%";
    for (const col of [2, 4, 5, 6]) excelRow.getCell(col).numFmt = '#,##0"원"';
  });

  const totalRow = sheet.addRow([
    "합계",
    summary.totalRevenue,
    "",
    summary.totalIncentive,
    summary.totalWithholding,
    summary.totalNetPay,
    ""
  ]);
  styleTotalRow(totalRow);
  for (const col of [2, 4, 5, 6]) {
    totalRow.getCell(col).numFmt = '#,##0"원"';
    totalRow.getCell(col).alignment = { vertical: "middle", horizontal: "right" };
  }
}

function addSummarySheet(
  wb: ExcelJS.Workbook,
  args: {
    year: number;
    month: number;
    settings: ShopSettings | null;
    salesTotal: number;
    expenseTotal: number;
    netPay: number;
    methodTotals: { card: number; cash: number; transfer: number };
    proofExpenseTotal: number;
    missingProofCount: number;
    cashReceiptMissingCount: number;
    cashReceiptMissingAmount: number;
    generatedAt: string;
  }
) {
  const sheet = wb.addWorksheet("요약", { views: [{ showGridLines: false }] });
  sheet.properties.tabColor = { argb: GREEN };
  sheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1
  };
  [18, 22, 22, 22, 24].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  const period = `${args.year}년 ${args.month}월`;
  const shop = shopDisplayName(args.settings);
  banner(sheet, shop, `${period} 월 마감 자료`, 5);
  applySheetChrome(sheet, shop);
  sheet.getRow(3).height = 10;
  const taxType = args.settings?.tax_type ? TAX_TYPE_LABEL[args.settings.tax_type] : "";
  sheet.mergeCells(4, 1, 4, 5);
  const meta = sheet.getCell(4, 1);
  meta.value = [args.settings?.business_number, taxType, `작성 ${args.generatedAt}`].filter(Boolean).join("   ·   ");
  meta.font = { name: FONT, size: 10, color: { argb: MUTED } };
  meta.alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(4).height = 20;

  sheet.getRow(6).height = 18;
  sheet.mergeCells(6, 1, 6, 5);
  const lead = sheet.getCell(6, 1);
  lead.value = "한눈에 보기";
  lead.font = { name: FONT, size: 12, bold: true, color: { argb: INK } };
  lead.alignment = { indent: 1 };

  const cards: [string, number][] = [
    ["총 매출", args.salesTotal],
    ["총 지출", args.expenseTotal],
    ["차액", args.salesTotal - args.expenseTotal],
    ["실지급액", args.netPay]
  ];
  cards.forEach(([label, value], index) => {
    const col = index + 1;
    const labelCell = sheet.getCell(7, col);
    const valueCell = sheet.getCell(8, col);
    labelCell.value = label;
    valueCell.value = value;
    valueCell.numFmt = '#,##0"원"';
    labelCell.font = { name: FONT, size: 10, bold: true, color: { argb: MUTED } };
    valueCell.font = { name: FONT, size: 14, bold: true, color: { argb: INK } };
    labelCell.fill = FILL(CREAM);
    valueCell.fill = FILL(CREAM);
    labelCell.alignment = { vertical: "middle", indent: 1 };
    valueCell.alignment = { vertical: "middle", indent: 1 };
  });
  sheet.getRow(7).height = 18;
  sheet.getRow(8).height = 26;

  const lines: [string, string | number][] = [
    ["카드 매출", args.methodTotals.card],
    ["현금 매출", args.methodTotals.cash],
    ["계좌이체 매출", args.methodTotals.transfer],
    ["증빙 있는 지출", args.proofExpenseTotal],
    ["증빙 미비", `${args.missingProofCount}건`],
    ["현금영수증 미발급", `${args.cashReceiptMissingCount}건`]
  ];
  lines.forEach(([label, value], index) => {
    const row = sheet.getRow(10 + index);
    row.height = 20;
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    row.getCell(1).font = { name: FONT, size: 10, color: { argb: MUTED } };
    row.getCell(2).font = { name: FONT, size: 10, bold: true, color: { argb: INK } };
    row.getCell(1).alignment = { vertical: "middle", indent: 1 };
    if (typeof value === "number") {
      row.getCell(2).numFmt = '#,##0"원"';
      row.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    }
  });
  if (args.cashReceiptMissingAmount > 0) {
    sheet.getCell(15, 3).value = args.cashReceiptMissingAmount;
    sheet.getCell(15, 3).numFmt = '#,##0"원"';
    sheet.getCell(15, 3).font = { name: FONT, size: 10, color: { argb: MUTED } };
  }
}

export async function buildMonthlyCloseWorkbook(args: {
  year: number;
  month: number;
  settings: ShopSettings | null;
  sales: ExportSaleRow[];
  expenses: ExportExpenseRow[];
  settlements: { artists: SettlementArtistRow[]; summary: SettlementSummary };
  generatedAtIso: string;
}): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "HAIR UP Admin";
  wb.created = new Date(args.generatedAtIso);

  const salesSorted = [...args.sales].sort((a, b) =>
    a.paid_at.localeCompare(b.paid_at)
  );
  const expensesSorted = [...args.expenses].sort((a, b) =>
    a.expense_date.localeCompare(b.expense_date)
  );

  const period = `${args.year}년 ${args.month}월`;
  const shop = shopDisplayName(args.settings);
  const figures = summarizeMonthlyClose(salesSorted, expensesSorted);

  const generatedAt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(args.generatedAtIso));

  addSummarySheet(wb, {
    year: args.year,
    month: args.month,
    settings: args.settings,
    salesTotal: figures.salesTotal,
    expenseTotal: figures.expenseTotal,
    netPay: args.settlements.summary.totalNetPay,
    methodTotals: figures.methodTotals,
    proofExpenseTotal: figures.proofExpenseTotal,
    missingProofCount: figures.missingProofCount,
    cashReceiptMissingCount: figures.cashReceiptMissingCount,
    cashReceiptMissingAmount: figures.cashReceiptMissingAmount,
    generatedAt
  });
  addSalesSheet(wb, salesSorted, period, shop);
  addExpensesSheet(wb, expensesSorted, period, shop);
  addSettlementsSheet(wb, args.settlements.artists, args.settlements.summary, period, shop);

  return wb.xlsx.writeBuffer();
}

export type MonthlyCloseFigures = {
  salesTotal: number;
  expenseTotal: number;
  methodTotals: { card: number; cash: number; transfer: number };
  proofExpenseTotal: number;
  missingProofCount: number;
  cashReceiptMissingCount: number;
  cashReceiptMissingAmount: number;
};

export function summarizeMonthlyClose(sales: ExportSaleRow[], expenses: ExportExpenseRow[]): MonthlyCloseFigures {
  const methodTotals = { card: 0, cash: 0, transfer: 0 };
  let salesTotal = 0;
  let cashReceiptMissingCount = 0;
  let cashReceiptMissingAmount = 0;
  for (const row of sales) {
    const amount = Number(row.final_amount) || 0;
    salesTotal += amount;
    if (row.payment_method === "card") methodTotals.card += amount;
    else if (row.payment_method === "cash") methodTotals.cash += amount;
    else if (row.payment_method === "transfer") methodTotals.transfer += amount;
    if (
      row.payment_method &&
      row.payment_method !== "card" &&
      amount >= CASH_RECEIPT_THRESHOLD &&
      !row.cash_receipt_issued
    ) {
      cashReceiptMissingCount += 1;
      cashReceiptMissingAmount += amount;
    }
  }
  let expenseTotal = 0;
  let proofExpenseTotal = 0;
  let missingProofCount = 0;
  for (const row of expenses) {
    const amount = Number(row.amount) || 0;
    expenseTotal += amount;
    if (!isMissingExpenseProof(resolveExpenseProofType(row))) proofExpenseTotal += amount;
    else missingProofCount += 1;
  }
  return {
    salesTotal,
    expenseTotal,
    methodTotals,
    proofExpenseTotal,
    missingProofCount,
    cashReceiptMissingCount,
    cashReceiptMissingAmount
  };
}

export function monthlyCloseFilename(year: number, month: number, ext: "xlsx" | "pdf" = "xlsx") {
  return `헤어업_${year}년${String(month).padStart(2, "0")}월_마감자료.${ext}`;
}

export async function buildSettlementStatementWorkbook(args: {
  year: number;
  month: number;
  artist: SettlementArtistRow;
  generatedAtIso: string;
}): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "HAIR UP Admin";
  wb.created = new Date(args.generatedAtIso);

  const sheet = wb.addWorksheet("명세서");
  const period = `${args.year}년 ${String(args.month).padStart(2, "0")}월`;
  const account = [args.artist.bankName, args.artist.bankAccount].filter(Boolean).join(" ") || "—";
  const meta: [string, string | number | null][] = [
    ["디자이너", args.artist.artistName],
    ["고용형태", args.artist.employmentLabel],
    ["기간", period],
    ["상태", args.artist.status],
    ["담당 매출", args.artist.revenue],
    ["커미션 요율", args.artist.hasCommission ? args.artist.commissionRate / 100 : 0],
    ["발생 인센티브", args.artist.incentive],
    ["원천징수", args.artist.withholding],
    ["실지급액", args.artist.netPay],
    ["지급 계좌", account]
  ];

  for (const [label, value] of meta) {
    const excelRow = sheet.addRow([label, value]);
    excelRow.getCell(1).font = { bold: true };
    if (typeof value === "number" && label === "커미션 요율") {
      excelRow.getCell(2).numFmt = "0.0%";
    } else if (typeof value === "number") {
      excelRow.getCell(2).numFmt = "#,##0";
    }
  }

  sheet.addRow([]);
  const header = sheet.addRow(["결제일", "고객명", "시술", "결제수단", "금액"]);
  styleHeader(header);

  for (const booking of args.artist.bookings) {
    const paidYmd = paidAtToKstYearMonth(booking.paidAt).ymd;
    const excelRow = sheet.addRow([
      parseYmdToDate(paidYmd),
      booking.customerName || "—",
      booking.serviceNames.length ? booking.serviceNames.join(" / ") : "—",
      booking.paymentMethodLabel,
      booking.amount
    ]);
    excelRow.getCell(1).numFmt = "yyyy-mm-dd";
    excelRow.getCell(5).numFmt = "#,##0";
  }

  const total = args.artist.bookings.reduce((sum, row) => sum + row.amount, 0);
  const totalRow = sheet.addRow(["합계", "", "", "", total]);
  styleTotalRow(totalRow);
  totalRow.getCell(5).numFmt = "#,##0";
  sheet.getColumn(1).width = 16;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 28;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 14;
  sheet.views = [{ showGridLines: false }];

  return wb.xlsx.writeBuffer();
}

export function settlementStatementFilename(year: number, month: number, artistName: string) {
  const name = artistName.trim() || "디자이너";
  return `헤어업_${year}년${String(month).padStart(2, "0")}월_${name}_명세서.xlsx`;
}
