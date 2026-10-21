"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import {
  CalendarIcon,
  DownloadExportButton,
  FinanceHeader,
  FinanceSticky,
  Icon,
  Note,
  RefreshButton,
  Toolbar,
  shiftMonth,
  won
} from "@/components/admin/finance-ui";
import type { OwnerPeriodKind, OwnerPnlDashboard, OwnerPnlSummary } from "@/lib/admin/owner-pnl";
import { BASIC_DEDUCTION } from "@/lib/admin/tax-data";
import { addDays, todayKst, weekStartMonday } from "@/lib/admin/sales-data";

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

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const PERIODS: { id: OwnerPeriodKind; label: string }[] = [
  { id: "month", label: "월간" },
  { id: "week", label: "주간" },
  { id: "day", label: "일간" }
];

function defaultLastMonth() {
  const [y, m] = todayKst().split("-").map(Number);
  return shiftMonth(y, m, -1);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function monthCells(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1).getDay();
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const prevCount = new Date(year, monthIndex, 0).getDate();
  const cells: { ymd: string; day: number; outside: boolean }[] = [];
  for (let i = 0; i < start; i += 1) {
    const day = prevCount - start + 1 + i;
    cells.push({ ymd: toYmd(new Date(year, monthIndex - 1, day)), day, outside: true });
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({ ymd: toYmd(new Date(year, monthIndex, day)), day, outside: false });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ ymd: toYmd(new Date(year, monthIndex + 1, next)), day: next, outside: true });
    next += 1;
  }
  return cells;
}

function signedPct(rate: number) {
  const body = `${Math.abs(rate).toFixed(1)}%`;
  if (rate > 0) return `+${body} ▲`;
  if (rate < 0) return `-${body} ▼`;
  return "0.0%";
}

function dotted(ymd: string) {
  return ymd.slice(2).replaceAll("-", ". ");
}

function chipLabel(period: OwnerPeriodKind, year: number, month: number, from: string, to: string) {
  if (period === "week") {
    return `${from.slice(5).replace("-", ". ")} ~ ${to.slice(5).replace("-", ". ")}`;
  }
  if (period === "day") {
    return `${from.slice(0, 4)}. ${from.slice(5, 7)}. ${from.slice(8, 10)}`;
  }
  return `${year}. ${pad2(month)}`;
}

