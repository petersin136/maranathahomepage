"use client";

import { clsx } from "clsx";
import type { BookingActionTarget } from "@/lib/admin/useBookingActions";

type Props = {
  booking: BookingActionTarget;
  busy: boolean;
  onCancel: (booking: BookingActionTarget) => void;
  onDelete: (booking: BookingActionTarget) => void;
  layout?: "stack" | "row";
};

export default function BookingActionButtons({
  booking,
  busy,
  onCancel,
  onDelete,
  layout = "stack"
}: Props) {
  const cancelled = booking.status === "cancelled";

  return (
    <div
      className={clsx(
        "flex shrink-0",
        layout === "stack" ? "flex-col items-end gap-1" : "items-center gap-4"
      )}
    >
      {!cancelled ? (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onCancel(booking);
          }}
          className="font-sans-kr text-[13px] text-hu-black underline-offset-2 hover:underline disabled:opacity-40"
        >
          취소
        </button>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(booking);
        }}
        className="font-sans-kr text-[12px] text-hu-muted disabled:opacity-40"
      >
        삭제
      </button>
    </div>
  );
}
