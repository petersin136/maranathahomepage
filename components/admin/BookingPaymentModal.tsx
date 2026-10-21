"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  INPUT,
  Modal,
  OutlineButton,
  PrimaryButton,
  won
} from "@/components/admin/finance-ui";
import type { BookingRow, PaymentMethod } from "@/lib/bookings/types";
import { retailQuantitiesFromIds } from "@/lib/admin/inventory-sales";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "카드" },
  { value: "cash", label: "현금" },
  { value: "transfer", label: "계좌이체" }
];

const CASH_RECEIPT_THRESHOLD = 100_000;

export type PaymentProductQty = {
  catalog_key: string;
  quantity: number;
};

export type PaymentSavePayload = {
  final_amount: number;
  payment_method: PaymentMethod;
  cash_receipt_issued: boolean;
  products: PaymentProductQty[];
};

type CatalogItem = {
  catalogKey: string;
  name: string;
  salePrice: number;
};

type Props = {
  booking: BookingRow;
  busy: boolean;
  warning?: string | null;
  onClose: () => void;
  onSave: (payload: PaymentSavePayload) => void;
};

export default function BookingPaymentModal({
  booking,
  busy,
  warning,
  onClose,
  onSave
}: Props) {
  const [serviceAmount, setServiceAmount] = useState("0");
  const [method, setMethod] = useState<PaymentMethod>(booking.payment_method ?? "card");
  const [cashReceipt, setCashReceipt] = useState(Boolean(booking.cash_receipt_issued));
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const loadedForIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMethod(booking.payment_method ?? "card");
    setCashReceipt(Boolean(booking.cash_receipt_issued));
    setQty(retailQuantitiesFromIds(booking.service_ids));
    setLoadError(null);
    // Strict Mode/객체 identity 변경 때 이미 그린 금액을 유지한 채 저장만 끄지 않는다.
    if (loadedForIdRef.current !== booking.id) {
      setCatalogReady(false);
    }
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/inventory/retail-catalog").then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "제품 목록을 불러오지 못했습니다.");
        return (json.items ?? []) as CatalogItem[];
      }),
      fetch(`/api/admin/bookings/${booking.id}`).then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok || !json.booking) return booking;
        return json.booking as BookingRow;
      })
    ])
      .then(([items, full]) => {
        if (cancelled) return;
        setCatalog(items);
        const existing = retailQuantitiesFromIds(full.service_ids);
        setQty(existing);
        const productSum = items.reduce(
          (sum, item) => sum + (existing[item.catalogKey] ?? 0) * item.salePrice,
          0
        );
        const base = Number(full.final_amount ?? full.total_amount ?? booking.final_amount ?? booking.total_amount ?? 0) || 0;
        setServiceAmount(String(Math.max(0, Math.round(base - productSum))));
        setMethod(full.payment_method ?? booking.payment_method ?? "card");
        setCashReceipt(Boolean(full.cash_receipt_issued ?? booking.cash_receipt_issued));
        loadedForIdRef.current = booking.id;
        setCatalogReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          loadedForIdRef.current = null;
          setCatalogReady(false);
          setLoadError(e instanceof Error ? e.message : "제품 목록을 불러오지 못했습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [booking]);

  const productAmount = useMemo(
    () => catalog.reduce((sum, item) => sum + (qty[item.catalogKey] ?? 0) * item.salePrice, 0),
    [catalog, qty]
  );
  const serviceNum = Math.max(0, Math.round(Number(serviceAmount) || 0));
  const totalAmount = serviceNum + productAmount;
  const showCashReceipt = method !== "card";
  const showCashWarning = method !== "card" && totalAmount >= CASH_RECEIPT_THRESHOLD;

  const setItemQty = (catalogKey: string, next: number) => {
    const value = Math.max(0, Math.min(99, Math.round(next)));
    setQty((cur) => ({ ...cur, [catalogKey]: value }));
  };

  return (
    <Modal
      title="결제 정보"
      busy={busy}
      onClose={onClose}
      actions={
        <>
          <OutlineButton disabled={busy} onClick={onClose}>
            취소
          </OutlineButton>
          <PrimaryButton
            disabled={busy}
            onClick={() => {
              if (!catalogReady) {
                setLoadError(loadError || "제품 목록을 불러오는 중입니다.");
                return;
              }
              onSave({
                final_amount: totalAmount,
                payment_method: method,
                cash_receipt_issued: method !== "card" ? cashReceipt : false,
                products: catalog
                  .map((item) => ({
                    catalog_key: item.catalogKey,
                    quantity: qty[item.catalogKey] ?? 0
                  }))
                  .filter((row) => row.quantity > 0)
              });
            }}
          >
            {busy ? "저장 중..." : "저장"}
          </PrimaryButton>
        </>
      }
    >
      <p className="text-[13px] text-[color:var(--muted)]">
        {booking.customer_name} · {booking.booking_date} {booking.booking_time}
      </p>

      <label className="mt-4 block text-[13px] font-bold text-[color:var(--label)]">시술 금액</label>
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={serviceAmount}
        disabled={busy}
        onChange={(e) => setServiceAmount(e.target.value)}
        className={clsx(INPUT, "mt-2 w-full")}
      />

      <p className="mt-5 text-[13px] font-bold text-[color:var(--label)]">제품 추가</p>
      {loadError ? <p className="mt-2 text-[13px] text-[color:var(--danger)]">{loadError}</p> : null}
      <div className="mt-2 max-h-[240px] overflow-y-auto">
        {catalog.map((item) => {
          const count = qty[item.catalogKey] ?? 0;
          return (
            <div key={item.catalogKey} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">{item.name}</p>
                <p className="mt-0.5 text-[12px] text-[color:var(--muted)]">{won(item.salePrice)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busy || count <= 0}
                  onClick={() => setItemQty(item.catalogKey, count - 1)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] text-[14px] font-bold disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-6 text-center text-[14px] tabular-nums">{count}</span>
                <button
                  type="button"
                  disabled={busy || count >= 99}
                  onClick={() => setItemQty(item.catalogKey, count + 1)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] text-[14px] font-bold disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-1 text-[14px]">
        <p className="flex justify-between gap-3">
          <span className="text-[color:var(--muted)]">제품 금액</span>
          <span className="tabular-nums">{won(productAmount)}</span>
        </p>
        <p className="flex justify-between gap-3 font-bold">
          <span>총 결제 금액</span>
          <span className="tabular-nums">{won(totalAmount)}</span>
        </p>
      </div>

      <fieldset className="mt-5" disabled={busy}>
        <legend className="text-[13px] font-bold text-[color:var(--label)]">결제 수단</legend>
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
                "flex-1 rounded-[8px] border px-2 py-2 text-[13px] disabled:opacity-40",
                method === m.value
                  ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                  : "border-[color:var(--input-border)] bg-white text-[color:var(--ink)]"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      {showCashReceipt ? (
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={cashReceipt}
            disabled={busy}
            onChange={(e) => setCashReceipt(e.target.checked)}
            className="h-4 w-4 accent-[color:var(--ink)] disabled:opacity-40"
          />
          <span>현금영수증 발급</span>
        </label>
      ) : null}

      {showCashWarning ? (
        <p className="mt-4 text-[12px] leading-relaxed text-[color:var(--danger)]">
          10만원 이상 현금·계좌이체 결제는 현금영수증 의무발행 대상입니다.
          <br />
          미발급 시 미발급액의 20%가 가산세로 부과될 수 있습니다.
        </p>
      ) : null}

      {warning ? <p className="mt-4 text-[13px] text-[color:var(--danger)]">{warning}</p> : null}
    </Modal>
  );
}
