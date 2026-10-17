"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { AdminBellButton } from "@/components/admin/AdminBellButton";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import {
  CalendarIcon,
  Empty,
  Icon,
  Note,
  RefreshButton,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
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
  const [taxOpen, setTaxOpen] = useState<string | null>(null);

  const openTax = (id: string) => {
    setTaxOpen(id);
    scrollToId("tax");
  };

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
  const prev = s?.prevOwnerRemain ?? 0;
  const canCompare = prev !== 0;
  const remainDelta = canCompare && s ? ((s.ownerRemain - prev) / Math.abs(prev)) * 100 : 0;
  const remainHint = canCompare ? `${compareNoun(viewPeriod)} ${signedPct(remainDelta)}` : `${compareNoun(viewPeriod)} 비교 없음`;
  const moneyOut = s ? s.expenseTotal + s.productCost + s.designerIncentive : 0;
  const noun = periodNoun(viewPeriod);
  const rangeLabel = subtitleRange(viewPeriod, data?.year ?? year, data?.month ?? month, viewFrom, viewTo);

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <div className="sticky top-0 z-20 bg-white pb-6 pt-10 pl-[6px]">
        <div className="flex items-start justify-between gap-6">
          <AdminPageTitle>원장정산</AdminPageTitle>
          <div className="mt-[24px]">
            <AdminBellButton />
          </div>
        </div>
        <p className="mt-[14px] text-[16px] font-medium leading-normal text-[#8A847C]">
          {rangeLabel} · 원장님만 보는 세후 남는 돈
        </p>
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
      </div>

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}
      {refreshing && !data ? <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p> : null}

      {data && s ? (
        <>
          <section className="overflow-hidden rounded-[8px] bg-[color:var(--accent)] px-7 py-7 text-white">
            <p className="text-[15px] font-bold leading-normal">{noun} 세후 실수령</p>
            <p className="mt-3 text-[32px] font-bold leading-none tabular-nums">{won(s.ownerRemain)}</p>
            <p className="mt-3 text-[14px] leading-[22px] text-[color:var(--sidebar-bg)]">
              매장에 {won(s.revenue)}이 들어왔고, 월세·재료·인센으로 {won(moneyOut)}이 나갔습니다.
              <br />
              예상 세금 {won(s.taxSetAside)}을 떼면 실제로 남는 돈이 {won(s.ownerRemain)}입니다. {remainHint}.
            </p>
          </section>

          <div className="mt-2 grid grid-cols-4 gap-2">
            {[
              {
                id: "in",
                label: "들어온 돈",
                value: s.revenue,
                hint: "시술 + 제품 매출",
                color: C.in
              },
              {
                id: "out",
                label: "나간 돈",
                value: moneyOut,
                hint: "월세 · 재료 · 인센",
                color: C.pay
              },
              {
                id: "tax",
                label: "예상 세금",
                value: s.taxSetAside,
                hint: "부가세 + 예상 종소세",
                color: C.tax
              },
              {
                id: "remain",
                label: "세후 남는 돈",
                value: s.ownerRemain,
                hint: "통장에 남는 금액",
                color: C.keep
              }
            ].map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => scrollToId(card.id)}
                className="rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5 text-left hover:bg-[#F4EFE9]"
              >
                <p className="text-[15px] font-bold leading-normal text-[color:var(--label)]">{card.label}</p>
                <p className="mt-3 text-[20px] font-bold leading-normal tabular-nums" style={{ color: card.color }}>
                  {won(card.value)}
                </p>
                <p className="mt-2 text-[13px] text-[#8A847C]">{card.hint}</p>
                <p className="mt-3 text-[13px] font-bold text-[color:var(--accent)]">상세보기</p>
              </button>
            ))}
          </div>

          <section className="mt-10">
            <div>
              <h2 className="text-[18px] font-bold">한눈에 흐름</h2>
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
                onClick={() => scrollToId("in")}
              />
              <LineRow
                label="월세·관리비 등 고정비"
                amount={-s.fixedAmount}
                color={C.rent}
                hint="매장을 유지하는 데 매달 나가는 돈"
                sign="minus"
                onClick={() => scrollToId("out")}
              />
              <LineRow
                label="재료·약제비"
                amount={-s.materialAmount}
                color={C.material}
                hint="염색약, 클리닉 약제처럼 시술에 쓰는 재료"
                sign="minus"
                onClick={() => scrollToId("materials")}
              />
              <LineRow
                label="제품 매입가"
                amount={-s.productCost}
                color={C.product}
                hint="팔린 샴푸·오일을 떼어 온 값"
                sign="minus"
                onClick={() => scrollToId("products")}
              />
              <LineRow
                label="운영비"
                amount={-s.operatingAmount}
                color={C.operate}
                hint="소모품, 광고, 프로그램 이용료 등"
                sign="minus"
                onClick={() => scrollToId("expenses")}
              />
              <LineRow
                label="디자이너에게 준 인센티브"
                amount={-s.designerIncentive}
                color={C.pay}
                hint={`시술 인센 ${won(s.designerServiceIncentive)} · 제품 인센 ${won(s.designerProductIncentive)}`}
                sign="minus"
                onClick={() => scrollToId("artists")}
              />
              <LineRow
                label="세금 떼기 전"
                amount={s.operatingProfit}
                color={C.keep}
                hint="매출에서 비용·인센을 뺀 금액"
                sign="plus"
                strong
                onClick={() => scrollToId("remain")}
              />
              <LineRow
                label="부가세"
                amount={-s.vatPayable}
                color={C.tax}
                hint={`${noun} 매출·매입 기준으로 낼 부가세 추정`}
                sign="minus"
                onClick={() => openTax("vat")}
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
                onClick={() => openTax("income")}
              />
              <LineRow
                label="세후 실제 남는 돈"
                amount={s.ownerRemain}
                color={C.keep}
                hint={`원장님이 ${noun} 사업에서 가져갈 수 있는 금액`}
                sign="plus"
                strong
                onClick={() => scrollToId("remain")}
              />
            </div>
          </section>

          <section id="in" className="mt-10 scroll-mt-[250px]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-bold">들어온 돈</h2>
                <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
                  {noun} 손님에게 받은 총 {won(s.revenue)}입니다. 누가 깎았는지, 제품인지가 나뉩니다.
                </p>
              </div>
              <p className="text-[20px] font-bold tabular-nums">{won(s.revenue)}</p>
            </div>
            <div className="mt-4 rounded-[8px] bg-[color:var(--sidebar-bg)] px-6 py-6">
              <StackBar
                parts={[
                  { label: "원장이 직접 시술한 매출", amount: s.ownerServiceRevenue, color: C.owner },
                  { label: "디자이너가 시술한 매출", amount: s.designerServiceRevenue, color: C.designer },
                  { label: "제품 판매", amount: s.productRevenue, color: C.product }
                ]}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <article className="rounded-[8px] bg-[color:var(--sidebar-bg)] px-6 py-6">
                <p className="text-[15px] font-bold text-[color:var(--label)]">내가 깎아서 번 돈</p>
                <p className="mt-3 text-[22px] font-bold tabular-nums" style={{ color: C.owner }}>
                  {won(s.ownerServiceRevenue)}
                </p>
                <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
                  원장님이 직접 시술한 매출입니다. 디자이너 인센을 주지 않으니 이 금액은 매장에 남습니다.
                </p>
              </article>
              <article className="rounded-[8px] bg-[color:var(--sidebar-bg)] px-6 py-6">
                <p className="text-[15px] font-bold text-[color:var(--label)]">디자이너 시술에서 매장이 남긴 돈</p>
                <p className="mt-3 text-[22px] font-bold tabular-nums" style={{ color: C.designer }}>
                  {won(s.shopKeepDesignerService)}
                </p>
                <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
                  디자이너 시술 매출 {won(s.designerServiceRevenue)}에서 인센 {won(s.designerServiceIncentive)}을 뺀
                  금액입니다.
                </p>
              </article>
            </div>
          </section>

          <section id="out" className="mt-10 scroll-mt-[250px]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-bold">나간 돈</h2>
                <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
                  월세, 재료, 제품 매입, 운영비, 디자이너 인센을 모두 더한 값입니다.
                </p>
              </div>
              <p className="text-[20px] font-bold tabular-nums">{won(moneyOut)}</p>
            </div>
            <div className="mt-4 rounded-[8px] bg-[color:var(--sidebar-bg)] px-6 py-6">
              <StackBar
                parts={[
                  { label: "월세·고정비", amount: s.fixedAmount, color: C.rent },
                  { label: "재료·약제비", amount: s.materialAmount, color: C.material },
                  { label: "제품 매입가", amount: s.productCost, color: C.product },
                  { label: "운영비", amount: s.operatingAmount, color: C.operate },
                  { label: "디자이너 인센티브", amount: s.designerIncentive, color: C.pay }
                ]}
              />
            </div>
          </section>

          <section id="tax" className="mt-10 scroll-mt-[250px]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-bold">예상 세금</h2>
                <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
                  참고용 추정치입니다. 실제 신고는 세무 대리인과 확인하세요.
                </p>
              </div>
              <p className="text-[20px] font-bold tabular-nums">{won(s.taxSetAside)}</p>
            </div>
            <div className="mt-4 rounded-[8px] bg-[color:var(--sidebar-bg)] px-6 py-6">
              <StackBar
                legend={false}
                parts={[
                  { label: "부가세", amount: Math.max(0, s.vatPayable), color: C.tax },
                  { label: "예상 종합소득세", amount: s.incomeTaxReserve, color: "#C47A6A" }
                ]}
              />
              <TaxExplain
                s={s}
                noun={noun}
                viewPeriod={viewPeriod}
                openId={taxOpen}
                onToggle={(id) => setTaxOpen((cur) => (cur === id ? null : id))}
              />
            </div>
          </section>

          <section id="remain" className="mt-10 scroll-mt-[250px]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-bold">세후 남는 돈</h2>
                <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
                  세금 떼기 전 {won(s.operatingProfit)}에서 예상 세금 {won(s.taxSetAside)}을 빼면 {won(s.ownerRemain)}입니다.
                </p>
              </div>
              <p className="text-[20px] font-bold tabular-nums" style={{ color: C.keep }}>
                {won(s.ownerRemain)}
              </p>
            </div>
            <div className="mt-4 rounded-[8px] bg-[color:var(--sidebar-bg)] px-6 py-6">
              <StackBar
                parts={[
                  { label: "세후 실수령", amount: Math.max(0, s.ownerRemain), color: C.keep },
                  { label: "세금", amount: Math.max(0, s.taxSetAside), color: C.tax }
                ]}
              />
            </div>
          </section>

          <p id="products" className="mt-10 scroll-mt-[250px] pl-1 text-[15px] font-bold leading-normal text-[color:var(--label)]">
            제품 판매 상세
          </p>
          <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
            판매가에서 매입가를 빼면 마진입니다. 그중 {s.productDesignerRate}%는 판 디자이너 인센, 나머지가 매장 몫입니다.
          </p>
          <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
            <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={clsx(TH, "pl-1")}>제품</th>
                  <th className={clsx(TH, "text-right")}>몇 개</th>
                  <th className={clsx(TH, "text-right")}>판매가</th>
                  <th className={clsx(TH, "text-right")}>매입가</th>
                  <th className={clsx(TH, "text-right")}>마진</th>
                  <th className={clsx(TH, "text-right")}>디자이너 인센</th>
                  <th className={clsx(TH, "pr-0 text-right")}>매장 몫</th>
                </tr>
              </thead>
              {data.products.length > 0 ? (
                <tbody>
                  {data.products.map((row) => (
                    <tr key={row.id} className={TABLE_ROW}>
                      <td className={clsx(TD, "truncate pl-1")}>{row.name}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{row.qty}개</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.retail)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.cost)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.margin)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.designerIncentive)}</td>
                      <td className={clsx(TD, "pr-0 text-right font-bold tabular-nums")}>{won(row.shopKeep)}</td>
                    </tr>
                  ))}
                </tbody>
              ) : null}
            </table>
            {data.products.length === 0 ? <Empty>{noun} 제품 판매가 없습니다.</Empty> : null}
          </section>

          <p id="artists" className="mt-10 scroll-mt-[250px] pl-1 text-[15px] font-bold leading-normal text-[color:var(--label)]">
            디자이너에게 준 인센티브
          </p>
          <p className="mt-2 text-[14px] leading-[22px] text-[#8A847C]">
            시술 인센은 각자 커미션 요율, 제품 인센은 판매가의 {s.productDesignerRate}%입니다. 원장 본인(커미션 0%)은
            인센이 없습니다.
          </p>
          <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
            <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={clsx(TH, "pl-1")}>디자이너</th>
                  <th className={clsx(TH, "text-right")}>시술 매출</th>
                  <th className={clsx(TH, "text-right")}>제품 매출</th>
                  <th className={clsx(TH, "text-right")}>시술 인센</th>
                  <th className={clsx(TH, "text-right")}>제품 인센</th>
                  <th className={clsx(TH, "pr-0 text-right")}>준 돈 합계</th>
                </tr>
              </thead>
              {data.artists.length > 0 ? (
                <tbody>
                  {data.artists.map((row) => (
                    <tr key={row.artistId} className={TABLE_ROW}>
                      <td className={clsx(TD, "truncate pl-1")}>
                        {row.artistName}
                        {row.hasCommission ? "" : " · 원장"}
                      </td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.serviceRevenue)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.productRevenue)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.serviceIncentive)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.productIncentive)}</td>
                      <td className={clsx(TD, "pr-0 text-right font-bold tabular-nums")}>{won(row.incentive)}</td>
                    </tr>
                  ))}
                </tbody>
              ) : null}
            </table>
            {data.artists.length === 0 ? <Empty>{noun} 정산 대상이 없습니다.</Empty> : null}
          </section>

          <p id="materials" className="mt-10 scroll-mt-[250px] pl-1 text-[15px] font-bold leading-normal text-[color:var(--label)]">
            재료·약제비
          </p>
          <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
            <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={clsx(TH, "pl-1")}>날짜</th>
                  <th className={TH}>어디서</th>
                  <th className={TH}>무슨 돈</th>
                  <th className={clsx(TH, "pr-0 text-right")}>금액</th>
                </tr>
              </thead>
              {data.materials.length > 0 ? (
                <tbody>
                  {data.materials.map((row) => (
                    <tr key={row.id} className={TABLE_ROW}>
                      <td className={clsx(TD, "pl-1 tabular-nums text-[#8A847C]")}>{dotted(row.date)}</td>
                      <td className={clsx(TD, "truncate")}>{row.vendor}</td>
                      <td className={clsx(TD, "truncate")}>{row.memo}</td>
                      <td className={clsx(TD, "pr-0 text-right font-bold tabular-nums")}>{won(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              ) : null}
            </table>
            {data.materials.length === 0 ? <Empty>{noun} 재료·약제 지출이 없습니다.</Empty> : null}
          </section>

          <p id="expenses" className="mt-10 scroll-mt-[250px] pl-1 text-[15px] font-bold leading-normal text-[color:var(--label)]">
            지출 항목
          </p>
          <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
            <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={clsx(TH, "pl-1")}>무슨 돈</th>
                  <th className={clsx(TH, "text-right")}>몇 건</th>
                  <th className={clsx(TH, "pr-0 text-right")}>금액</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((row) => (
                  <tr key={row.category} className={TABLE_ROW}>
                    <td className={clsx(TD, "pl-1")}>{row.label}</td>
                    <td className={clsx(TD, "text-right tabular-nums")}>{row.count}건</td>
                    <td className={clsx(TD, "pr-0 text-right tabular-nums")}>{won(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