function subtitleRange(period: OwnerPeriodKind, year: number, month: number, from: string, to: string) {
  if (period === "week") {
    return `${from.slice(0, 4)}년 ${from.slice(5).replace("-", ". ")} ~ ${to.slice(5).replace("-", ". ")}`;
  }
  if (period === "day") {
    const [y, m, d] = from.split("-");
    return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`;
  }
  return `${year}년 ${month}월`;
}

function periodNoun(period: OwnerPeriodKind) {
  if (period === "week") return "이번 주";
  if (period === "day") return "이날";
  return "이번 달";
}

function compareNoun(period: OwnerPeriodKind) {
  if (period === "week") return "지난주보다";
  if (period === "day") return "전날보다";
  return "지난달보다";
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

function OwnerPeriodPicker({
  period,
  year,
  month,
  from,
  to,
  onPick
}: {
  period: OwnerPeriodKind;
  year: number;
  month: number;
  from: string;
  to: string;
  onPick: (next: { period: OwnerPeriodKind; year: number; month: number; date: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<OwnerPeriodKind>(period);
  const [cursor, setCursor] = useState({ y: year, m: month - 1 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const today = todayKst();

  useEffect(() => {
    if (!open) return;
    setDraft(period);
    setCursor({ y: year, m: month - 1 });
  }, [open, period, year, month]);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const popH = popRef.current?.offsetHeight ?? 360;
      let top = rect.bottom + 12;
      if (top + popH > window.innerHeight - 12) top = Math.max(12, rect.top - popH - 12);
      setPos({ top, left: rect.left });
    };
    place();
    const id = window.setTimeout(place, 0);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const pickMonth = (y: number, m: number) => {
    onPick({ period: "month", year: y, month: m, date: `${y}-${pad2(m)}-01` });
    setOpen(false);
  };

  const pickDate = (ymd: string, kind: OwnerPeriodKind) => {
    const y = Number(ymd.slice(0, 4));
    const m = Number(ymd.slice(5, 7));
    onPick({ period: kind, year: y, month: m, date: ymd });
    setOpen(false);
  };

  const weekFrom = weekStartMonday(from);
  const weekTo = addDays(weekFrom, 6);
  const cells = monthCells(cursor.y, cursor.m);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[34px] w-[220px] items-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
      >
        <CalendarIcon />
        <span className="ml-2 min-w-0 truncate leading-normal">
          {chipLabel(period, year, month, from, to)}
        </span>
        <Icon
          src={open ? "/admin-icons/lnb/chevron-down-bold.png" : "/admin-icons/lnb/chevron-down.png"}
          className={clsx("ml-auto h-[16px] w-[16px] text-[#9A948C]", open && "rotate-180")}
        />
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[80] w-[280px] overflow-hidden rounded-[12px] border border-[#EFEBE6] bg-white pt-3 shadow-[0_12px_32px_rgba(28,28,28,0.12)]"
            >
              <div className="grid grid-cols-3 gap-1 px-3">
                {PERIODS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDraft(item.id)}
                    className={clsx(
                      "h-[32px] rounded-[8px] text-[13px] font-bold",
                      draft === item.id
                        ? "bg-[#2F3A2F] text-white"
                        : "bg-[#F6F4F0] text-[#6B6560] hover:bg-[#EFEBE6]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {draft === "month" ? (
                <div className="px-4 pb-3 pt-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      aria-label="이전 연도"
                      onClick={() => setCursor((c) => ({ ...c, y: c.y - 1 }))}
                      className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#9A948C] hover:bg-[#F6F4F0]"
                    >
                      <span aria-hidden className="text-[16px] leading-none">
                        ‹
                      </span>
                    </button>
                    <span className="text-[15px] font-bold">{cursor.y}년</span>
                    <button
                      type="button"
                      aria-label="다음 연도"
                      onClick={() => setCursor((c) => ({ ...c, y: c.y + 1 }))}
                      className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#9A948C] hover:bg-[#F6F4F0]"
                    >
                      <span aria-hidden className="text-[16px] leading-none">
                        ›
                      </span>
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const on = draft === period && cursor.y === year && m === month;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => pickMonth(cursor.y, m)}
                          className={clsx(
                            "h-[34px] rounded-[6px] text-[14px] font-medium",
                            on ? "bg-[#2F3A2F] font-bold text-white" : "text-[#1C1C1C] hover:bg-[#F6F4F0]"
                          )}
                        >
                          {m}월
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-3 flex items-center justify-between px-4">
                    <span className="text-[14px] font-bold text-[#1C1C1C]">
                      {cursor.y}년 {cursor.m + 1}월
                    </span>
                    <span className="flex">
                      <button
                        type="button"
                        aria-label="이전 달"
                        onClick={() =>
                          setCursor((c) => {
                            const next = new Date(c.y, c.m - 1, 1);
                            return { y: next.getFullYear(), m: next.getMonth() };
                          })
                        }
                        className="flex h-[28px] w-[28px] items-center justify-center text-[#1C1C1C]"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label="다음 달"
                        onClick={() =>
                          setCursor((c) => {
                            const next = new Date(c.y, c.m + 1, 1);
                            return { y: next.getFullYear(), m: next.getMonth() };
                          })
                        }
                        className="ml-1 flex h-[28px] w-[28px] items-center justify-center text-[#1C1C1C]"
                      >
                        ›
                      </button>
                    </span>
                  </div>
                  <p className="mt-2 px-4 text-[12px] leading-[18px] text-[#8A847C]">
                    {draft === "week" ? "날짜를 고르면 그 주(월~일)를 봅니다." : "보고 싶은 날을 고르세요."}
                  </p>
                  <div className="mt-2 grid grid-cols-7 px-3">
                    {WEEKDAYS.map((name) => (
                      <span
                        key={name}
                        className="flex h-[28px] items-center justify-center text-[12px] font-medium text-[#8A847C]"
                      >
                        {name}
                      </span>
                    ))}
                    {cells.map((cell) => {
                      const inWeek =
                        draft === "week" && period === "week" && cell.ymd >= weekFrom && cell.ymd <= weekTo;
                      const onDay = draft === "day" && period === "day" && cell.ymd === from;
                      const on = inWeek || onDay;
                      return (
                        <button
                          key={cell.ymd}
                          type="button"
                          onClick={() => pickDate(cell.ymd, draft)}
                          className={clsx(
                            "mx-auto flex h-[32px] w-[32px] items-center justify-center rounded-full text-[13px] font-medium",
                            on
                              ? "bg-[#2F3A2F] font-bold text-white"
                              : cell.outside
                                ? "text-[#C9C3BB]"
                                : cell.ymd === today
                                  ? "font-bold text-[#2F3A2F]"
                                  : "text-[#1C1C1C] hover:bg-[#F6F4F0]"
                          )}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => pickDate(today, draft)}
                    className="mt-2 flex h-[40px] w-full items-center justify-center border-t border-[#F3EFEA] text-[13px] font-bold text-[#2F3A2F]"
                  >
                    {draft === "week" ? "이번 주" : "오늘"}
                  </button>
                </>
              )}
            </div>,
            document.body
          )
        : null}
    </>
  );
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

function TaxAccordion({
  label,
  amount,
  color,
  hint,
  open,
  onToggle,
  children
}: {
  label: string;
  amount: number;
  color: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-[#EFEBE6] last:border-b-0">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-6 py-[16px] text-left">
        <span>
          <span className="flex items-center gap-[10px] text-[16px] font-medium">
            <span className="h-[10px] w-[10px] shrink-0 rounded-full" style={{ background: color }} />
            {label}
          </span>
          {hint ? <span className="mt-1 block pl-[20px] text-[13px] leading-[20px] text-[#8A847C]">{hint}</span> : null}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[16px] font-semibold tabular-nums">{won(amount)}</span>
          <span className="mt-2 block text-[13px] font-bold text-[color:var(--accent)]">{open ? "접기" : "상세보기"}</span>
        </span>
      </button>
      {open ? <div className="mb-4 rounded-[8px] bg-white px-5 py-4">{children}</div> : null}
    </div>
  );
}

function StepRow({
  step,
  label,
  hint,
  amount,
  strong = false
}: {
  step: number;
  label: string;
  hint?: string;
  amount: string;
  strong?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-start justify-between gap-6 border-b border-[#EFEBE6] py-[16px] last:border-b-0",
        strong && "border-t-[1.5px] border-t-[#C9C3BB]"
      )}
    >
      <span>
        <span className="text-[16px] font-medium">
          {step}. {label}
        </span>
        {hint ? <span className="mt-1 block text-[13px] leading-[20px] text-[#8A847C]">{hint}</span> : null}
      </span>
      <span className={clsx("shrink-0 text-[16px] tabular-nums", strong ? "font-bold" : "font-semibold")}>{amount}</span>
    </div>
  );
}

function TaxExplain({
  s,
  noun,
  viewPeriod,
  openId,
  onToggle
}: {
  s: OwnerPnlSummary;
  noun: string;
  viewPeriod: OwnerPeriodKind;
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-2">
      <TaxAccordion
        label="부가세"
        amount={s.vatPayable}
        color={C.tax}
        hint="손님이 낸 가격에 들어 있는 세금"
        open={openId === "vat"}
        onToggle={() => onToggle("vat")}
      >
        <p className="text-[14px] leading-[22px] text-[#8A847C]">
          가격에 부가세가 포함된 것으로 보고, 매출에서 뽑은 세액에서 매입 세액을 뺍니다.
        </p>
        <div className="mt-2">
          <StepRow step={1} label="매출세액" hint={`매출 ${won(s.revenue)}의 10/110`} amount={won(s.vatOutput)} />
          <StepRow
            step={2}
            label="매입세액"
            hint="세금계산서 받은 지출·제품 매입에서 공제"
            amount={won(s.vatInput)}
          />
          <StepRow
            step={3}
            label="이번에 낼 부가세"
            hint="매출세액 − 매입세액"
            amount={won(s.vatPayable)}
            strong
          />
        </div>
      </TaxAccordion>
      <TaxAccordion
        label="예상 종합소득세"
        amount={s.incomeTaxReserve}
        color="#C47A6A"
        hint="5월 신고에 대비해 나눠 둔 추정치"
        open={openId === "income"}
        onToggle={() => onToggle("income")}
      >
        <p className="text-[14px] leading-[22px] text-[#8A847C]">
          매달 내는 고지서가 아닙니다. {noun} 남은 돈이 1년 내내 같다고 보고 나눈 금액입니다.
        </p>
        <div className="mt-2">
          <StepRow
            step={1}
            label={`${noun} 남은 돈`}
            hint="매출에서 월세·재료·인센을 뺀 금액"
            amount={won(s.operatingProfit)}
          />
          <StepRow
            step={2}
            label={`1년으로 환산 (×${s.incomeTaxPeriods})`}
            hint={
              viewPeriod === "month" ? "이번 달이 12달 내내 같다고 본 금액" : "이 기간이 1년 내내 같다고 본 금액"
            }
            amount={won(s.annualizedProfit)}
          />
          <StepRow
            step={3}
            label="기본공제 제외"
            hint={`본인 기본공제 ${won(BASIC_DEDUCTION)}만 반영했습니다. 건보·국민연금·부양가족은 아직 빼지 않았습니다.`}
            amount={won(s.taxableBase)}
          />
          <StepRow
            step={4}
            label={`국세 ${s.incomeTaxBracketRate != null ? `${Math.round(s.incomeTaxBracketRate * 100)}%` : ""} 구간`}
            hint={`${s.incomeTaxBracketLabel} · 누진공제 ${won(s.incomeTaxProgressiveDeduction)}`}
            amount={won(s.incomeTaxAnnual)}
          />
          <StepRow
            step={5}
            label="지방소득세 10%"
            hint="국세의 10%가 지방소득세로 붙습니다."
            amount={won(s.localIncomeTaxAnnual)}
          />
          <StepRow
            step={6}
            label={`${s.incomeTaxPeriods}로 나눈 ${noun} 적립`}
            hint={`1년치 ${won(s.incomeTaxAnnual + s.localIncomeTaxAnnual)}을 ${s.incomeTaxPeriods}로 나눈 값입니다.`}
            amount={won(s.incomeTaxReserve)}
            strong
          />
        </div>
      </TaxAccordion>
      <TaxAccordion
        label="매출세액"
        amount={s.vatOutput}
        color={C.tax}
        hint="손님에게 받은 금액에 들어 있는 부가세"
        open={openId === "output"}
        onToggle={() => onToggle("output")}
      >
        <p className="text-[14px] leading-[22px] text-[#8A847C]">
          손님이 낸 {won(s.revenue)}을 부가세 포함 가격으로 보고, 그중 10/110을 매출세액으로 봅니다.
        </p>
        <div className="mt-2">
          <StepRow step={1} label={`${noun} 매출`} amount={won(s.revenue)} />
          <StepRow
            step={2}
            label="매출 × 10 ÷ 110"
            hint="부가세 포함 금액에서 세액만 뽑습니다"
            amount={won(s.vatOutput)}
            strong
          />
        </div>
      </TaxAccordion>
      <TaxAccordion
        label="매입세액"
        amount={s.vatInput}
        color={C.material}
        hint="세금계산서 받은 지출·제품 매입에서 공제하는 부가세"
        open={openId === "input"}
        onToggle={() => onToggle("input")}
      >
        <p className="text-[14px] leading-[22px] text-[#8A847C]">
          세금계산서를 받은 지출과 팔린 제품의 매입가에 들어 있는 부가세를 매출세액에서 빼 줍니다.
        </p>
        <div className="mt-2">
          <StepRow step={1} label="제품 매입가" hint="팔린 제품의 떼어 온 값" amount={won(s.productCost)} />
          <StepRow
            step={2}
            label="매입세액"
            hint="세금계산서 받은 지출 + 제품 매입가의 10/110"
            amount={won(s.vatInput)}
            strong
          />
        </div>
      </TaxAccordion>
      <TaxAccordion
        label="디자이너 원천세 3.3%"
        amount={s.withholding}
        color={C.pay}
        hint="인센에서 이미 뺀 금액"
        open={openId === "withhold"}
        onToggle={() => onToggle("withhold")}
      >
        <p className="text-[14px] leading-[22px] text-[#8A847C]">
          디자이너에게 준 인센티브에서 미리 떼 둔 세금입니다. 세후 남는 돈에서 다시 빼지 않습니다. 다음 달 10일까지 따로
          납부합니다.
        </p>
        <div className="mt-2">
          <StepRow step={1} label="디자이너 인센티브" amount={won(s.designerIncentive)} />
          <StepRow
            step={2}
            label="3.3% 원천세"
            hint="인센 × 3.3%"
            amount={won(s.withholding)}
            strong
          />
        </div>
      </TaxAccordion>
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
        if (next.period === "month") {
          params.set("year", String(next.year));
          params.set("month", String(next.month));
        } else {
          params.set("date", next.date);
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
  const rangeLabel = subtitleRange(viewPeriod, data?.year ?? year, data?.month ?? month, viewFrom, viewTo);
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
          hint: "시술 매출 − 디자이너 시술 인센",
          tone: "var(--muted)"
        },
        {
          label: "제품 판매 순마진",
          amount: productNet,
          hint: "제품 판매가에서 매입가와 디자이너 수당 15%를 뺀 매장 몫",
          tone: "var(--label)"
        }
      ]
    : [];
  const costStructure = s
    ? [
        { label: "월세·관리비 등 고정비", amount: s.fixedAmount, tone: "var(--accent)" },
        { label: "재료·약제비", amount: s.materialAmount, tone: "var(--muted)" },
        { label: "제품 매입가", amount: s.productCost, tone: "var(--label)" },
        { label: "운영비", amount: s.operatingAmount, tone: "var(--ink)" },
        { label: "디자이너에게 준 인센티브", amount: s.designerIncentive, tone: "var(--muted)" }
      ]
        .slice()
        .sort((a, b) => b.amount - a.amount)
    : [];
  const costStructureTotal = costStructure.reduce((sum, row) => sum + row.amount, 0);
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
        <FinanceHeader
          embedded
          subtitle={`${rangeLabel} · 원장님만 보는 세후 남는 돈`}
          tabAction={
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
        <Toolbar
          left={
            <>
              <OwnerPeriodPicker
                period={viewPeriod}
                year={data?.year ?? year}
                month={data?.month ?? month}
                from={viewFrom}
                to={viewTo}
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

          {shopKeepTotal !== shopKeepCheck || costStructureTotal !== moneyOut ? (
            <p className="mt-4 text-[13px] text-[#E24B4B]">
              검산 불일치: 매장 몫 {shopKeepTotal} vs {shopKeepCheck} / 비용 {costStructureTotal} vs {moneyOut}
            </p>
          ) : null}

          <div className="mt-2 grid grid-cols-2 gap-2">
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

            <section className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
              <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">비용 지출 구조</h2>
              <ul className="mt-4">
                {costStructure.map((row) => (
                  <li key={row.label} className="flex items-center justify-between py-[10px] text-[16px] font-medium">
                    <span className="flex min-w-0 items-center">
                      <span
                        className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full"
                        style={{ background: row.tone }}
                      />
                      <span className="font-bold tabular-nums">{pctOf(row.amount, costStructureTotal)}%</span>
                      <span className="ml-2">{row.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[color:var(--muted)]">{won(row.amount)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between border-t-[1.5px] border-[#C9C3BB] py-[10px] text-[16px] font-bold">
                  <span>합계</span>
                  <span className="tabular-nums">{won(costStructureTotal)}</span>
                </li>
              </ul>
            </section>
          </div>

          <section className="mt-10">
            <div>
              <h2 className="text-[18px] font-bold">한눈에 보는 월간 손익 흐름</h2>
              <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
                위에서 아래로 읽으면 됩니다. 항목을 누르면 아래 상세로 이동합니다. 초록은 들어온 돈, 갈색·주황은 나간
                돈, 맨 아래가 세후 실수령입니다.
              </p>
            </div>
            <div className="mt-4 rounded-[8px] bg-[color:var(--sidebar-bg)] px-6 py-6">
              <LineRow
                label={`들어온 돈 (${noun} 매출)`}
                amount={s.revenue}
                color={C.in}
                hint={`원장 직접 시술 ${won(s.ownerServiceRevenue)} · 디자이너 시술 ${won(s.designerServiceRevenue)} · 제품 ${won(s.productRevenue)}`}
                sign="plus"
                strong
              />
              <LineRow
                label="월세·관리비 등 고정비"
                amount={-s.fixedAmount}
                color={C.rent}
                hint="매장을 유지하는 데 매달 나가는 돈"
                sign="minus"
              />
              <LineRow
                label="재료·약제비"
                amount={-s.materialAmount}
                color={C.material}
                hint="염색약, 클리닉 약제처럼 시술에 쓰는 재료"
                sign="minus"
              />
              <LineRow
                label="제품 매입가"
                amount={-s.productCost}
                color={C.product}
                hint="팔린 샴푸·오일을 떼어 온 값"
                sign="minus"
              />
              <LineRow
                label="운영비"
                amount={-s.operatingAmount}
                color={C.operate}
                hint="소모품, 광고, 프로그램 이용료 등"
                sign="minus"
              />
              <LineRow
                label="디자이너에게 준 인센티브"
                amount={-s.designerIncentive}
                color={C.pay}
                hint={`시술 인센 ${won(s.designerServiceIncentive)} · 제품 인센 ${won(s.designerProductIncentive)}`}
                sign="minus"
              />
              <LineRow
                label="세금 떼기 전"
                amount={s.operatingProfit}
                color={C.keep}
                hint="매출에서 비용·인센을 뺀 금액"
                sign="plus"
                strong
              />
              <LineRow
                label="부가세"
                amount={-s.vatPayable}
                color={C.tax}
                hint={`${noun} 매출·매입 기준으로 낼 부가세 추정`}
                sign="minus"
              />
              <LineRow
                label="예상 종합소득세"
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
                label="세후 실제 남는 돈"
                amount={s.ownerRemain}
                color={C.keep}
                hint={`원장님이 ${noun} 사업에서 가져갈 수 있는 금액`}
                sign="plus"
                strong
              />
            </div>
          </section>

          <Note>
            세후 실수령은 추정치입니다. 부가세·예상 종합소득세는 공제·감면에 따라 달라질 수 있고, 디자이너 원천세는 인센에서
            이미 뺐으니 세후 금액에서 다시 빼지 않습니다.
          </Note>
        </>
      ) : null}
    </div>
  );
}
