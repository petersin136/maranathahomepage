"use client";

import { clsx } from "clsx";
import type { BookingAction, BookingActionTarget } from "@/lib/admin/useBookingActions";

type Props = {
  action: BookingAction;
  booking: BookingActionTarget;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function BookingConfirmModal({
  action,
  booking,
  busy,
  onClose,
  onConfirm
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="w-full max-w-[400px] bg-hu-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-serif text-[18px] tracking-[0.06em]">
          {action === "cancel" ? "예약 취소" : "예약 삭제"}
        </p>
        {action === "delete" ? (
          <p className="mt-3 font-sans-kr text-[13px] text-[#9b4a4a]">
            이 예약을 영구 삭제합니다. 되돌릴 수 없습니다.
          </p>
        ) : (
          <p className="mt-3 font-sans-kr text-[13px] text-hu-muted">
            이 예약을 취소합니다. 기록은 남고 상태만 취소로 바뀝니다.
          </p>
        )}
        <dl className="mt-4 space-y-2 font-sans-kr text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-hu-muted">날짜</dt>
            <dd>{booking.booking_date}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-hu-muted">시간</dt>
            <dd>{booking.booking_time}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-hu-muted">고객명</dt>
            <dd>{booking.customer_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-hu-muted">디자이너</dt>
            <dd>{booking.artist_name || "—"}</dd>
          </div>
        </dl>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2 font-sans-kr text-[13px] text-hu-muted disabled:opacity-40"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={clsx(
              "px-4 py-2 font-sans-kr text-[13px] text-white disabled:bg-[#bcbcbc]",
              action === "delete" ? "bg-[#9b4a4a]" : "bg-hu-black"
            )}
          >
            {busy ? "처리 중..." : action === "cancel" ? "취소하기" : "영구 삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
