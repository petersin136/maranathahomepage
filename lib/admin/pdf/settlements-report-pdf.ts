import {
  remainderPercents,
  type SettlementArtistRow,
  type SettlementSummary
} from "@/lib/admin/settlements-data";
import { PRODUCT_DESIGNER_RATE } from "@/lib/admin/retail-products";
import { splitSettlementHistory } from "@/lib/admin/settlement-history";
import {
  COLOR,
  CW,
  M,
  createReportDoc,
  drawCover,
  drawHeader,
  drawKpis,
  drawNote,
  drawSharePair,
  drawTable,
  finalizeFooters,
  hline,
  t,
  tr,
  type Chip,
  type Doc,
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
  const rateHint = `(시술 매출 × 디자이너별 커미션 요율) + (제품 매출 × 15%)`;
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

function payLine(doc: Doc, y: number, label: string, detail: string, amount: string, strong = false) {
  if (strong) hline(doc, M, M + CW, y, 0.6, COLOR.lineStrong);
  const top = strong ? y + 12 : y;
  t(doc, label, M, top, { size: 10, bold: strong });
  if (detail) t(doc, detail, M + 92, top + 1, { size: 8.5, color: COLOR.sub });
  tr(doc, amount, M + CW, top, { size: 10, bold: strong, color: amount.startsWith("−") || amount.startsWith("-") ? COLOR.minus : COLOR.ink });
  return top + 24;
}

function bookingDate(ymd: string) {
  return ymd.length >= 10 ? `${ymd.slice(2, 4)}. ${ymd.slice(5, 7)}. ${ymd.slice(8, 10)}` : ymd;
}

export function buildArtistSettlementsPdf(input: {
  salon: string;
  periodLabel: string;
  chip: Chip;
  issuedAt: Date;
  artists: SettlementArtistRow[];
}) {
  const reportName = input.artists.length === 1 ? `${input.artists[0].artistName} 정산 리포트` : "디자이너별 정산 리포트";
  const names = input.artists.map((row) => row.artistName).join(" · ");
  const sumOf = (pick: (row: SettlementArtistRow) => number | null) =>
    input.artists.reduce((sum, row) => sum + (pick(row) ?? 0), 0);
  const one = input.artists.length === 1 ? input.artists[0] : null;
  const { doc, done, addPage } = createReportDoc(`${input.salon} ${reportName} ${input.periodLabel}`);
  drawCover(doc, {
    salon: input.salon,
    kicker: "DESIGNER SETTLEMENT",
    title: `${input.periodLabel} 디자이너 정산 리포트`,
    subtitle: `포함 인원 ${names}`,
    heroLabel: one ? "실지급액" : "총 실지급액",
    heroValue: screenWon(one ? one.netPay : sumOf((row) => row.netPay)),
    mini: [
      { label: one ? "담당 매출" : "총 매출액", value: screenWon(one ? one.revenue : sumOf((row) => row.revenue)) },
      { label: one ? "발생 인센티브" : "총 발생 인센티브", value: screenWon(one ? one.incentive : sumOf((row) => row.incentive)) },
      { label: "원천징수(3.3%)", value: withholdingCell(one ? one.withholding : sumOf((row) => row.withholding)) }
    ],
    chip: input.chip,
    issuedAt: input.issuedAt
  });
  addPage();
  let lastY = M;
  input.artists.forEach((row, index) => {
    if (index > 0) addPage();
    const header: HeaderSpec = {
      salon: input.salon,
      kicker: "DESIGNER SETTLEMENT",
      subtitle: `${input.periodLabel} · ${row.artistName}(${row.employmentLabel})`,
      chip: input.chip,
      issuedAt: input.issuedAt
    };
    let y = drawHeader(doc, header) + 8;
    const nextPage = () => {
      addPage();
      return drawHeader(doc, header, true);
    };
    y = drawKpis(doc, y, [
      { label: "실지급액", value: screenWon(row.netPay), caption: row.status, dark: true },
      { label: "담당 매출", value: screenWon(row.revenue), caption: `완료 ${row.count}건` },
      { label: "발생 인센티브", value: screenWon(row.incentive), caption: row.hasCommission ? `커미션 ${row.commissionRate}%` : "커미션 없음" },
      { label: "원천징수(3.3%)", value: withholdingCell(row.withholding), caption: "소득세 + 지방소득세" }
    ]);
    y += 8;
    t(doc, "지급 산정", M, y, { size: 12, bold: true });
    y += 22;
    if (!row.hasCommission) {
      t(doc, "커미션 요율이 없어 인센티브를 산정하지 않습니다.", M, y, { size: 9, color: COLOR.sub });
      y += 18;
    } else {
      y = payLine(
        doc,
        y,
        "시술 인센티브",
        `${screenWon(row.serviceRevenue)} × ${row.commissionRate}%`,
        screenWon(row.serviceIncentive)
      );
      y = payLine(
        doc,
        y,
        "제품 인센티브",
        `${screenWon(row.productRevenue)} × ${PRODUCT_DESIGNER_RATE}%`,
        screenWon(row.productIncentive)
      );
      y = payLine(doc, y, "발생 인센티브", "", screenWon(row.incentive), true);
      if (row.isFreelance) {
        y = payLine(doc, y, "소득세", "발생 인센티브의 3%, 10원 미만 버림", row.incomeTax != null ? `−${screenWon(row.incomeTax)}` : "—");
        y = payLine(doc, y, "지방소득세", "소득세의 10%, 10원 미만 버림", row.localIncomeTax != null ? `−${screenWon(row.localIncomeTax)}` : "—");
      }
      y = payLine(doc, y, "실지급액", "", screenWon(row.netPay), true);
    }
    const meta = [
      `완료 ${row.count}건`,
      `예금주 ${row.bankHolder || "—"}`,
      `상태 ${row.status}`,
      row.paidAt ? `지급일시 ${kstPaid(row.paidAt)}` : ""
    ].filter(Boolean).join("   ");
    t(doc, meta, M, y + 8, { size: 8.5, color: COLOR.sub });
    y += 28;
    const history = splitSettlementHistory(row.bookings);
    const visitCols = [
      { key: "date", label: "일자", w: 62, maxLines: 1 },
      { key: "customer", label: "고객", w: 70, maxLines: 1 },
      { key: "item", label: "항목", w: 230, maxLines: 2 },
      { key: "method", label: "결제", w: 58, maxLines: 1 },
      { key: "amount", label: "금액", w: 95, align: "right" as const, maxLines: 1 }
    ];
    y = drawTable(
      doc,
      y,
      {
        title: "시술 내역",
        count: `${history.serviceCount}건`,
        empty: "시술 내역이 없습니다.",
        cellPad: 4,
        cols: visitCols,
        rows: history.serviceVisits.map((b) => ({
          date: bookingDate(b.bookingDate),
          customer: b.customerName || "—",
          item: b.names.length ? b.names.join(" / ") : "—",
          method: b.paymentMethodLabel || "—",
          amount: screenWon(b.amount)
        }))
      },
      nextPage
    );
    if (history.kindGroups.length) {
      y = drawTable(
        doc,
        y,
        {
          title: "시술별",
          count: `${history.kindGroups.length}항목`,
          empty: "시술 내역이 없습니다.",
          cellPad: 4,
          cols: [
            { key: "kind", label: "구분", w: 90, maxLines: 1 },
            { key: "count", label: "건수", w: 70, maxLines: 1 },
            { key: "amount", label: "금액", w: 120, align: "right", maxLines: 1 },
            { key: "share", label: "비중", w: 70, align: "right", maxLines: 1 }
          ],
          rows: history.kindGroups.map((group) => ({
            kind: group.label,
            count: `${group.count}건`,
            amount: screenWon(group.amount),
            share: history.serviceAmount > 0 ? `${Math.round((group.amount / history.serviceAmount) * 100)}%` : "—"
          }))
        },
        nextPage
      );
    }
    y = drawTable(
      doc,
      y,
      {
        title: "제품 판매",
        count: `${history.productCount}건`,
        empty: "제품 판매 내역이 없습니다.",
        cellPad: 4,
        cols: visitCols,
        rows: history.productVisits.map((b) => ({
          date: bookingDate(b.bookingDate),
          customer: b.customerName || "—",
          item: b.names.length ? b.names.join(" / ") : "—",
          method: b.paymentMethodLabel || "—",
          amount: screenWon(b.amount)
        }))
      },
      nextPage
    );
    lastY = y + 4;
  });
  const note =
    "원천징수 3.3%는 일반적인 사업소득 기준입니다. 원천징수한 세액은 지급일이 속한 달의 다음 달 10일까지 신고·납부해야 하며, 실제 신고는 세무 대리인과 확인하세요.";
  drawNote(doc, lastY, note, () => {
    addPage();
    return drawHeader(
      doc,
      {
        salon: input.salon,
        kicker: "DESIGNER SETTLEMENT",
        subtitle: input.periodLabel,
        chip: input.chip,
        issuedAt: input.issuedAt
      },
      true
    );
  });
  finalizeFooters(doc, `${input.salon} · ${reportName} · ${input.periodLabel}`);
  doc.end();
  return done;
}

function kstPaid(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const g = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  return `${g("year")}. ${g("month")}. ${g("day")} ${g("hour")}:${g("minute")}`;
}
