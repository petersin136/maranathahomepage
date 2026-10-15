import path from "path";
import PDFDocument from "pdfkit";
import {
  expenseCategoryLabel,
  expensePaymentLabel,
  expenseProofLabel,
  resolveExpenseProofType
} from "@/lib/admin/expense-categories";
import type { SettlementArtistRow, SettlementSummary } from "@/lib/admin/settlements-data";
import { paidAtToKstYearMonth, shopDisplayName } from "@/lib/admin/tax-data";
import type { ShopSettings, TaxType } from "@/lib/admin/tax-data";
import type { ExportExpenseRow, ExportSaleRow } from "@/lib/admin/export-workbook";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;
const CONTENT_W = PAGE_W - M * 2;
const GREEN = "#2F3A2F";
const INK = "#1C1C1C";
const MUTED = "#8A847C";
const LABEL = "#9A948C";
const LINE = "#E4E0DA";
const RULE = "#C9C3BB";

const TAX_TYPE_LABEL: Record<TaxType, string> = {
  general: "일반과세자",
  simplified: "간이과세자"
};

const METHOD_LABEL = { card: "카드", cash: "현금", transfer: "계좌이체" } as const;

type Col = { title: string; width: number; align?: "left" | "right" };

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

function won(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function periodLabel(year: number, month: number) {
  return `${year}년 ${month}월`;
}

function paidLabel(iso: string) {
  return paidAtToKstYearMonth(iso).ymd.replace(/-/g, ". ");
}

function dotYmd(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || "—";
  const [, m, d] = ymd.split("-");
  return `${m}. ${d}`;
}

function fontFile(name: string) {
  return path.join(process.cwd(), "lib/admin/fonts", name);
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

export function buildMonthlyClosePdf(input: MonthlyClosePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      info: {
        Title: `${shopDisplayName(input.settings)} ${periodLabel(input.year, input.month)} 마감`,
        Author: shopDisplayName(input.settings)
      }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("R", fontFile("NotoSansKR-Regular.ttf"));
    doc.registerFont("B", fontFile("NotoSansKR-Bold.ttf"));

    let y = drawCover(doc, input);
    y = drawSectionTitle(doc, y, "매출 내역", `${input.sales.length}건`);
    y = drawTable(
      doc,
      y,
      shareColumns([
        { title: "결제일", share: 1.15 },
        { title: "고객명", share: 1 },
        { title: "디자이너", share: 0.95 },
        { title: "시술", share: 1.35 },
        { title: "결제", share: 0.8 },
        { title: "금액", share: 1.05, align: "right" }
      ]),
      input.sales.map((row) => [
        paidLabel(row.paid_at),
        row.customer_name || "—",
        row.artist_name || "—",
        (row.service_names || []).filter(Boolean).join(" / ") || "—",
        row.payment_method ? METHOD_LABEL[row.payment_method] : "—",
        won(row.final_amount)
      ]),
      "이 달의 결제 완료 매출이 없습니다."
    );

    y = drawSectionTitle(doc, y + 22, "지출 내역", `${input.expenses.length}건`);
    y = drawTable(
      doc,
      y,
      shareColumns([
        { title: "일자", share: 0.7 },
        { title: "카테고리", share: 1.15 },
        { title: "거래처", share: 1.05 },
        { title: "내용", share: 1.45 },
        { title: "증빙", share: 1 },
        { title: "금액", share: 1.05, align: "right" }
      ]),
      input.expenses.map((row) => [
        dotYmd(row.expense_date),
        expenseCategoryLabel(row.category),
        row.vendor || "—",
        row.memo || "—",
        expenseProofLabel(resolveExpenseProofType(row)),
        won(row.amount)
      ]),
      "이 달의 지출이 없습니다."
    );

    y = drawSectionTitle(doc, y + 22, "디자이너 정산", `${input.artists.length}명`);
    drawTable(
      doc,
      y,
      shareColumns([
        { title: "디자이너", share: 0.9 },
        { title: "매출", share: 1.05, align: "right" },
        { title: "요율", share: 0.6, align: "right" },
        { title: "인센티브", share: 1.05, align: "right" },
        { title: "원천징수", share: 0.95, align: "right" },
        { title: "실지급", share: 1.05, align: "right" },
        { title: "계좌", share: 1.4 }
      ]),
      input.artists.map((artist) => [
        artist.artistName,
        won(artist.revenue),
        artist.hasCommission ? `${artist.commissionRate.toFixed(0)}%` : "—",
        won(artist.incentive),
        won(artist.withholding),
        won(artist.netPay),
        [artist.bankName, artist.bankAccount].filter(Boolean).join(" ") || "—"
      ]),
      "정산할 디자이너가 없습니다."
    );

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(i);
      doc.font("R").fontSize(8).fillColor(MUTED);
      doc.text(shopDisplayName(input.settings), M, PAGE_H - 32, { width: CONTENT_W - 70, lineBreak: false, ellipsis: true });
      doc.text(`${i + 1} / ${range.count}`, PAGE_W - M - 48, PAGE_H - 32, {
        width: 48,
        align: "right",
        lineBreak: false
      });
    }

    doc.end();
  });
}

const CELL_PAD = 8;

function shareColumns(cols: { title: string; share: number; align?: "left" | "right" }[]): Col[] {
  const total = cols.reduce((sum, col) => sum + col.share, 0);
  let used = 0;
  return cols.map((col, index) => {
    const width =
      index === cols.length - 1 ? CONTENT_W - used : Math.floor((CONTENT_W * col.share) / total);
    used += width;
    return { title: col.title, width, align: col.align };
  });
}

