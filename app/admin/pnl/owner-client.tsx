"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { BriefingPeriodPicker } from "@/components/admin/BriefingPeriodPicker";
import {
  DownloadExportButton,
  FinanceHeader,
  FinanceSticky,
  Note,
  RefreshButton,
  Toolbar,
  shiftMonth,
  won
} from "@/components/admin/finance-ui";
import { compareNoun, periodNoun } from "@/lib/admin/briefing-period";
import type { OwnerPeriodKind, OwnerPnlDashboard, OwnerPnlSummary } from "@/lib/admin/owner-pnl";
import { todayKst } from "@/lib/admin/sales-data";

const C = {
  in: "#2F3A2F",
  owner: "#2A744B",
  designer: "#3A5476",
  product: "#6B7A9B",
  rent: "#6B5A4A",
  material: "#8A847C",
  operate: "#9A948C",
  pay: "#B16242",
  tax: "#9A4A3A",
  keep: "#2F3A2F"
};

const PNL_MODES: { id: OwnerPeriodKind; label: string }[] = [
  { id: "week", label: "주간" },
  { id: "month", label: "월간" },
  { id: "quarter", label: "분기" },
  { id: "half", label: "반기" },
  { id: "year", label: "연간" },
  { id: "day", label: "일간" }
];

