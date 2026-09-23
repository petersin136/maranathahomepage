"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import type { BookingRow, PaymentMethod } from "@/lib/bookings/types";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "카드" },
  { value: "cash", label: "현금" },
  { value: "transfer", label: "계좌이체" }
];

const CASH_RECEIPT_THRESHOLD = 100_000;

export type PaymentSavePayload = {
  final_amount: number;
  payment_method: PaymentMethod;
  cash_receipt_issued: boolean;
};

type Props = {
  booking: BookingRow;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: PaymentSavePayload) => void;
};

export default function BookingPaymentModal({
  booking,
  busy,
  onClose,
  onSave
}: Props) {
  const [finalAmount, setFinalAmount] = useState(
    String(booking.final_amount ?? booking.total_amount ?? 0)
  );
  const [method, setMethod] = useState<PaymentMethod>(
    booking.payment_method ?? "card"
  );
  const [cashReceipt, setCashReceipt] = useState(
    Boolean(booking.cash_receipt_issued)
  );

  useEffect(() => {
    setFinalAmount(String(booking.final_amount ?? booking.total_amount ?? 0));
    setMethod(booking.payment_method ?? "card");
    setCashReceipt(Boolean(booking.cash_receipt_issued));
  }, [booking]);

  const amountNum = Math.max(0, Math.round(Number(finalAmount) || 0));
  const showCashReceipt = method !== "card";
  const showCashWarning =
    method !== "card" && amountNum >= CASH_RECEIPT_THRESHOLD;

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
        <p className="font-serif text-[18px] tracking-[0.06em]">결제 정보</p>
        <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">
          {booking.customer_name} · {booking.booking_date} {booking.booking_time}
        </p>

        <label className="mt-5 block font-sans-kr text-[13px]">
          <span className="text-hu-muted">최종 결제 금액</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={finalAmount}
            disabled={busy}
            onChange={(e) => setFinalAmount(e.target.value)}
            className="mt-1.5 h-10 w-full border border-hu-black/20 bg-hu-white px-3 font-sans-kr text-[14px] outline-none disabled:opacity-40"
          />
        </label>

        <fieldset className="mt-5" disabled={busy}>
          <legend className="font-sans-kr text-[13px] text-hu-muted">결제 수단</legend>
          <div className="mt-2 flex gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                disabled={busy}
                onClick={() => {
                  setMethod(m.value);
                  if (m.value === "card") setCashReceipt(false);
                }}
                className={clsx(
                  "flex-1 border px-2 py-2 font-sans-kr text-[13px] disabled:opacity-40",
                  method === m.value
                    ? "border-hu-black bg-hu-black text-white"
                    : "border-hu-black/20 bg-hu-white text-hu-black"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        {showCashReceipt ? (
          <label className="mt-4 flex cursor-pointer items-center gap-2 font-sans-kr text-[13px]">
            <input
              type="checkbox"
              checked={cashReceipt}
              disabled={busy}
              onChange={(e) => setCashReceipt(e.target.checked)}
              className="h-4 w-4 accent-hu-black disabled:opacity-40"
            />
            <span>현금영수증 발급</span>
          </label>
        ) : null}

        {showCashWarning ? (
          <p className="mt-4 font-sans-kr text-[12px] leading-relaxed text-[#9b4a4a]">
            10만원 이상 현금·계좌이체 결제는 현금영수증 의무발행 대상입니다.
            <br />
            미발급 시 미발급액의 20%가 가산세로 부과될 수 있습니다.
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2 font-sans-kr text-[13px] text-hu-muted disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onSave({
                final_amount: amountNum,
                payment_method: method,
                cash_receipt_issued: method !== "card" ? cashReceipt : false
              })
            }
            className="bg-hu-black px-4 py-2 font-sans-kr text-[13px] text-white disabled:bg-[#bcbcbc]"
          >
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
