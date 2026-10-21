import {
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  expensePaymentLabel,
  expenseProofLabel,
  resolveExpenseProofType
} from "@/lib/admin/expense-categories";
import { remainderPercents, type ExpenseSummary } from "@/lib/admin/expenses-data";
import {
  createReportDoc,
  drawCover,
  drawHeader,
  drawKpis,
  drawSharePair,
  drawTable,
  finalizeFooters,
  won,
  type Chip,
  type HeaderSpec
} from "@/lib/admin/pdf/report-kit";

const TONE: Record<string, string> = {
  "var(--accent)": "#2F3A2F",
  "var(--muted)": "#8A847C",
  "var(--label)": "#9A948C",
  "var(--ink)": "#1C1C1C"
};

function signedPct(rate: number) {
  const body = `${Math.abs(rate).toFixed(1)}%`;
  if (rate > 0) return `+${body} ▲`;
  if (rate < 0) return `-${body} ▼`;
  return "0.0%";
}

function signedWon(delta: number) {
  const abs = Math.abs(delta).toLocaleString("ko-KR");
  if (delta > 0) return `+${abs}원 ▲`;
  if (delta < 0) return `-${abs}원 ▼`;
  return "0원";
}

function dotted(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${m}. ${d}`;
}

export type ExpensePdfRow = {
  expense_date: string;
  category: string;
  vendor: string | null;
  memo: string | null;
  payment_method: string | null;
  proof_type: string;
  amount: number;
};

export function buildExpensesReportPdf(input: {
  salon: string;
  periodLabel: string;
  subtitle: string;
  chip: Chip;
  issuedAt: Date;
  summary: ExpenseSummary;
  rows: ExpensePdfRow[];
}) {
  const s = input.summary;
  const reportName = "지출 리포트";
  const currentEmpty = s.totalAmount === 0;
  const canCompare = !currentEmpty && s.changeRate != null && s.prevTotalAmount > 0;
  const totalHint = canCompare ? `전월 대비 ${signedPct(s.changeRate ?? 0)}` : "비교 없음";
  const materialHint =
    s.monthRevenue > 0
      ? `매출 대비 ${((s.materialAmount / s.monthRevenue) * 100).toFixed(1)}%`
      : s.prevMaterialAmount > 0 || s.materialAmount > 0
        ? `전월 대비 ${signedWon(s.materialAmount - s.prevMaterialAmount)}`
        : "산출 데이터가 없음";
  const fixedHint = s.totalAmount > 0 ? `전체 지출의 ${((s.fixedAmount / s.totalAmount) * 100).toFixed(1)}%` : "산출 데이터가 없음";
  const sharePercents = s.shareGroups.map((g) => (s.totalAmount > 0 ? Math.round((g.amount / s.totalAmount) * 100) : 0));
  const proofPercents = remainderPercents(s.proofs.map((p) => p.amount));

  const { doc, done, addPage } = createReportDoc(`${input.salon} ${reportName} ${input.periodLabel}`);
  drawCover(doc, {
    salon: input.salon,
    kicker: "MONTHLY EXPENSE REPORT",
    title: `${input.periodLabel} 지출 리포트`,
    subtitle: input.subtitle,
    heroLabel: "총 지출액",
    heroValue: won(s.totalAmount),
    mini: [
      { label: "재료·약제비", value: won(s.materialAmount) },
      { label: "고정비", value: won(s.fixedAmount) },
      { label: "증빙 미비", value: `${s.withoutProofCount.toLocaleString("ko-KR")}건` }
    ],
    chip: input.chip,
    issuedAt: input.issuedAt
  });
  addPage();
  const header: HeaderSpec = {
    salon: input.salon,
    kicker: "MONTHLY EXPENSE REPORT",
    subtitle: `${input.periodLabel} · ${input.subtitle}`,
    chip: input.chip,
    issuedAt: input.issuedAt
  };
  let y = drawHeader(doc, header);
  const nextPage = () => {
    addPage();
    return drawHeader(doc, header, true);
  };
  y = drawKpis(doc, y, [
    { label: "총 지출액", value: won(s.totalAmount), caption: totalHint, dark: true },
    { label: "재료·약제비", value: won(s.materialAmount), caption: materialHint },
    { label: "고정비", value: won(s.fixedAmount), caption: fixedHint },
    { label: "증빙 미비", value: `${s.withoutProofCount.toLocaleString("ko-KR")}건`, caption: "세금계산서·영수증 누락" }
  ]);
  y = drawSharePair(
    doc,
    y,
    {
      title: "지출 성격별 비중",
      bar: true,
      base: s.totalAmount,
      rows: s.shareGroups.map((g, i) => ({
        label: `${g.label} (${g.count}건)`,
        amount: g.amount,
        pctText: `${sharePercents[i]}%`,
        color: TONE[g.tone] ?? COLOR_FALLBACK
      }))
    },
    {
      title: "증빙 수단별 비중",
      bar: true,
      base: s.totalAmount,
      rows: s.proofs.map((p, i) => ({
        label: p.label,
        amount: p.amount,
        pctText: `${proofPercents[i]}%`,
        color: TONE[p.tone] ?? COLOR_FALLBACK
      }))
    }
  );
  drawTable(
    doc,
    y,
    {
      title: "상세 지출 내역",
      count: `${input.rows.length}건`,
      cols: [
        { key: "at", label: "지출 일시", w: 48, maxLines: 1 },
        { key: "category", label: "카테고리(항목)", w: 78, maxLines: 1 },
        { key: "vendor", label: "거래처", w: 64, maxLines: 1 },
        { key: "memo", label: "지출 내용", w: 153, maxLines: 2 },
        { key: "method", label: "결제 수단", w: 50, maxLines: 1 },
        { key: "amount", label: "지출 금액", w: 66, align: "right", bold: true, maxLines: 1 },
        { key: "proof", label: "증빙 상태", w: 56, maxLines: 1 }
      ],
      rows: input.rows.map((row) => ({
        at: dotted(row.expense_date),
        category: expenseCategoryLabel(row.category),
        vendor: row.vendor || "—",
        memo: row.memo || "—",
        method: expensePaymentLabel(row.payment_method),
        amount: won(Number(row.amount)),
        proof: expenseProofLabel(resolveExpenseProofType({ proof_type: row.proof_type }))
      }))
    },
    nextPage
  );
  finalizeFooters(doc, `${input.salon} · ${reportName} · ${input.periodLabel}`);
  doc.end();
  return done;
}

const COLOR_FALLBACK = "#2F3A2F";

export function categorySubtitle(categories: string[]) {
  if (!categories.length) return "이번 달 지출";
  const labels = categories.map((value) => EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value);
  return `이번 달 지출 · 카테고리: ${labels.join(", ")}`;
}
