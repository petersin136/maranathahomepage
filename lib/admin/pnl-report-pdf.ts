import {
  COLOR,
  CW,
  LIMIT,
  M,
  createReportDoc,
  drawCover,
  drawHeader,
  drawKpis,
  drawShare,
  shareHeight,
  finalizeFooters,
  hline,
  kpiWon,
  num,
  signedWon,
  t,
  tr,
  won,
  type Doc,
  type HeaderSpec
} from "@/lib/admin/pdf/report-kit";
import { periodNoun } from "@/lib/admin/briefing-period";

export type PnlSummary = {
  revenue: number;
  ownerRemain: number;
  expenseTotal: number;
  productCost: number;
  designerIncentive: number;
  taxSetAside: number;
  ownerServiceRevenue: number;
  designerServiceRevenue: number;
  shopKeepDesignerService: number;
  productRevenue: number;
  designerServiceIncentive: number;
  designerProductIncentive: number;
  fixedAmount: number;
  materialAmount: number;
  operatingAmount: number;
  operatingProfit: number;
  vatPayable: number;
  incomeTaxReserve: number;
};

export type PnlReportPeriod = import("@/lib/admin/briefing-period").BriefingKind;

export type PnlReportMeta = {
  salonName: string;
  periodLabel: string;
  closed: boolean;
  issuedAt: Date;
  period: PnlReportPeriod;
};

const DOT = {
  fixed: "#6B5A4A",
  product: "#6B7A9B",
  operating: "#9A948C",
  incentive: "#B16242",
  tax: "#9A4A3A"
};

type FlowRow = {
  label: string;
  caption: string;
  amount: number;
  sign: "+" | "-";
  dot: string;
  strongTop?: boolean;
  emphasis?: boolean;
};

const FLOW_DESC =
  "위에서 아래로 읽으면 됩니다. 초록은 들어온 매출, 갈색·주황은 나간 돈, 맨 아래가 최종 세후 순수익입니다.";
const FLOW_NOTE =
  "최종 세후 순수익은 추정치입니다. 부가가치세·종합소득세는 공제·감면에 따라 달라질 수 있습니다.";

function manUnit(amount: number) {
  const scaled = Math.round(amount / 1_000) / 10;
  return `${scaled.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}만`;
}

function drawFlow(doc: Doc, y: number, s: PnlSummary, meta: PnlReportMeta) {
  const noun = periodNoun(meta.period);
  const profitSign: "+" | "-" = s.operatingProfit >= 0 ? "+" : "-";
  const remainSign: "+" | "-" = s.ownerRemain >= 0 ? "+" : "-";
  const flow: FlowRow[] = [
    {
      label: meta.period === "month" ? "월 총매출" : `${noun} 총매출`,
      caption: `원장 직접 시술 ${won(s.ownerServiceRevenue)} · 디자이너 시술 ${won(s.designerServiceRevenue)} · 제품 ${won(s.productRevenue)}`,
      amount: s.revenue,
      sign: "+",
      dot: COLOR.green
    },
    {
      label: "고정비(임차료·관리비 등)",
      caption: "매장을 유지하는 데 매달 나가는 돈",
      amount: s.fixedAmount,
      sign: "-",
      dot: DOT.fixed
    },
    {
      label: "판매 제품 매입 원가",
      caption: "팔린 샴푸·오일을 떼어 온 값",
      amount: s.productCost,
      sign: "-",
      dot: DOT.product
    },
    {
      label: "운영비",
      caption: "소모품, 광고, 재료·약제, 프로그램 이용료 등",
      amount: s.operatingAmount + s.materialAmount,
      sign: "-",
      dot: DOT.operating
    },
    {
      label: "디자이너 정산 인센티브",
      caption: "정산 탭의 디자이너별 인센티브를 더한 금액",
      amount: s.designerIncentive,
      sign: "-",
      dot: DOT.incentive
    },
    {
      label: "세전 영업이익",
      caption: "매출에서 비용·인센을 뺀 금액",
      amount: s.operatingProfit,
      sign: profitSign,
      dot: COLOR.green,
      strongTop: true
    },
    {
      label: "부가가치세(예상)",
      caption: `${noun} 매출·매입 기준으로 낼 부가세 추정`,
      amount: s.vatPayable,
      sign: "-",
      dot: DOT.tax
    },
    {
      label: "종합소득세(예상 적립액)",
      caption:
        meta.period === "year"
          ? "이 해의 남은 돈으로 계산한 적립액"
          : meta.period === "month"
            ? "이 달이 1년 내내 같다고 보고 12로 나눈 적립액"
            : "이 기간이 1년 내내 같다고 보고 나눠 둔 적립액",
      amount: s.incomeTaxReserve,
      sign: "-",
      dot: DOT.tax
    },
    {
      label: "= 최종 세후 순수익(실수령)",
      caption: `원장님이 ${noun} 사업에서 가져갈 수 있는 금액`,
      amount: s.ownerRemain,
      sign: remainSign,
      dot: COLOR.green,
      strongTop: true,
      emphasis: true
    }
  ];

  const PAD = 8;
  const TITLE_H = 28;
  const NOTE_GAP = 8;
  doc.font("NotoR").fontSize(6.5);
  const noteH = doc.heightOfString(FLOW_NOTE, { width: CW, lineGap: 2 });
  const ROW_H = Math.max(
    24,
    Math.min(34, Math.floor((LIMIT - y - TITLE_H - PAD * 2 - NOTE_GAP - noteH) / flow.length))
  );

  t(doc, meta.period === "month" ? "한 눈에 보는 월간 손익 흐름" : "한 눈에 보는 손익 흐름", M, y, { size: 11, bold: true });
  t(doc, FLOW_DESC, M, y + 16, { size: 7, color: COLOR.sub });
  y += TITLE_H;

  const bh = PAD * 2 + flow.length * ROW_H;
  doc.roundedRect(M, y, CW, bh, 6).fill(COLOR.cream);
  const top = Math.round((ROW_H - 26) / 2) + 3;
  let ry = y + PAD;
  flow.forEach((r, j) => {
    if (j > 0) {
      hline(doc, M + 14, M + CW - 14, ry, r.strongTop ? 1 : 0.5, r.strongTop ? COLOR.lineStrong : COLOR.line);
    }
    doc.circle(M + 20, ry + top + 5, 2.5).fill(r.dot);
    t(doc, r.label, M + 30, ry + top, { size: 9, bold: !!r.emphasis });
    t(doc, r.caption, M + 30, ry + top + 12, { size: 6.5, color: COLOR.sub });
    const plus = r.sign === "+";
    tr(doc, signedWon(r.amount, r.sign), M + CW - 14, ry + top - (r.emphasis ? 1.5 : 0), {
      size: r.emphasis ? 11 : 9.5,
      bold: plus,
      color: plus ? COLOR.ink : COLOR.minus
    });
    ry += ROW_H;
  });
  y += bh + NOTE_GAP;
  doc.font("NotoR").fontSize(6.5).fillColor(COLOR.sub).text(FLOW_NOTE, M, y, { width: CW, lineGap: 2 });
}

