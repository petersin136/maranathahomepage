"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { CalendarIcon, Icon } from "@/components/admin/finance-ui";
import { chipLabel, quarterIndex, type BriefingKind } from "@/lib/admin/briefing-period";
import { todayKst, weekStartMonday, addDays } from "@/lib/admin/sales-data";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

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

export function BriefingPeriodPicker({
  period,
  year,
  month,
  from,
  to,
  modes,
  width = 240,
  onPick
}: {
  period: BriefingKind;
  year: number;
  month: number;
  from: string;
  to: string;
  modes: { id: BriefingKind; label: string }[];
  width?: number;
  onPick: (next: { period: BriefingKind; year: number; month: number; date: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BriefingKind>(period);
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

  const closeWith = (next: { period: BriefingKind; year: number; month: number; date: string }) => {
    onPick(next);
    setOpen(false);
  };

  const pickMonth = (y: number, m: number) => {
    closeWith({ period: "month", year: y, month: m, date: `${y}-${pad2(m)}-01` });
  };

  const pickDate = (picked: string, kind: BriefingKind) => {
    closeWith({
      period: kind,
      year: Number(picked.slice(0, 4)),
      month: Number(picked.slice(5, 7)),
      date: picked
    });
  };

  const weekFrom = weekStartMonday(from);
  const weekTo = addDays(weekFrom, 6);
  const cells = monthCells(cursor.y, cursor.m);
  const calendar = draft === "week" || draft === "day";

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ width }}
        className="flex h-[34px] items-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
      >
        <CalendarIcon />
        <span className="ml-2 min-w-0 truncate leading-normal">{chipLabel(period, year, month, from, to)}</span>
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
                {modes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDraft(item.id)}
                    className={clsx(
                      "h-[32px] rounded-[8px] text-[13px] font-bold",
                      draft === item.id ? "bg-[#2F3A2F] text-white" : "bg-[#F6F4F0] text-[#6B6560] hover:bg-[#EFEBE6]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {draft === "month" ? (
                <YearGrid
                  year={cursor.y}
                  onYear={setCursor}
                  children={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const on = period === "month" && cursor.y === year && m === month;
                    return (
                      <Choice key={m} on={on} onClick={() => pickMonth(cursor.y, m)}>
                        {m}월
                      </Choice>
                    );
                  })}
                />
              ) : null}
              {draft === "quarter" ? (
                <YearGrid
                  year={cursor.y}
                  onYear={setCursor}
                  children={[1, 2, 3, 4].map((q) => {
                    const on = period === "quarter" && cursor.y === year && quarterIndex(month) === q;
                    return (
                      <Choice
                        key={q}
                        on={on}
                        onClick={() =>
                          closeWith({
                            period: "quarter",
                            year: cursor.y,
                            month: (q - 1) * 3 + 1,
                            date: `${cursor.y}-${pad2((q - 1) * 3 + 1)}-01`
                          })
                        }
                      >
                        {q}분기
                      </Choice>
                    );
                  })}
                />
              ) : null}
              {draft === "half" ? (
                <YearGrid
                  year={cursor.y}
                  onYear={setCursor}
                  children={[1, 2].map((half) => {
                    const on = period === "half" && cursor.y === year && (month <= 6 ? 1 : 2) === half;
                    return (
                      <Choice
                        key={half}
                        on={on}
                        onClick={() =>
                          closeWith({
                            period: "half",
                            year: cursor.y,
                            month: half === 1 ? 1 : 7,
                            date: `${cursor.y}-${half === 1 ? "01" : "07"}-01`
                          })
                        }
                      >
                        {half === 1 ? "상반기" : "하반기"}
                      </Choice>
                    );
                  })}
                />
              ) : null}
              {draft === "year" ? (
                <div className="px-4 pb-3 pt-3">
                  <div className="flex items-center justify-between">
                    <YearButton label="이전 연도" onClick={() => setCursor((c) => ({ ...c, y: c.y - 1 }))}>
                      ‹
                    </YearButton>
                    <span className="text-[15px] font-bold">{cursor.y}년</span>
                    <YearButton label="다음 연도" onClick={() => setCursor((c) => ({ ...c, y: c.y + 1 }))}>
                      ›
                    </YearButton>
                  </div>
                  <button
                    type="button"
                    onClick={() => closeWith({ period: "year", year: cursor.y, month: 1, date: `${cursor.y}-01-01` })}
                    className={clsx(
                      "mt-3 h-[40px] w-full rounded-[6px] text-[14px] font-bold",
                      period === "year" && cursor.y === year
                        ? "bg-[#2F3A2F] text-white"
                        : "bg-[#F6F4F0] text-[#1C1C1C] hover:bg-[#EFEBE6]"
                    )}
                  >
                    {cursor.y}년 전체
                  </button>
                </div>
              ) : null}
              {calendar ? (
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
                      const inWeek = draft === "week" && period === "week" && cell.ymd >= weekFrom && cell.ymd <= weekTo;
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
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function YearButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#9A948C] hover:bg-[#F6F4F0]"
    >
      <span aria-hidden className="text-[16px] leading-none">
        {children}
      </span>
    </button>
  );
}

function YearGrid({
  year,
  onYear,
  children
}: {
  year: number;
  onYear: (updater: (cursor: { y: number; m: number }) => { y: number; m: number }) => void;
  children: ReactNode;
}) {
  return (
    <div className="px-4 pb-3 pt-3">
      <div className="flex items-center justify-between">
        <YearButton label="이전 연도" onClick={() => onYear((c) => ({ ...c, y: c.y - 1 }))}>
          ‹
        </YearButton>
        <span className="text-[15px] font-bold">{year}년</span>
        <YearButton label="다음 연도" onClick={() => onYear((c) => ({ ...c, y: c.y + 1 }))}>
          ›
        </YearButton>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">{children}</div>
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "h-[34px] rounded-[6px] text-[14px] font-medium",
        on ? "bg-[#2F3A2F] font-bold text-white" : "text-[#1C1C1C] hover:bg-[#F6F4F0]"
      )}
    >
      {children}
    </button>
  );
}
