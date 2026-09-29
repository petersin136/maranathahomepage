"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_OPTIONS } from "@/lib/admin/booking-labels";
import type { BookingStatus } from "@/lib/bookings/types";

const STATUS_CLASS: Record<BookingStatus, string> = {
  pending: "booking-status-pending",
  confirmed: "booking-status-ok",
  completed: "booking-status-ok",
  cancelled: "booking-status-bad",
  noshow: "booking-status-bad"
};

export function BookingStatusMenu({
  status,
  busy,
  onPick
}: {
  status: BookingStatus;
  busy: boolean;
  onPick: (status: BookingStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const place = () => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 128;
    const height = 196;
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setPos({ top, left });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          place();
          setOpen((cur) => !cur);
        }}
        className={clsx("booking-status__btn", STATUS_CLASS[status])}
      >
        <span className="booking-status__dot" />
        {BOOKING_STATUS_LABEL[status] || status}
      </button>
      {open
        ? createPortal(
            <ul
              ref={menuRef}
              role="listbox"
              aria-label="예약 상태"
              className="booking-status__menu"
              style={{ top: pos.top, left: pos.left }}
            >
              {BOOKING_STATUS_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.value === status}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(false);
                      if (opt.value !== status) onPick(opt.value);
                    }}
                    className={clsx(
                      "booking-status__option",
                      STATUS_CLASS[opt.value],
                      opt.value === status && "is-current"
                    )}
                  >
                    <span className="booking-status__dot" />
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body
          )
        : null}
    </>
  );
}