export function buildPnlReportPdf(raw: PnlSummary, meta: PnlReportMeta): Promise<Buffer> {
  const s = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, num(v)])) as PnlSummary;
  const salon = (meta.salonName ?? "").trim() || "HAIR UP";
  const reportName = "매장 손익 리포트";
  const chip = meta.period === "month" && meta.closed
    ? { text: "마감 확정", filled: true }
    : { text: "집계 중", filled: false };
  const moneyOut = s.expenseTotal + s.productCost + s.designerIncentive;
  const keepRows = [
    { label: "원장 직접 시술", caption: "원장 시술 매출은 100% 매장 귀속", amount: s.ownerServiceRevenue },
    {
      label: "디자이너 위탁 마진",
      caption: `디자이너 시술 총매출 ${manUnit(s.designerServiceRevenue)} - 시술 인센 ${manUnit(s.designerServiceIncentive)}`,
      amount: s.shopKeepDesignerService
    },
    {
      label: "제품 판매 순마진",
      caption: `제품 판매가 ${manUnit(s.productRevenue)} - 매입가 ${manUnit(s.productCost)} - 제품 인센 ${manUnit(s.designerProductIncentive)}`,
      amount: s.productRevenue - s.productCost - s.designerProductIncentive
    }
  ];
  const keepTotal = keepRows.reduce((a, r) => a + r.amount, 0);
  const keepSpec = {
    title: "매장 수익 창출 구조",
    base: keepTotal,
    rows: keepRows,
    total: { label: "매장 몫 합계", amount: keepTotal }
  };

  const { doc, done, addPage } = createReportDoc(`${salon} ${reportName} ${meta.periodLabel}`);
  drawCover(doc, {
    salon,
    kicker: "MONTHLY P&L REPORT",
    title: `${meta.periodLabel} 매장 손익 리포트`,
    subtitle: "원장님만 보는 세후 남는 돈",
    heroLabel: "당월 세후 순수익",
    heroValue: kpiWon(s.ownerRemain),
    mini: [
      { label: "총 매출액", value: kpiWon(s.revenue) },
      { label: "총 지출 및 인센", value: kpiWon(moneyOut) },
      { label: "예상 제세공과금", value: kpiWon(s.taxSetAside) }
    ],
    chip,
    issuedAt: meta.issuedAt
  });
  addPage();
  const header: HeaderSpec = {
    salon,
    kicker: "MONTHLY P&L REPORT",
    subtitle: `${meta.periodLabel} · 원장님만 보는 세후 남는 돈`,
    chip,
    issuedAt: meta.issuedAt
  };
  let y = drawHeader(doc, header);
  y = drawKpis(doc, y, [
    { label: "당월 세후 순수익", value: kpiWon(s.ownerRemain), caption: "통장에 남는 금액", dark: true },
    { label: "총 매출액", value: kpiWon(s.revenue), caption: "시술 + 제품 매출" },
    { label: "총 지출 및 인센", value: kpiWon(moneyOut), caption: "월세 · 재료 · 인센" },
    { label: "예상 제세공과금", value: kpiWon(s.taxSetAside), caption: "부가세 + 예상 종소세" }
  ]);
  const keepH = shareHeight(keepSpec);
  drawShare(doc, M, y, CW, keepH, keepSpec);
  y += keepH + 16;
  drawFlow(doc, y, s, meta);
  finalizeFooters(doc, `${salon} · ${reportName} · ${meta.periodLabel}`);
  doc.end();
  return done;
}
