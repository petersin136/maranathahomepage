import {
  COLOR,
  CW,
  LIMIT,
  M,
  createReportDoc,
  drawCover,
  drawHeader,
  drawKpis,
  drawSharePair,
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

export type PnlReportPeriod = "month" | "week" | "day";

export type PnlReportMeta = {
  salonName: string;
  periodLabel: string;
  closed: boolean;
  issuedAt: Date;
  period: PnlReportPeriod;
};

const DOT = {
  fixed: "#6B5A4A",
  material: "#8A847C",
  product: "#6B7A9B",
  operating: "#9A948C",
  incentive: "#B16242",
  tax: "#9A4A3A"
};

function periodNoun(period: PnlReportPeriod) {
  if (period === "week") return "이번 주";
  if (period === "day") return "이날";
  return "이번 달";
}

type FlowRow = {
  label: string;
  caption: string;
  amount: number;
  sign: "+" | "-";
  dot: string;
  strongTop?: boolean;
  emphasis?: boolean;
};

const FLOW_TITLE = "한눈에 보는 월간 손익 흐름";
const FLOW_DESC =
  "위에서 아래로 읽으면 됩니다. 초록은 들어온 돈, 갈색·주황은 나간 돈, 맨 아래가 세후 실수령입니다.";
const FLOW_NOTE =
  "세후 실수령은 추정치입니다. 부가세·예상 종합소득세는 공제·감면에 따라 달라질 수 있고, 디자이너 원천세는 인센에서 이미 뺐으니 세후 금액에서 다시 빼지 않습니다.";

function drawFlow(doc: Doc, y: number, s: PnlSummary, meta: PnlReportMeta) {
  const noun = periodNoun(meta.period);
  const profitSign: "+" | "-" = s.operatingProfit >= 0 ? "+" : "-";
  const remainSign: "+" | "-" = s.ownerRemain >= 0 ? "+" : "-";
  const flow: FlowRow[] = [
    {
      label: `들어온 돈 (${noun} 매출)`,
      caption: `원장 직접 시술 ${won(s.ownerServiceRevenue)} · 디자이너 시술 ${won(s.designerServiceRevenue)} · 제품 ${won(s.productRevenue)}`,
      amount: s.revenue,
      sign: "+",
      dot: COLOR.green
    },
    {
      label: "월세·관리비 등 고정비",
      caption: "매장을 유지하는 데 매달 나가는 돈",
      amount: s.fixedAmount,
      sign: "-",
      dot: DOT.fixed
    },
    {
      label: "재료·약제비",
      caption: "염색약, 클리닉 약제처럼 시술에 쓰는 재료",
      amount: s.materialAmount,
      sign: "-",
      dot: DOT.material
    },
    {
      label: "제품 매입가",
      caption: "팔린 샴푸·오일을 떼어 온 값",
      amount: s.productCost,
      sign: "-",
      dot: DOT.product
    },
    {
      label: "운영비",
      caption: "소모품, 광고, 프로그램 이용료 등",
      amount: s.operatingAmount,
      sign: "-",
      dot: DOT.operating
    },
    {
      label: "디자이너에게 준 인센티브",
      caption: `시술 인센 ${won(s.designerServiceIncentive)} · 제품 인센 ${won(s.designerProductIncentive)}`,
      amount: s.designerIncentive,
      sign: "-",
      dot: DOT.incentive
    },
    {
      label: "세금 떼기 전",
      caption: "매출에서 비용·인센을 뺀 금액",
      amount: s.operatingProfit,
      sign: profitSign,
      dot: COLOR.green,
      strongTop: true
    },
    {
      label: "부가세",
      caption: `${noun} 매출·매입 기준으로 낼 부가세 추정`,
      amount: s.vatPayable,
      sign: "-",
      dot: DOT.tax
    },
    {
      label: "예상 종합소득세",
      caption:
        meta.period === "month"
          ? "이 달이 1년 내내 같다고 보고 12로 나눈 적립액"
          : "이 기간이 1년 내내 같다고 보고 나눠 둔 적립액",
      amount: s.incomeTaxReserve,
      sign: "-",
      dot: DOT.tax
    },
    {
      label: "세후 실제 남는 돈",
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

  t(doc, FLOW_TITLE, M, y, { size: 11, bold: true });
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
    { label: "디자이너 위탁 마진", caption: "시술 매출 \u2212 디자이너 시술 인센", amount: s.shopKeepDesignerService },
    {
      label: "제품 판매 순마진",
      caption: "제품 판매가에서 매입가와 디자이너 수당 15%를 뺀 매장 몫",
      amount: s.productRevenue - s.productCost - s.designerProductIncentive
    }
  ];
  const keepTotal = keepRows.reduce((a, r) => a + r.amount, 0);
  const costRows = [
    { label: "디자이너에게 준 인센티브", amount: s.designerIncentive },
    { label: "월세·관리비 등 고정비", amount: s.fixedAmount },
    { label: "제품 매입가", amount: s.productCost },
    { label: "운영비", amount: s.operatingAmount },
    { label: "재료·약제비", amount: s.materialAmount }
  ].sort((a, b) => b.amount - a.amount);
  const costTotal = costRows.reduce((a, r) => a + r.amount, 0);

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
  y = drawSharePair(
    doc,
    y,
    { title: "매장 수익 창출 구조", base: keepTotal, rows: keepRows, total: { label: "매장 몫 합계", amount: keepTotal } },
    { title: "비용 지출 구조", base: costTotal, rows: costRows, total: { label: "합계", amount: costTotal } }
  );
  drawFlow(doc, y, s, meta);
  finalizeFooters(doc, `${salon} · ${reportName} · ${meta.periodLabel}`);
  doc.end();
  return done;
}
