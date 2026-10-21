import { METHOD_LABEL, salesBoardView } from "@/lib/admin/sales-data";
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

const TONE = {
  accent: "#2F3A2F",
  muted: "#8A847C",
  label: "#9A948C"
};

function signedPct(rate: number) {
  const body = `${Math.abs(rate).toFixed(1)}%`;
  if (rate > 0) return `+${body} ▲`;
  if (rate < 0) return `-${body} ▼`;
  return "0.0%";
}

function signedCount(delta: number) {
  if (delta > 0) return `+${delta.toLocaleString("ko-KR")}건 ▲`;
  if (delta < 0) return `${delta.toLocaleString("ko-KR")}건 ▼`;
  return "0건";
}

function signedWon(delta: number) {
  const abs = Math.abs(delta).toLocaleString("ko-KR");
  if (delta > 0) return `+${abs}원 ▲`;
  if (delta < 0) return `-${abs}원 ▼`;
  return "0원";
}

function displayMethodPercents(methods: { share: number; amount: number }[]): number[] {
  const total = methods.reduce((sum, method) => sum + method.amount, 0);
  if (total === 0) return methods.map(() => 0);
  const floors = methods.map((method) => Math.floor(method.share));
  let rest = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = methods
    .map((method, index) => ({
      index,
      frac: method.share - Math.floor(method.share),
      amount: method.amount
    }))
    .sort((a, b) => b.frac - a.frac || b.amount - a.amount);
  const percents = floors.slice();
  for (const item of order) {
    if (rest <= 0) break;
    percents[item.index] += 1;
    rest -= 1;
  }
  return percents;
}

function formatPaidAt(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value])
  );
  return `${parts.month}. ${parts.day} ${parts.hour}:${parts.minute}`;
}

function phoneTail(phone: string) {
  return phone.replace(/\D/g, "").slice(-4);
}

export function buildSalesReportPdf(input: {
  salon: string;
  periodLabel: string;
  subtitle: string;
  chip: Chip;
  issuedAt: Date;
  view: ReturnType<typeof salesBoardView>;
}) {
  const s = input.view;
  const reportName = "매출 리포트";
  const methodPercents = displayMethodPercents(s.methods);
  const mixPercents = displayMethodPercents([
    { share: s.serviceShare, amount: s.serviceAmount },
    { share: s.productShare, amount: s.productAmount }
  ]);
  const prevCount = s.completedCount - s.completedChange;
  const currentEmpty = s.completedCount === 0;
  const canCompare = !currentEmpty && s.revenueChangeRate != null && prevCount > 0;
  const excluded = s.attrition.cancelledCount + s.attrition.noshowCount;
  const revenueHint = canCompare ? `전월 대비 ${signedPct(s.revenueChangeRate ?? 0)}` : "전월 결제 내역 없음";
  const countHint = currentEmpty
    ? "결제 내역 없음"
    : canCompare
      ? `전월 대비 ${signedCount(s.completedChange)} · 취소/노쇼 ${excluded}건 제외`
      : `취소/노쇼 ${excluded}건 제외`;
  const avgHint = currentEmpty
    ? "산출 데이터가 없음"
    : canCompare
      ? `전월 대비 ${signedWon(s.avgTicket - s.prevAvgTicket)}`
      : "전월 결제 내역 없음";
  const depositHint =
    s.totalRevenue > 0
      ? `전체 매출의 ${s.depositShare.toFixed(1)}% · 현장 결제 ${s.onSiteShare.toFixed(1)}%`
      : "사전 0.0% · 현장 0.0%";
  const methodTone = { card: TONE.accent, transfer: TONE.muted, cash: TONE.label } as const;

  const { doc, done, addPage } = createReportDoc(`${input.salon} ${reportName} ${input.periodLabel}`);
  drawCover(doc, {
    salon: input.salon,
    kicker: "MONTHLY SALES REPORT",
    title: `${input.periodLabel} 매출 리포트`,
    subtitle: input.subtitle,
    heroLabel: "총 매출액",
    heroValue: won(s.totalRevenue),
    mini: [
      { label: "결제 완료 건수", value: `${s.completedCount.toLocaleString("ko-KR")}건` },
      { label: "고객 객단가", value: won(s.avgTicket) },
      { label: "사전 예약금", value: won(s.depositAmount) }
    ],
    chip: input.chip,
    issuedAt: input.issuedAt
  });
  addPage();
  const header: HeaderSpec = {
    salon: input.salon,
    kicker: "MONTHLY SALES REPORT",
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
    { label: "총 매출액", value: won(s.totalRevenue), caption: revenueHint, dark: true },
    { label: "결제 완료 건수", value: `${s.completedCount.toLocaleString("ko-KR")}건`, caption: countHint },
    { label: "고객 객단가", value: won(s.avgTicket), caption: avgHint },
    { label: "사전 예약금", value: won(s.depositAmount), caption: depositHint }
  ]);
  y = drawSharePair(
    doc,
    y,
    {
      title: "결제 수단별 매출",
      bar: true,
      base: s.totalRevenue,
      rows: s.methods.map((m, i) => ({
        label: METHOD_LABEL[m.method],
        amount: m.amount,
        pctText: `${methodPercents[i]}%`,
        color: methodTone[m.method]
      }))
    },
    {
      title: "시술 · 제품별 매출",
      rowBars: true,
      base: s.totalRevenue,
      rows: [
        { label: "시술", amount: s.serviceAmount, pctText: `${mixPercents[0]}%`, color: TONE.accent },
        { label: "제품", amount: s.productAmount, pctText: `${mixPercents[1]}%`, color: TONE.muted }
      ]
    }
  );
  drawTable(
    doc,
    y,
    {
      title: "상세 결제 내역",
      count: `${s.payments.length}건`,
      cols: [
        { key: "at", label: "결제 일시", w: 62, maxLines: 1 },
        { key: "customer", label: "고객명", w: 64, maxLines: 1 },
        { key: "artist", label: "담당자", w: 118, maxLines: 1 },
        { key: "item", label: "결제 항목", w: 111, maxLines: 2 },
        { key: "method", label: "결제 수단", w: 48, maxLines: 1 },
        { key: "amount", label: "결제 금액", w: 64, align: "right", bold: true, maxLines: 1 },
        { key: "status", label: "상태", w: 48, maxLines: 1 }
      ],
      rows: s.payments.map((row) => {
        const tail = phoneTail(row.customerPhone);
        return {
          at: formatPaidAt(row.paidAt),
          customer: tail ? `${row.customerName}(${tail})` : row.customerName,
          artist: [row.artistName, row.artistRole].filter(Boolean).join(" "),
          item: row.serviceNames.length ? `[시술] ${row.serviceNames.join(" + ")}` : "[시술] —",
          method: row.paymentMethod ? METHOD_LABEL[row.paymentMethod] : "—",
          amount: won(row.amount),
          status: row.status === "cancelled" ? "결제취소" : "결제완료"
        };
      })
    },
    nextPage
  );
  finalizeFooters(doc, `${input.salon} · ${reportName} · ${input.periodLabel}`);
  doc.end();
  return done;
}
