import type { BookingStatus } from "@/lib/bookings/types";

export const BOOKING_STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "pending", label: "대기" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
  { value: "noshow", label: "노쇼" }
];

export const BOOKING_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  BOOKING_STATUS_OPTIONS.map((o) => [o.value, o.label])
);

export function cancelReasonLabel(reason: string | null | undefined) {
  if (reason === "admin_cancel") return "관리자 취소";
  if (reason === "deposit_timeout") return "입금기한 초과";
  return reason || null;
}