function defaultLastMonth() {
  const [y, m] = todayKst().split("-").map(Number);
  return shiftMonth(y, m, -1);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function signedPct(rate: number) {
  const body = `${Math.abs(rate).toFixed(1)}%`;
  if (rate > 0) return `+${body} ▲`;
  if (rate < 0) return `-${body} ▼`;
  return "0.0%";
}

/** 2,458.5만 처럼 만 단위 소수 한 자리. */
function manUnit(amount: number) {
  const scaled = Math.round(amount / 1_000) / 10;
  return `${scaled.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}만`;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const scroller = document.querySelector("[data-admin-scroll='true']");
  if (scroller instanceof HTMLElement) {
    const sticky = scroller.querySelector(".sticky") as HTMLElement | null;
    const offset = (sticky?.offsetHeight ?? 0) + 12;
    const top =
      el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - offset;
    scroller.scrollTo({ top, behavior: "smooth" });
    return;
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function StackBar({
  parts,
  legend = true
}: {
  parts: { label: string; amount: number; color: string }[];
  legend?: boolean;
}) {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.amount), 0);
  return (
    <div>
      <div className="flex h-[18px] overflow-hidden rounded-[4px] bg-[#E4DFD6]">
        {parts.map((part) =>
          part.amount > 0 && total > 0 ? (
            <span
              key={part.label}
              className="h-full"
              style={{ width: `${(part.amount / total) * 100}%`, background: part.color }}
            />
          ) : null
        )}
      </div>
      {legend ? (
        <ul className="mt-5">
          {parts.map((part) => (
            <li
              key={part.label}
              className="flex items-baseline justify-between border-b border-[#EFEBE6] py-[14px] last:border-b-0"
            >
              <span className="flex items-center gap-[10px] text-[16px] font-medium">
                <span className="h-[10px] w-[10px] shrink-0 rounded-full" style={{ background: part.color }} />
                {part.label}
              </span>
              <span className="text-[16px] font-bold tabular-nums">{won(part.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LineRow({
  label,
  amount,
  color,
  hint,
  strong = false,
  sign = "auto",
  onClick
}: {
  label: string;
  amount: number;
  color: string;
  hint?: string;
  strong?: boolean;
  sign?: "auto" | "plus" | "minus" | "none";
  onClick?: () => void;
}) {
  const negative = sign === "minus" ? true : sign === "plus" || sign === "none" ? false : amount < 0;
  const value = Math.abs(amount);
  const prefix = sign === "none" ? "" : negative ? "−" : "+";
  const className = clsx(
    "flex w-full items-start justify-between gap-6 border-b border-[#EFEBE6] py-[16px] text-left last:border-b-0",
    strong && "border-t-[1.5px] border-t-[#C9C3BB] first:border-t-0",
    onClick && "cursor-pointer rounded-[6px] px-1 hover:bg-[#F6F4F0]"
  );
  const body = (
    <>
      <span>
        <span className="flex items-center gap-[10px] text-[16px] font-medium">
          <span className="h-[10px] w-[10px] shrink-0 rounded-full" style={{ background: color }} />
          {label}
        </span>
        {hint ? <span className="mt-1 block pl-[20px] text-[13px] leading-[20px] text-[#8A847C]">{hint}</span> : null}
      </span>
      <span
        className={clsx(
          "shrink-0 text-[16px] tabular-nums",
          strong ? "font-bold text-[#1C1C1C]" : negative ? "font-semibold text-[#B16242]" : "font-semibold"
        )}
      >
        {prefix}
        {won(value)}
      </span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

function FlowVatRow({ s, hint }: { s: OwnerPnlSummary; hint: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#EFEBE6]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-6 py-[16px] text-left"
      >
        <span>
          <span className="flex items-center gap-[10px] text-[16px] font-medium [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            <span className="h-[10px] w-[10px] shrink-0 rounded-full" style={{ background: C.tax }} />
            부가가치세(예상)
            <span className="text-[11px] leading-none text-[#8A847C]" aria-hidden>
              {open ? "▴" : "▾"}
            </span>
          </span>
          <span className="mt-1 block pl-[20px] text-[13px] leading-[20px] text-[#8A847C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            {hint}
          </span>
        </span>
        <span className="shrink-0 text-[16px] font-semibold tabular-nums text-[#B16242]">−{won(Math.abs(s.vatPayable))}</span>
      </button>
      {open ? (
        <ul className="mb-[14px] pl-[20px]">
          <li className="text-[13px] leading-[20px] text-[#5C564F] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            └ 매출세액: +{won(s.vatOutput)}(총 공급가액의 10%)
          </li>
          <li className="mt-[6px] text-[13px] leading-[20px] text-[#5C564F] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            └ 매입세액 공제: −{won(s.vatInput)}(세금계산서·사업자카드 매입액의 10%)
          </li>
          <li className="mt-[6px] text-[13px] leading-[20px] text-[#5C564F] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            └ 산출 공식: 매출세액 - 매입세액
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export default function AdminOwnerPage({
  initial,
  initialError
}: {
  initial: OwnerPnlDashboard | null;
  initialError: string | null;
}) {
  const fallback = useMemo(() => defaultLastMonth(), []);
  const [period, setPeriod] = useState<OwnerPeriodKind>(initial?.period ?? "month");
  const [year, setYear] = useState(initial?.year ?? fallback.year);
  const [month, setMonth] = useState(initial?.month ?? fallback.month);
  const [from, setFrom] = useState(initial?.from ?? `${fallback.year}-${pad2(fallback.month)}-01`);
  const [to, setTo] = useState(initial?.to ?? from);
  const [data, setData] = useState<OwnerPnlDashboard | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(
    async (next: { period: OwnerPeriodKind; year: number; month: number; date: string }) => {
      setRefreshing(true);
      setError(null);
      setPeriod(next.period);
      setYear(next.year);
      setMonth(next.month);
      try {
        const params = new URLSearchParams({ period: next.period });
        if (next.period === "week" || next.period === "day") {
          params.set("date", next.date);
        } else {
          params.set("year", String(next.year));
          params.set("month", String(next.month));
        }
        const res = await fetch(`/api/admin/owner?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
        const nextData = json as OwnerPnlDashboard;
        setData(nextData);
        setPeriod(nextData.period);
        setYear(nextData.year);
        setMonth(nextData.month);
        setFrom(nextData.from);
        setTo(nextData.to);
      } catch (e) {
        setError(e instanceof Error ? e.message : "로드 실패");
      } finally {
        setRefreshing(false);
      }
    },
    []
  );

  const s = data?.summary;
  const viewPeriod = data?.period ?? period;
  const viewFrom = data?.from ?? from;
  const viewTo = data?.to ?? to;
  const moneyOut = s ? s.expenseTotal + s.productCost + s.designerIncentive : 0;
  const noun = periodNoun(viewPeriod);
  const ownerDirect = s?.ownerServiceRevenue ?? 0;
  const designerMargin = s?.shopKeepDesignerService ?? 0;
  const productNet =
    s != null ? s.productRevenue - s.productCost - s.designerProductIncentive : 0;
  const shopKeepTotal = ownerDirect + designerMargin + productNet;
  const shopKeepCheck = s != null ? s.revenue - s.designerIncentive - s.productCost : 0;
  const revenueStructure = s
    ? [
        {
          label: "원장 직접 시술",
          amount: ownerDirect,
          hint: "원장 시술 매출은 100% 매장 귀속",
          tone: "var(--accent)"
        },
        {
          label: "디자이너 위탁 마진",
          amount: designerMargin,
          hint: `디자이너 시술 총매출 ${manUnit(s.designerServiceRevenue)} - 시술 인센 ${manUnit(s.designerServiceIncentive)}`,
          tone: "var(--muted)"
        },
        {
          label: "제품 판매 순마진",
          amount: productNet,
          hint: `제품 판매가 ${manUnit(s.productRevenue)} - 매입가 ${manUnit(s.productCost)} - 제품 인센 ${manUnit(s.designerProductIncentive)}`,
          tone: "var(--label)"
        }
      ]
    : [];
  const pctOf = (amount: number, total: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);
  const kpi = s
    ? [
        {
          label: "당월 세후 순수익",
          value: won(s.ownerRemain),
          hint: "통장에 남는 금액",
          up: false,
          dark: true
        },
        {
          label: "총 매출액",
          value: won(s.revenue),
          hint: "시술 + 제품 매출",
          up: false,
          dark: false
        },
        {
          label: "총 지출 및 인센",
          value: won(moneyOut),
          hint: "월세 · 재료 · 인센",
          up: false,
          dark: false
        },
        {
          label: "예상 제세공과금",
          value: won(s.taxSetAside),
          hint: "부가세 + 예상 종소세",
          up: false,
          dark: false
        }
      ]
    : [];

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <FinanceSticky>
        <FinanceHeader embedded />
        <Toolbar
          left={
            <>
              <BriefingPeriodPicker
                period={viewPeriod}
                year={data?.year ?? year}
                month={data?.month ?? month}
                from={viewFrom}
                to={viewTo}
                modes={PNL_MODES}
                onPick={(next) => void load(next)}
              />
              <RefreshButton
                spinning={refreshing}
                onClick={() =>
                  void load({
                    period: viewPeriod,
                    year: data?.year ?? year,
                    month: data?.month ?? month,
                    date: viewPeriod === "month" ? `${year}-${pad2(month)}-01` : viewFrom
                  })
                }
              />
            </>
          }
          right={
            <DownloadExportButton
              label="매장 손익 리포트 PDF"
              report="pnl"
              period={viewPeriod}
              year={data?.year ?? year}
              month={data?.month ?? month}
              date={viewFrom}
              onError={setError}
            />
          }
        />
      </FinanceSticky>

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}
      {refreshing && !data ? <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p> : null}

      {data && s ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            {kpi.map((card) => (
              <article
                key={card.label}
                className={clsx(
                  "overflow-visible rounded-[8px] px-5 py-5",
                  card.dark
                    ? "bg-[color:var(--accent)] text-white"
                    : "bg-[color:var(--sidebar-bg)] text-[color:var(--ink)]"
                )}
              >
                <p
                  className={clsx(
                    "text-[15px] font-bold leading-normal",
                    card.dark ? "text-white" : "text-[color:var(--label)]"
                  )}
                >
                  {card.label}
                </p>
                <p className="mt-3 text-[20px] font-bold leading-normal tabular-nums">{card.value}</p>
                <p
                  className={clsx(
                    "mt-1 text-[13px] leading-normal",
                    card.dark ? "text-[color:var(--sidebar-bg)]" : "text-[color:var(--muted)]"
                  )}
                >
                  {card.hint}
                </p>
              </article>
            ))}
          </div>

          {shopKeepTotal !== shopKeepCheck ? (
            <p className="mt-4 text-[13px] text-[#E24B4B]">
              검산 불일치: 매장 몫 {shopKeepTotal} vs {shopKeepCheck}
            </p>
          ) : null}

          <div className="mt-2">
            <section className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
              <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">매장 수익 창출 구조</h2>
              <ul className="mt-4">
                {revenueStructure.map((row) => (
                  <li key={row.label} className="border-b border-[#EFEBE6] py-[10px] last:border-b-0">
                    <div className="flex items-center justify-between text-[16px] font-medium">
                      <span className="flex min-w-0 items-center">
                        <span
                          className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full"
                          style={{ background: row.tone }}
                        />
                        <span className="font-bold tabular-nums">{pctOf(row.amount, shopKeepTotal)}%</span>
                        <span className="ml-2">{row.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[color:var(--muted)]">{won(row.amount)}</span>
                    </div>
                    <p className="mt-1 pl-[11px] text-[13px] leading-[20px] text-[#8A847C]">{row.hint}</p>
                  </li>
                ))}
                <li className="flex items-center justify-between border-t-[1.5px] border-[#C9C3BB] py-[10px] text-[16px] font-bold">
                  <span>매장 몫 합계</span>
                  <span className="tabular-nums">{won(shopKeepTotal)}</span>
                </li>
              </ul>
            </section>
          </div>

          <section className="mt-10">
            <div>
              <h2 className="text-[18px] font-bold [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                {viewPeriod === "month" ? "한 눈에 보는 월간 손익 흐름" : "한 눈에 보는 손익 흐름"}
              </h2>
              <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
                위에서 아래로 읽으면 됩니다. 초록은 들어온 매출, 갈색·주황은 나간 돈, 맨 아래가 최종 세후 순수익입니다.
              </p>
            </div>
            <div className="mt-4 rounded-[8px] bg-[color:var(--sidebar-bg)] px-6 py-6">
              <LineRow
                label={viewPeriod === "month" ? "월 총매출" : `${noun} 총매출`}
                amount={s.revenue}
                color={C.in}
                hint={`원장 직접 시술 ${won(s.ownerServiceRevenue)} · 디자이너 시술 ${won(s.designerServiceRevenue)} · 제품 ${won(s.productRevenue)}`}
                sign="plus"
                strong
              />
              <LineRow
                label="고정비(임차료·관리비 등)"
                amount={-s.fixedAmount}
                color={C.rent}
                hint="매장을 유지하는 데 매달 나가는 돈"
                sign="minus"
              />
              <LineRow
                label="판매 제품 매입 원가"
                amount={-s.productCost}
                color={C.product}
                hint="팔린 샴푸·오일을 떼어 온 값"
                sign="minus"
              />
              <LineRow
                label="운영비"
                amount={-(s.operatingAmount + s.materialAmount)}
                color={C.operate}
                hint="소모품, 광고, 재료·약제, 프로그램 이용료 등"
                sign="minus"
              />
              <LineRow
                label="디자이너 정산 인센티브"
                amount={-s.designerIncentive}
                color={C.pay}
                hint="정산 탭의 디자이너별 인센티브를 더한 금액"
                sign="minus"
              />
              <LineRow
                label="세전 영업이익"
                amount={s.operatingProfit}
                color={C.keep}
                hint="매출에서 비용·인센을 뺀 금액"
                sign="plus"
                strong
              />
              <FlowVatRow s={s} hint={`${noun} 매출·매입 기준으로 낼 부가세 추정`} />
              <LineRow
                label="종합소득세(예상 적립액)"
                amount={-s.incomeTaxReserve}
                color={C.tax}
                hint={
                  viewPeriod === "month"
                    ? "이 달이 1년 내내 같다고 보고 12로 나눈 적립액"
                    : "이 기간이 1년 내내 같다고 보고 나눠 둔 적립액"
                }
                sign="minus"
              />
              <LineRow
                label="= 최종 세후 순수익(실수령)"
                amount={s.ownerRemain}
                color={C.keep}
                hint={`원장님이 ${noun} 사업에서 가져갈 수 있는 금액`}
                sign="plus"
                strong
              />
            </div>
          </section>

          <Note>
            최종 세후 순수익은 추정치입니다. 부가가치세·종합소득세는 공제·감면에 따라 달라질 수 있습니다.
          </Note>
        </>
      ) : null}
    </div>
  );
}
