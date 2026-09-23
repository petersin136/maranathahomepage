import ExcelJS from "exceljs";
import type { PaymentMethod } from "@/lib/bookings/types";
import { expenseCategoryLabel } from "@/lib/admin/expense-categories";
import type { SettlementArtistRow, SettlementSummary } from "@/lib/admin/settlements-data";
import { CASH_RECEIPT_THRESHOLD } from "@/lib/admin/tax-data";
import type { ShopSettings, TaxType } from "@/lib/admin/tax-data";
import { paidAtToKstYearMonth } from "@/lib/admin/tax-data";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체"
};

const TAX_TYPE_LABEL: Record<TaxType, string> = {
  general: "일반과세자",
  simplified: "간이과세자"
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEDEDED" }
};

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
};

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle" };
  });
}

function styleTotalRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } }
    };
  });
}

function autoWidth(sheet: ExcelJS.Worksheet, min = 10, max = 36) {
  sheet.columns.forEach((col) => {
    let longest = min;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const text = cell.value == null ? "" : String(cell.value);
      longest = Math.min(max, Math.max(longest, text.length + 2));
    });
    col.width = longest;
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

function addSalesSheet(wb: ExcelJS.Workbook, rows: ExportSaleRow[]) {
  const sheet = wb.addWorksheet("매출내역");
  sheet.columns = [
    { key: "paid", width: 14 },
    { key: "booking", width: 14 },
    { key: "customer", width: 12 },
    { key: "artist", width: 12 },
    { key: "services", width: 28 },
    { key: "method", width: 12 },
    { key: "amount", width: 14 },
    { key: "receipt", width: 12 }
  ];

  const header = sheet.addRow([
    "결제일",
    "예약일",
    "고객명",
    "디자이너",
    "시술",
    "결제수단",
    "금액",
    "현금영수증"
  ]);
  styleHeader(header);
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  let total = 0;
  for (const row of rows) {
    const paidYmd = paidAtToKstYearMonth(row.paid_at).ymd;
    const paidDate = parseYmdToDate(paidYmd);
    const bookingDate = parseYmdToDate(row.booking_date);
    const amount = Number(row.final_amount) || 0;
    total += amount;
    const excelRow = sheet.addRow([
      paidDate,
      bookingDate,
      row.customer_name || "—",
      row.artist_name || "—",
      (row.service_names || []).filter(Boolean).join(", ") || "—",
      row.payment_method ? METHOD_LABEL[row.payment_method] : "—",
      amount,
      cashReceiptLabel(row)
    ]);
    excelRow.getCell(1).numFmt = "yyyy-mm-dd";
    excelRow.getCell(2).numFmt = "yyyy-mm-dd";
    excelRow.getCell(7).numFmt = "#,##0";
  }

  const totalRow = sheet.addRow(["합계", "", "", "", "", "", total, ""]);
  styleTotalRow(totalRow);
  totalRow.getCell(7).numFmt = "#,##0";
  autoWidth(sheet);
}

function addExpensesSheet(wb: ExcelJS.Workbook, rows: ExportExpenseRow[]) {
  const sheet = wb.addWorksheet("지출내역");
  sheet.addRow(["지출일", "카테고리", "거래처", "금액", "증빙여부", "메모"]);
  styleHeader(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  let total = 0;
  let withProof = 0;
  let withoutProof = 0;

  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    total += amount;
    if (row.has_tax_invoice) withProof += amount;
    else withoutProof += amount;
    const excelRow = sheet.addRow([
      parseYmdToDate(row.expense_date),
      expenseCategoryLabel(row.category),
      row.vendor || "—",
      amount,
      row.has_tax_invoice ? "있음" : "없음",
      row.memo || ""
    ]);
    excelRow.getCell(1).numFmt = "yyyy-mm-dd";
    excelRow.getCell(4).numFmt = "#,##0";
  }

  const totalRow = sheet.addRow(["합계", "", "", total, "", ""]);
  styleTotalRow(totalRow);
  totalRow.getCell(4).numFmt = "#,##0";

  const proofRow = sheet.addRow(["증빙 있음 소계", "", "", withProof, "", ""]);
  proofRow.font = { bold: true };
  proofRow.getCell(4).numFmt = "#,##0";

  const noProofRow = sheet.addRow(["증빙 없음 소계", "", "", withoutProof, "", ""]);
  noProofRow.font = { bold: true };
  noProofRow.getCell(4).numFmt = "#,##0";

  autoWidth(sheet);
}

function addSettlementsSheet(
  wb: ExcelJS.Workbook,
  artists: SettlementArtistRow[],
  summary: SettlementSummary
) {
  const sheet = wb.addWorksheet("디자이너정산");
  sheet.addRow([
    "디자이너",
    "고용형태",
    "매출",
    "건수",
    "커미션율",
    "인센티브",
    "소득세",
    "지방소득세",
    "원천징수계",
    "실지급액"
  ]);
  styleHeader(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const a of artists) {
    const excelRow = sheet.addRow([
      a.artistName,
      a.employmentLabel,
      a.revenue,
      a.count,
      a.hasCommission ? a.commissionRate / 100 : null,
      a.incentive,
      a.incomeTax,
      a.localIncomeTax,
      a.withholding,
      a.netPay
    ]);
    excelRow.getCell(3).numFmt = "#,##0";
    excelRow.getCell(5).numFmt = "0%";
    for (const col of [6, 7, 8, 9, 10]) {
      excelRow.getCell(col).numFmt = "#,##0";
    }
  }

  const totalRow = sheet.addRow([
    "합계",
    "",
    summary.totalRevenue,
    artists.reduce((s, a) => s + a.count, 0),
    "",
    summary.totalIncentive,
    artists.reduce((s, a) => s + (a.incomeTax ?? 0), 0),
    artists.reduce((s, a) => s + (a.localIncomeTax ?? 0), 0),
    summary.totalWithholding,
    summary.totalNetPay
  ]);
  styleTotalRow(totalRow);
  for (const col of [3, 6, 7, 8, 9, 10]) {
    totalRow.getCell(col).numFmt = "#,##0";
  }
  autoWidth(sheet);
}

function addSummarySheet(
  wb: ExcelJS.Workbook,
  args: {
    year: number;
    month: number;
    settings: ShopSettings | null;
    salesTotal: number;
    expenseTotal: number;
    methodTotals: { card: number; cash: number; transfer: number };
    proofExpenseTotal: number;
    cashReceiptMissingCount: number;
    cashReceiptMissingAmount: number;
    generatedAt: string;
  }
) {
  const sheet = wb.addWorksheet("요약");
  const taxType = args.settings?.tax_type;
  const rows: [string, string | number | null][] = [
    ["사업자명", args.settings?.business_name || "—"],
    ["사업자번호", args.settings?.business_number || "—"],
    ["과세유형", taxType ? TAX_TYPE_LABEL[taxType] : "—"],
    ["대상 월", `${args.year}년 ${String(args.month).padStart(2, "0")}월`],
    ["", ""],
    ["총매출", args.salesTotal],
    ["총지출", args.expenseTotal],
    ["차액", args.salesTotal - args.expenseTotal],
    ["", ""],
    ["카드 매출", args.methodTotals.card],
    ["현금 매출", args.methodTotals.cash],
    ["계좌이체 매출", args.methodTotals.transfer],
    ["", ""],
    ["증빙 있는 매입액", args.proofExpenseTotal],
    ["현금영수증 미발급 건수", args.cashReceiptMissingCount],
    ["현금영수증 미발급 금액", args.cashReceiptMissingAmount],
    ["", ""],
    ["생성일시", args.generatedAt]
  ];

  for (const [label, value] of rows) {
    const excelRow = sheet.addRow([label, value]);
    if (typeof value === "number" && label !== "현금영수증 미발급 건수") {
      excelRow.getCell(2).numFmt = "#,##0";
    }
    if (
      label === "총매출" ||
      label === "총지출" ||
      label === "차액" ||
      label === "사업자명"
    ) {
      excelRow.font = { bold: true };
    }
  }
  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 28;
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

  addSalesSheet(wb, salesSorted);
  addExpensesSheet(wb, expensesSorted);
  addSettlementsSheet(wb, args.settlements.artists, args.settlements.summary);

  const methodTotals = { card: 0, cash: 0, transfer: 0 };
  let salesTotal = 0;
  let cashReceiptMissingCount = 0;
  let cashReceiptMissingAmount = 0;
  for (const row of salesSorted) {
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
  for (const row of expensesSorted) {
    const amount = Number(row.amount) || 0;
    expenseTotal += amount;
    if (row.has_tax_invoice) proofExpenseTotal += amount;
  }

  const generatedAt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(args.generatedAtIso));

  addSummarySheet(wb, {
    year: args.year,
    month: args.month,
    settings: args.settings,
    salesTotal,
    expenseTotal,
    methodTotals,
    proofExpenseTotal,
    cashReceiptMissingCount,
    cashReceiptMissingAmount,
    generatedAt: generatedAt.replace(" ", "T")
  });

  return wb.xlsx.writeBuffer();
}

export function monthlyCloseFilename(year: number, month: number) {
  return `헤어업_${year}년${String(month).padStart(2, "0")}월_마감자료.xlsx`;
}
