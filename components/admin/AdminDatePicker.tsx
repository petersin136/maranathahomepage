"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const POPOVER =
  "fixed z-[80] overflow-hidden rounded-[12px] border border-[#EFEBE6] bg-white pt-3 shadow-[0_8px_24px_rgba(28,28,28,0.08)]";

function maskIcon(src: string) {
  return {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain"
  } as const;
}

function toYmd(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function parseYmd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function formatAdminDate(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return "";
  return `${y}. ${m}. ${d}.`;
}

function monthCells(year: number, month: number) {
  const start = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const prevCount = new Date(year, month, 0).getDate();
  const cells: { ymd: string; day: number; outside: boolean }[] = [];
  for (let i = 0; i < start; i += 1) {
    const day = prevCount - start + 1 + i;
    cells.push({ ymd: toYmd(new Date(year, month - 1, day)), day, outside: true });
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({ ymd: toYmd(new Date(year, month, day)), day, outside: false });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ ymd: toYmd(new Date(year, month + 1, next)), day: next, outside: true });
    next += 1;
  }
  return cells;
}

function useMenuPlace(
  open: boolean,
  anchorRef: RefObject<HTMLButtonElement | null>,
  popRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
  width: number
) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const popH = popRef.current?.offsetHeight ?? 340;
      let top = rect.bottom + 6;
      if (top + popH > window.innerHeight - 8) top = Math.max(8, rect.top - popH - 6);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      setPos((prev) => (prev.top === top && prev.left === left ? prev : { top, left }));
    };
    place();
    const frame = window.requestAnimationFrame(place);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, popRef, width]);

  return pos;
}

export function AdminDatePicker({
  value,
  onChange,
  className,
  display,
  open: openProp,
  onOpenChange,
  leading,
  trailing,
  textClassName,
  ariaLabel = "날짜 선택"
}: {
  value: string;
  onChange: (ymd: string) => void;
  className?: string;
  display?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  textClassName?: string;
  ariaLabel?: string;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : innerOpen;
  const setOpen = (next: boolean) => {
    if (!controlled) setInnerOpen(next);
    onOpenChange?.(next);
  };

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useMenuPlace(open, buttonRef, popRef, () => setOpen(false), 280);
  const selected = parseYmd(value);
  const [cursor, setCursor] = useState({ y: selected.getFullYear(), m: selected.getMonth() });

  useEffect(() => {
    if (!open) return;
    const current = parseYmd(value);
    setCursor({ y: current.getFullYear(), m: current.getMonth() });
  }, [open, value]);

  const cells = monthCells(cursor.y, cursor.m);
  const today = toYmd(new Date());
  const shift = (delta: number) => {
    const next = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: next.getFullYear(), m: next.getMonth() });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-admin-date=""
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex items-center text-left",
          className,
          open && "border-[#1C1C1C]"
        )}
      >
        {leading}
        <span className={clsx("min-w-0 flex-1 truncate", textClassName)}>
          {display || formatAdminDate(value) || "날짜 선택"}
        </span>
        {trailing ?? (
          <span
            aria-hidden
            className="ml-2 h-[16px] w-[16px] shrink-0 bg-[#9A948C]"
            style={maskIcon("/admin-icons/lnb/calendar.png")}
          />
        )}
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              data-admin-date=""
              role="dialog"
              aria-label={ariaLabel}
              className={POPOVER}
              style={{ top: pos.top, left: pos.left, width: 280 }}
            >
              <div className="flex items-center justify-between px-4">
                <span className="text-[14px] font-bold text-[#1C1C1C]">
                  {cursor.y}년 {cursor.m + 1}월
                </span>
                <span className="flex">
                  <button
                    type="button"
                    aria-label="이전 달"
                    onClick={() => shift(-1)}
                    className="flex h-[28px] w-[28px] items-center justify-center text-[#1C1C1C]"
                  >
                    <span aria-hidden className="h-[14px] w-[14px] rotate-90 bg-current" style={maskIcon("/admin-icons/lnb/chevron-down.png")} />
                  </button>
                  <button
                    type="button"
                    aria-label="다음 달"
                    onClick={() => shift(1)}
                    className="ml-1 flex h-[28px] w-[28px] items-center justify-center text-[#1C1C1C]"
                  >
                    <span aria-hidden className="h-[14px] w-[14px] -rotate-90 bg-current" style={maskIcon("/admin-icons/lnb/chevron-down.png")} />
                  </button>
                </span>
              </div>
              <div className="mt-3 grid grid-cols-7 px-3">
                {WEEKDAYS.map((name) => (
                  <span key={name} className="flex h-[28px] items-center justify-center text-[12px] font-medium text-[#8A847C]">
                    {name}
                  </span>
                ))}
                {cells.map((cell) => {
                  const on = cell.ymd === value;
                  return (
                    <button
                      key={cell.ymd}
                      type="button"
                      onClick={() => {
                        onChange(cell.ymd);
                        setOpen(false);
                      }}
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
                onClick={() => {
                  onChange(today);
                  setOpen(false);
                }}
                className="mt-2 flex h-[40px] w-full items-center justify-center border-t border-[#F3EFEA] text-[13px] font-bold text-[#2F3A2F]"
              >
                오늘
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
