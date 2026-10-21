import {
  remainderPercents,
  type SettlementArtistRow,
  type SettlementSummary
} from "@/lib/admin/settlements-data";
import { PRODUCT_DESIGNER_RATE } from "@/lib/admin/retail-products";
import {
  createReportDoc,
  drawCover,
  drawHeader,
  drawKpis,
  drawNote,
  drawSharePair,
  drawTable,
  finalizeFooters,
  won,
  type Chip,
  type HeaderSpec
} from "@/lib/admin/pdf/report-kit";

const ACCENT = "#2F3A2F";
const MUTED = "#8A847C";

function signedPct(rate: number) {
  const body = `${Math.abs(rate).toFixed(1)}%`;
  if (rate > 0) return `+${body} ▲`;
  if (rate < 0) return `-${body} ▼`;
  return "0.0%";
}

function screenWon(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value.toLocaleString("ko-KR")}원`;
}

function withholdingCell(value: number | null) {
  if (value == null) return "—";
  if (value > 0) return `-${screenWon(value)}`;
  return screenWon(value);
}

export function buildSettlementsReportPdf(input: {
  salon: string;
  periodLabel: string;
  subtitle: string;
  chip: Chip;
  issuedAt: Date;
  designer: boolean;
  summary: SettlementSummary;
  artists: SettlementArtistRow[];
  tableRows: SettlementArtistRow[];
  prevMonthPayout: number;
  hasStaff: boolean;
}) {
  const s = input.summary;
  const reportName = "디자이너 정산 리포트";
  const canCompare = input.prevMonthPayout > 0;
  const payoutDeltaRate = canCompare ? ((s.totalNetPay - input.prevMonthPayout) / input.prevMonthPayout) * 100 : 0;
  const payoutHint = canCompare ? `전월 대비 ${signedPct(payoutDeltaRate)}` : "비교 없음";
  const rateHint =
    s.avgCommissionRate == null
      ? "산출 데이터가 없음"
      : `평균 수당률 ${s.avgCommissionRate.toFixed(1)}%(공제 전 세전 수당)`;
  const shareSource = input.artists.filter((row) => (row.netPay ?? 0) > 0);
  const sharePercents = remainderPercents(shareSource.map((row) => row.netPay ?? 0));
  const incentive = s.totalIncentive;
  const netPct = incentive > 0 ? (s.totalNetPay / incentive) * 100 : 0;
  const taxPct = incentive > 0 ? (s.totalWithholding / incentive) * 100 : 0;
  const { doc, done, addPage } = createReportDoc(`${input.salon} ${reportName} ${input.periodLabel}`);
  drawCover(doc, {
    salon: input.salon,
    kicker: "MONTHLY SETTLEMENT REPORT",
    title: `${input.periodLabel} 디자이너 정산 리포트`,
    subtitle: input.subtitle,
    heroLabel: input.designer ? "실지급액" : "총 실지급액",
    heroValue: screenWon(s.totalNetPay),
    mini: [
      { label: input.designer ? "매출액" : "총 매출액", value: screenWon(s.totalRevenue) },
      { label: input.designer ? "발생 인센티브" : "총 발생 인센티브", value: screenWon(s.totalIncentive) },
      { label: "원천징수(3.3%)", value: screenWon(s.totalWithholding) }
    ],
    chip: input.chip,
    issuedAt: input.issuedAt
  });
  addPage();
  const header: HeaderSpec = {
    salon: input.salon,
    kicker: "MONTHLY SETTLEMENT REPORT",
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
    { label: input.designer ? "실지급액" : "총 실지급액", value: screenWon(s.totalNetPay), caption: payoutHint, dark: true },
    { label: input.designer ? "매출액" : "총 매출액", value: screenWon(s.totalRevenue), caption: `정산 대상 실적(${s.completedCount}건)` },
    { label: input.designer ? "발생 인센티브" : "총 발생 인센티브", value: screenWon(s.totalIncentive), caption: rateHint },
    { label: input.designer ? "원천징수(3.3%)" : "총 원천징수(3.3%)", value: screenWon(s.totalWithholding), caption: "익월 10일 세무 납부 대상" }
  ]);
  y = drawSharePair(
    doc,
    y,
    {
      title: "디자이너별 정산액 비중",
      bar: true,
      base: shareSource.reduce((sum, row) => sum + (row.netPay ?? 0), 0),
      rows: shareSource.map((row, index) => ({
        label: row.artistName,
        amount: row.netPay ?? 0,
        pctText: `${sharePercents[index]}%`,
        color: index % 2 === 0 ? ACCENT : MUTED
      }))
    },
    {
      title: "수당 vs 공제 구조",
      rowBars: true,
      base: incentive > 0 ? incentive : 1,
      rows: [
        { label: "발생 인센티브", amount: s.totalIncentive, pctText: `${netPct.toFixed(1)}%`, color: ACCENT },
        { label: "원천징수", amount: s.totalWithholding, pctText: `${taxPct.toFixed(1)}%`, color: MUTED }
      ]
    }
  );
  y = drawTable(
    doc,
    y,
    {
      title: "디자이너별 정산",
      count: `${input.tableRows.length}명`,
      empty: "해당 월에 정산할 내역이 없습니다.",
      cellPad: 5,
      cols: [
        { key: "name", label: "디자이너", w: 62, maxLines: 1 },
        { key: "revenue", label: "담당 매출", w: 58, align: "right", maxLines: 1 },
        { key: "product", label: "제품 판매", w: 58, align: "right", maxLines: 1 },
        { key: "productFee", label: `제품 커미션(${PRODUCT_DESIGNER_RATE}%)`, w: 61, align: "right", maxLines: 1 },
        { key: "rate", label: "커미션 요율", w: 34, align: "right", maxLines: 1 },
        { key: "incentive", label: "발생 인센티브", w: 58, align: "right", maxLines: 1 },
        { key: "tax", label: "원천징수(3.3%)", w: 62, align: "right", maxLines: 1 },
        { key: "net", label: "실지급액", w: 64, align: "right", bold: true, maxLines: 1 },
        { key: "account", label: "지급 계좌", w: 58, maxLines: 2 }
      ],
      rows: input.tableRows.map((row) => ({
        name: `${row.artistName}(${row.employmentLabel})`,
        revenue: screenWon(row.revenue),
        product: screenWon(row.productRevenue ?? 0),
        productFee: row.productIncentive != null ? screenWon(row.productIncentive) : "—",
        rate: row.hasCommission ? `${row.commissionRate}%` : "0%",
        incentive: row.incentive != null ? screenWon(row.incentive) : "—",
        tax: withholdingCell(row.withholding),
        net: row.netPay != null ? screenWon(row.netPay) : "—",
        account: [row.bankName, row.bankAccount].map((v) => (v || "").trim()).filter(Boolean).join("\n") || "—"
      }))
    },
    nextPage
  );
  const note = input.hasStaff
    ? "원천징수(3.3%)는 프리랜서에게만 적용합니다. 4대보험 대상 직원의 급여·공제는 급여대장에서 별도로 처리하세요.\n원천징수한 세액은 지급일이 속한 달의 다음 달 10일까지 신고·납부해야 하며, 실제 신고는 세무 대리인과 확인하세요."
    : "원천징수 3.3%는 일반적인 사업소득 기준입니다.\n원천징수한 세액은 지급일이 속한 달의 다음 달 10일까지 신고·납부해야 하며, 실제 신고는 세무 대리인과 확인하세요.";
  drawNote(doc, y, note, nextPage);
  finalizeFooters(doc, `${input.salon} · ${reportName} · ${input.periodLabel}`);
  doc.end();
  return done;
}