function drawCover(doc: PDFKit.PDFDocument, input: MonthlyClosePdfInput) {
  const shop = shopDisplayName(input.settings);
  const tax = input.settings?.tax_type ? TAX_TYPE_LABEL[input.settings.tax_type] : "";
  let y = 46;

  doc.font("R").fontSize(9).fillColor(LABEL);
  const kicker = "월 마감 자료";
  const kickerW = doc.widthOfString(kicker);
  doc.text(kicker, M + CONTENT_W - kickerW, y + 8, { lineBreak: false });
  doc.font("B").fontSize(20).fillColor(INK).text(shop, M, y, {
    width: CONTENT_W - kickerW - 18,
    ellipsis: true,
    lineBreak: false
  });
  y += 34;
  doc.moveTo(M, y).lineTo(M + CONTENT_W, y).strokeColor(GREEN).lineWidth(1).stroke();
  y += 18;

  doc.font("B").fontSize(13).fillColor(INK).text(`${periodLabel(input.year, input.month)} 마감`, M, y, {
    lineBreak: false
  });
  y += 20;
  doc.font("R").fontSize(9).fillColor(MUTED).text(
    [input.settings?.business_number, tax, `작성 ${generatedLabel(input.generatedAtIso)}`].filter(Boolean).join("  ·  "),
    M,
    y,
    { width: CONTENT_W, ellipsis: true, lineBreak: false }
  );
  y += 26;

  const cards = [
    { label: "총 매출", value: won(input.salesTotal) },
    { label: "총 지출", value: won(input.expenseTotal) },
    { label: "차액", value: won(input.salesTotal - input.expenseTotal) },
    { label: "실지급액", value: won(input.summary.totalNetPay) }
  ];
  const gap = 10;
  const cardW = (CONTENT_W - gap * 3) / 4;
  const cardH = 62;
  cards.forEach((card, index) => {
    const x = M + index * (cardW + gap);
    doc.roundedRect(x, y, cardW, cardH, 6).lineWidth(1).strokeColor(LINE).stroke();
    doc.font("B").fontSize(8).fillColor(LABEL).text(card.label, x + 12, y + 12, {
      width: cardW - 24,
      lineBreak: false
    });
    doc.font("B").fontSize(12).fillColor(INK).text(card.value, x + 12, y + 32, {
      width: cardW - 24,
      lineBreak: false
    });
  });
  y += cardH + 18;

  doc.font("R").fontSize(9).fillColor(MUTED).text(
    `카드 ${won(input.methodTotals.card)}    현금 ${won(input.methodTotals.cash)}    계좌이체 ${won(input.methodTotals.transfer)}`,
    M,
    y,
    { width: CONTENT_W, lineBreak: false }
  );
  y += 16;
  doc.text(
    `증빙 있는 지출 ${won(input.proofExpenseTotal)}    증빙 미비 ${input.missingProofCount}건    현금영수증 미발급 ${input.cashReceiptMissingCount}건 ${won(input.cashReceiptMissingAmount)}`,
    M,
    y,
    { width: CONTENT_W, lineBreak: false }
  );
  return y + 28;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, y: number, title: string, meta: string) {
  if (y > PAGE_H - 110) {
    doc.addPage();
    y = 48;
  }
  doc.font("B").fontSize(12).fillColor(INK).text(title, M, y, { lineBreak: false });
  const titleW = doc.widthOfString(title);
  doc.font("R").fontSize(9).fillColor(MUTED).text(meta, M + titleW + 8, y + 3, { lineBreak: false });
  return y + 16;
}

function drawTable(doc: PDFKit.PDFDocument, y: number, cols: Col[], rows: string[][], empty: string) {
  const headH = 24;
  const rowH = 22;

  const paintHead = (top: number) => {
    let x = M;
    doc.font("B").fontSize(8).fillColor(LABEL);
    for (const col of cols) {
      doc.text(col.title, x + CELL_PAD, top + 4, {
        width: col.width - CELL_PAD * 2,
        align: col.align || "left",
        lineBreak: false
      });
      x += col.width;
    }
    doc
      .moveTo(M, top + headH)
      .lineTo(M + CONTENT_W, top + headH)
      .strokeColor(RULE)
      .lineWidth(1)
      .stroke();
    return top + headH;
  };

  if (y + headH + rowH > PAGE_H - 56) {
    doc.addPage();
    y = 48;
  }
  y = paintHead(y);

  if (rows.length === 0) {
    doc.font("R").fontSize(9).fillColor(MUTED).text(empty, M + CELL_PAD, y + 8, {
      width: CONTENT_W - CELL_PAD * 2,
      lineBreak: false
    });
    return y + rowH + 4;
  }

  for (let i = 0; i < rows.length; i += 1) {
    if (y + rowH > PAGE_H - 56) {
      doc.addPage();
      y = 48;
      y = paintHead(y);
    }
    let x = M;
    doc.font("R").fontSize(8).fillColor(INK);
    rows[i].forEach((cell, colIndex) => {
      const col = cols[colIndex];
      doc.text(cell, x + CELL_PAD, y + 6, {
        width: col.width - CELL_PAD * 2,
        align: col.align || "left",
        lineBreak: false,
        ellipsis: true
      });
      x += col.width;
    });
    doc
      .moveTo(M, y + rowH)
      .lineTo(M + CONTENT_W, y + rowH)
      .strokeColor("#F3EFEA")
      .lineWidth(0.6)
      .stroke();
    y += rowH;
  }
  return y;
}
