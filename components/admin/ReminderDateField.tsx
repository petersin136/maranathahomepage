"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker, type ChevronProps } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import "react-day-picker/style.css";

function parseYmd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return "날짜 선택";
  return `${y}. ${m}. ${d}.`;
}

function ArrowChevron({ orientation = "left", className }: ChevronProps) {
  const turn = orientation === "right" ? 0 : orientation === "down" ? 90 : orientation === "up" ? -90 : 180;
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="16"
      height="16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${turn}deg)` }}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function ReminderDateField({
  value,
  onChange,
  label
}: {
  value: string;
  onChange: (ymd: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const selected = parseYmd(value);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 292;
      const height = 340;
      let top = rect.bottom + 8;
      if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 8);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      setPos({ top, left });
    };
    place();
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((cur) => !cur)}
        className="reminder-date"
      >
        <span className="tabular-nums">{formatDisplay(value)}</span>
        <span
          aria-hidden
          className="reminder-date__icon"
          style={{
            WebkitMaskImage: "url(/admin-icons/lnb/calendar.png)",
            maskImage: "url(/admin-icons/lnb/calendar.png)"
          }}
        />
      </button>
      {open
        ? createPortal(
            <div ref={popRef} role="dialog" aria-label={label} className="reminder-cal" style={{ top: pos.top, left: pos.left }}>
              <DayPicker
                mode="single"
                selected={selected}
                defaultMonth={selected}
                locale={ko}
                weekStartsOn={1}
                showOutsideDays
                navLayout="around"
                animate={false}
                components={{ Chevron: ArrowChevron }}
                onSelect={(date) => {
                  if (!date) return;
                  onChange(toYmd(date));
                  setOpen(false);
                }}
              />
              <button
                type="button"
                className="reminder-cal__today"
                onClick={() => {
                  onChange(toYmd(new Date()));
                  setOpen(false);
                }}
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
