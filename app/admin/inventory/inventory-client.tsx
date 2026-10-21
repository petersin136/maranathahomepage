"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { AdminBellButton } from "@/components/admin/AdminBellButton";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import {
  Empty,
  FinanceSticky,
  INPUT,
  Modal,
  MonthPicker,
  OutlineButton,
  PrimaryButton,
  RefreshButton,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  Toolbar,
  won
} from "@/components/admin/finance-ui";
import {
  formatOccurredAtKst,
  kindLabel,
  movementTypeLabel,
  nowKstLocalInput,
  type InventoryBadge,
  type InventoryItemRow,
  type InventoryKind,
  type InventoryMovementRow,
  type InventoryMovementType,
  type InventoryWriteType
} from "@/lib/admin/inventory";
import { todayKst } from "@/lib/admin/sales-data";

const TABS = [
  { id: "retail", label: "판매 제품" },
  { id: "material", label: "시술 약제" },
  { id: "movements", label: "입출고 내역" }
] as const;

type TabId = (typeof TABS)[number]["id"];

const TYPE_FILTERS: { id: "" | InventoryMovementType; label: string }[] = [
  { id: "", label: "전체" },
  { id: "in", label: "입고" },
  { id: "out_sale", label: "판매" },
  { id: "out_use", label: "소진" },
  { id: "adjust", label: "조정" }
];

const LINE_BTN =
  "inline-flex h-[34px] items-center gap-2 rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-normal text-[#1C1C1C] hover:bg-[#F6F4F0] disabled:opacity-40";

const SELECT =
  `${INPUT} appearance-none bg-[url('/admin-icons/lnb/chevron-down.png')] bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-8`;

function badgeClass(badge: InventoryBadge) {
  if (badge === "품절") return "bg-[color:var(--sidebar-bg)] text-[color:var(--danger)]";
  if (badge === "부족") return "bg-[color:var(--sidebar-bg)] text-[color:var(--accent)]";
  return "bg-[color:var(--sidebar-bg)] text-[color:var(--muted)]";
}

function signedQty(value: number) {
  const abs = Math.abs(value).toLocaleString("ko-KR");
  return value > 0 ? `+${abs}` : value < 0 ? `−${abs}` : "0";
}

type MoveModal = {
  type: InventoryWriteType;
  item: InventoryItemRow;
};

type ItemModal =
  | { mode: "create" }
  | { mode: "edit"; item: InventoryItemRow }
  | { mode: "safety"; item: InventoryItemRow };

function InventoryBody() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabRaw = searchParams.get("tab");
  const tab: TabId = tabRaw === "material" || tabRaw === "movements" ? tabRaw : "retail";

  const today = todayKst();
  const [ty, tm] = today.split("-").map(Number);
  const [year, setYear] = useState(ty);
  const [month, setMonth] = useState(tm);
  const [typeFilter, setTypeFilter] = useState<"" | InventoryMovementType>("");
  const [itemFilter, setItemFilter] = useState("");
  const [retail, setRetail] = useState<InventoryItemRow[]>([]);
  const [material, setMaterial] = useState<InventoryItemRow[]>([]);
  const [retailSummary, setRetailSummary] = useState({ total: 0, low: 0, out: 0 });
  const [materialSummary, setMaterialSummary] = useState({ total: 0, low: 0, out: 0 });
  const [movements, setMovements] = useState<InventoryMovementRow[]>([]);
  const [filterItems, setFilterItems] = useState<InventoryItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [moveModal, setMoveModal] = useState<MoveModal | null>(null);
  const [itemModal, setItemModal] = useState<ItemModal | null>(null);
  const [qtyInput, setQtyInput] = useState("1");
  const [costInput, setCostInput] = useState("");
  const [memoInput, setMemoInput] = useState("");
  const [occurredInput, setOccurredInput] = useState(nowKstLocalInput);
  const [nameInput, setNameInput] = useState("");
  const [unitInput, setUnitInput] = useState("개");
  const [itemCostInput, setItemCostInput] = useState("");
  const [safetyInput, setSafetyInput] = useState("0");

  const setTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "retail") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace((qs ? `${pathname}?${qs}` : pathname) as never, { scroll: false });
  };

  const loadItems = useCallback(async (kind: InventoryKind) => {
    const res = await fetch(`/api/admin/inventory/items?kind=${kind}`);
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
    return json as {
      items: InventoryItemRow[];
      summary: { total: number; low: number; out: number };
    };
  }, []);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (typeFilter) params.set("type", typeFilter);
      if (itemFilter) params.set("itemId", itemFilter);
      const [r, m, moveRes] = await Promise.all([
        loadItems("retail"),
        loadItems("material"),
        fetch(`/api/admin/inventory/movements?${params.toString()}`)
      ]);
      setRetail(r.items);
      setRetailSummary(r.summary);
      setMaterial(m.items);
      setMaterialSummary(m.summary);
      setFilterItems([...r.items, ...m.items]);
      const moveJson = await moveRes.json();
      if (!moveRes.ok || !moveJson.ok) throw new Error(moveJson.error || "로드 실패");
      setMovements(moveJson.movements as InventoryMovementRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setRefreshing(false);
    }
  }, [itemFilter, loadItems, month, typeFilter, year]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openMove = (type: InventoryWriteType, item: InventoryItemRow) => {
    setQtyInput(type === "adjust" ? "1" : "1");
    setCostInput(type === "in" ? String(item.costPrice) : "");
    setMemoInput("");
    setOccurredInput(nowKstLocalInput());
    setMoveModal({ type, item });
  };

  const openCreate = () => {
    setNameInput("");
    setUnitInput("개");
    setItemCostInput("");
    setSafetyInput("0");
    setItemModal({ mode: "create" });
  };

  const openEdit = (item: InventoryItemRow) => {
    setNameInput(item.name);
    setUnitInput(item.unit);
    setItemCostInput(String(item.costPrice));
    setSafetyInput(String(item.safetyStock));
    setItemModal({ mode: "edit", item });
  };

  const openSafety = (item: InventoryItemRow) => {
    setSafetyInput(String(item.safetyStock));
    setItemModal({ mode: "safety", item });
  };

  const saveMove = async () => {
    if (!moveModal || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: moveModal.type,
          itemId: moveModal.item.id,
          quantity: Number(qtyInput),
          unit_cost: moveModal.type === "in" ? costInput : undefined,
          memo: memoInput,
          occurred_at: occurredInput
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "저장 실패");
      setMoveModal(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const saveItem = async () => {
    if (!itemModal || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (itemModal.mode === "create") {
        const res = await fetch("/api/admin/inventory/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "material",
            name: nameInput,
            unit: unitInput,
            cost_price: Number(itemCostInput),
            safety_stock: Number(safetyInput)
          })
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "저장 실패");
      } else if (itemModal.mode === "safety") {
        const res = await fetch(`/api/admin/inventory/items/${itemModal.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ safety_stock: Number(safetyInput) })
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "저장 실패");
      } else {
        const res = await fetch(`/api/admin/inventory/items/${itemModal.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput,
            unit: unitInput,
            cost_price: Number(itemCostInput),
            safety_stock: Number(safetyInput)
          })
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "저장 실패");
      }
      setItemModal(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (item: InventoryItemRow) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inventory/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "저장 실패");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const summary = tab === "material" ? materialSummary : retailSummary;
  const moveTitle =
    moveModal?.type === "in" ? "입고" : moveModal?.type === "out_use" ? "소진" : "조정";

  const filterOptions = useMemo(
    () => filterItems.slice().sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [filterItems]
  );

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <FinanceSticky>
        <div className="flex items-start justify-between gap-6">
          <AdminPageTitle>재고 관리</AdminPageTitle>
          <div className="mt-[24px]">
            <AdminBellButton />
          </div>
        </div>
        <nav className="mt-12 flex border-b border-[#E6E1DA]">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  "-mb-px flex items-end border-b-2 px-[18px] pb-[12px] text-[15px] leading-normal",
                  on ? "border-[#1C1C1C] text-[#1C1C1C]" : "border-transparent text-[#B7B2AA]"
                )}
              >
                <span
                  className={clsx(
                    "[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
                    on ? "font-bold" : "font-medium"
                  )}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>
        {tab === "movements" ? (
          <Toolbar
            left={
              <>
                <MonthPicker
                  year={year}
                  month={month}
                  width={202}
                  label={`${year}. ${String(month).padStart(2, "0")}`}
                  onChange={(nextYear, nextMonth) => {
                    setYear(nextYear);
                    setMonth(nextMonth);
                  }}
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as "" | InventoryMovementType)}
                  className={SELECT}
                >
                  {TYPE_FILTERS.map((opt) => (
                    <option key={opt.id || "all"} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} className={SELECT}>
                  <option value="">품목 전체</option>
                  {filterOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <RefreshButton spinning={refreshing} onClick={() => void loadAll()} />
              </>
            }
          />
        ) : (
          <Toolbar
            left={<RefreshButton spinning={refreshing} onClick={() => void loadAll()} />}
            right={
              tab === "material" ? (
                <button type="button" onClick={openCreate} className={LINE_BTN}>
                  품목 추가
                </button>
              ) : null
            }
          />
        )}
      </FinanceSticky>

      {error ? <p className="mt-4 text-[13px] text-[color:var(--danger)]">{error}</p> : null}

      {tab === "retail" || tab === "material" ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "전체 품목 수", value: `${summary.total}개` },
              { label: "부족 수", value: `${summary.low}개` },
              { label: "품절 수", value: `${summary.out}개` }
            ].map((card, index) => (
              <article
                key={card.label}
                className={clsx(
                  "overflow-visible rounded-[8px] px-5 py-5",
                  index === 0
                    ? "bg-[color:var(--accent)] text-white"
                    : "bg-[color:var(--sidebar-bg)] text-[color:var(--ink)]"
                )}
              >
                <p
                  className={clsx(
                    "text-[15px] font-bold leading-normal",
                    index === 0 ? "text-white" : "text-[color:var(--label)]"
                  )}
                >
                  {card.label}
                </p>
                <p className="mt-3 text-[20px] font-bold leading-normal tabular-nums">{card.value}</p>
              </article>
            ))}
          </div>

          {tab === "retail" ? (
            <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
              <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className={clsx(TH, "pl-1")}>제품명</th>
                    <th className={clsx(TH, "text-right")}>현재 재고</th>
                    <th className={clsx(TH, "text-right")}>입고가</th>
                    <th className={clsx(TH, "text-right")}>판매가</th>
                    <th className={clsx(TH, "text-right")}>이번 달 입고</th>
                    <th className={clsx(TH, "text-right")}>이번 달 판매</th>
                    <th className={TH}>상태</th>
                    <th className={clsx(TH, "text-right")}>부족 기준</th>
                    <th className={clsx(TH, "pr-0 text-right")}> </th>
                  </tr>
                </thead>
                <tbody>
                  {retail.map((row) => (
                    <tr key={row.id} className={TABLE_ROW}>
                      <td className={clsx(TD, "truncate pl-1")}>{row.name}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{row.qty.toLocaleString("ko-KR")}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.costPrice)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.salePrice)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{row.monthIn.toLocaleString("ko-KR")}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>
                        {row.monthOutSale.toLocaleString("ko-KR")}
                      </td>
                      <td className={TD}>
                        <span
                          className={clsx(
                            "inline-flex rounded-[4px] px-2 py-[3px] text-[12px] font-semibold",
                            badgeClass(row.badge)
                          )}
                        >
                          {row.badge}
                        </span>
                      </td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{row.safetyStock}</td>
                      <td className={clsx(TD, "pr-0 text-right")}>
                        <span className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            className="text-[13px] font-bold text-[color:var(--accent)]"
                            onClick={() => openMove("in", row)}
                          >
                            입고
                          </button>
                          <button
                            type="button"
                            className="text-[13px] font-bold text-[color:var(--accent)]"
                            onClick={() => openMove("adjust", row)}
                          >
                            조정
                          </button>
                          <button
                            type="button"
                            className="text-[13px] font-bold text-[color:var(--accent)]"
                            onClick={() => openSafety(row)}
                          >
                            부족 기준
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {retail.length === 0 ? <Empty>등록된 판매 제품이 없습니다.</Empty> : null}
            </section>
          ) : material.length === 0 ? (
            <div className="mt-10 border-y-[1.5px] border-[#C9C3BB] py-16 text-center">
              <p className="text-[16px] font-bold">등록된 시술 약제가 없습니다.</p>
              <div className="mt-4">
                <button type="button" onClick={openCreate} className={LINE_BTN}>
                  품목 추가
                </button>
              </div>
            </div>
          ) : (
            <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
              <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className={clsx(TH, "pl-1")}>품목명</th>
                    <th className={TH}>단위</th>
                    <th className={clsx(TH, "text-right")}>현재 재고</th>
                    <th className={clsx(TH, "text-right")}>입고가</th>
                    <th className={clsx(TH, "text-right")}>이번 달 소진</th>
                    <th className={TH}>상태</th>
                    <th className={clsx(TH, "text-right")}>부족 기준</th>
                    <th className={clsx(TH, "pr-0 text-right")}> </th>
                  </tr>
                </thead>
                <tbody>
                  {material.map((row) => (
                    <tr key={row.id} className={TABLE_ROW}>
                      <td className={clsx(TD, "truncate pl-1")}>{row.name}</td>
                      <td className={TD}>{row.unit}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{row.qty.toLocaleString("ko-KR")}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(row.costPrice)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>
                        {row.monthOutUse.toLocaleString("ko-KR")}
                      </td>
                      <td className={TD}>
                        <span
                          className={clsx(
                            "inline-flex rounded-[4px] px-2 py-[3px] text-[12px] font-semibold",
                            badgeClass(row.badge)
                          )}
                        >
                          {row.badge}
                        </span>
                      </td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{row.safetyStock}</td>
                      <td className={clsx(TD, "pr-0 text-right")}>
                        <span className="inline-flex flex-wrap items-center justify-end gap-3">
                          <button
                            type="button"
                            className="text-[13px] font-bold text-[color:var(--accent)]"
                            onClick={() => openMove("in", row)}
                          >
                            입고
                          </button>
                          <button
                            type="button"
                            className="text-[13px] font-bold text-[color:var(--accent)]"
                            onClick={() => openMove("out_use", row)}
                          >
                            소진
                          </button>
                          <button
                            type="button"
                            className="text-[13px] font-bold text-[color:var(--accent)]"
                            onClick={() => openMove("adjust", row)}
                          >
                            조정
                          </button>
                          <button
                            type="button"
                            className="text-[13px] font-bold text-[color:var(--accent)]"
                            onClick={() => openEdit(row)}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="text-[13px] font-bold text-[color:var(--danger)]"
                            onClick={() => void deactivate(row)}
                          >
                            비활성화
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      ) : (
        <section className="overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
          <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <th className={clsx(TH, "pl-1")}>일시</th>
                <th className={TH}>구분</th>
                <th className={TH}>품목</th>
                <th className={TH}>유형</th>
                <th className={clsx(TH, "text-right")}>수량</th>
                <th className={clsx(TH, "text-right")}>단가</th>
                <th className={clsx(TH, "pr-0")}>메모</th>
              </tr>
            </thead>
            {movements.length > 0 ? (
              <tbody>
                {movements.map((row) => (
                  <tr key={row.id} className={TABLE_ROW}>
                    <td className={clsx(TD, "pl-1 tabular-nums")}>{formatOccurredAtKst(row.occurredAt)}</td>
                    <td className={TD}>{kindLabel(row.kind)}</td>
                    <td className={clsx(TD, "truncate")}>{row.itemName}</td>
                    <td className={TD}>{movementTypeLabel(row.type)}</td>
                    <td className={clsx(TD, "text-right tabular-nums")}>{signedQty(row.quantity)}</td>
                    <td className={clsx(TD, "text-right tabular-nums")}>{won(row.unitCost)}</td>
                    <td className={clsx(TD, "truncate pr-0")}>
                      <span>{row.memo || "—"}</span>
                      {row.type === "out_sale" && row.bookingId ? (
                        <Link
                          href={`/admin/bookings/${row.bookingId}` as never}
                          className="ml-2 text-[13px] font-bold text-[color:var(--accent)]"
                        >
                          {row.bookingCustomerName || "예약"}
                          {row.bookingDate ? ` · ${row.bookingDate}` : ""}
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : null}
          </table>
          {movements.length === 0 ? <Empty>입출고 내역이 없습니다.</Empty> : null}
        </section>
      )}

      {moveModal ? (
        <Modal
          title={`${moveModal.item.name} ${moveTitle}`}
          busy={busy}
          onClose={() => {
            if (!busy) setMoveModal(null);
          }}
          actions={
            <>
              <OutlineButton disabled={busy} onClick={() => setMoveModal(null)}>
                취소
              </OutlineButton>
              <PrimaryButton disabled={busy} onClick={() => void saveMove()}>
                {busy ? "저장 중..." : "저장"}
              </PrimaryButton>
            </>
          }
        >
          <label className="mt-4 block text-[13px] font-bold text-[color:var(--label)]">수량</label>
          <input
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value)}
            className={clsx(INPUT, "mt-2 w-full")}
            inputMode="numeric"
          />
          {moveModal.type === "in" ? (
            <>
              <label className="mt-4 block text-[13px] font-bold text-[color:var(--label)]">단가</label>
              <input
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                className={clsx(INPUT, "mt-2 w-full")}
                inputMode="numeric"
              />
            </>
          ) : null}
          <label className="mt-4 block text-[13px] font-bold text-[color:var(--label)]">메모</label>
          <input value={memoInput} onChange={(e) => setMemoInput(e.target.value)} className={clsx(INPUT, "mt-2 w-full")} />
          <label className="mt-4 block text-[13px] font-bold text-[color:var(--label)]">일시</label>
          <input
            type="datetime-local"
            value={occurredInput}
            onChange={(e) => setOccurredInput(e.target.value)}
            className={clsx(INPUT, "mt-2 w-full")}
          />
        </Modal>
      ) : null}

      {itemModal ? (
        <Modal
          title={
            itemModal.mode === "create" ? "품목 추가" : itemModal.mode === "safety" ? "부족 기준" : "품목 수정"
          }
          busy={busy}
          onClose={() => {
            if (!busy) setItemModal(null);
          }}
          actions={
            <>
              <OutlineButton disabled={busy} onClick={() => setItemModal(null)}>
                취소
              </OutlineButton>
              <PrimaryButton disabled={busy} onClick={() => void saveItem()}>
                {busy ? "저장 중..." : "저장"}
              </PrimaryButton>
            </>
          }
        >
          {itemModal.mode !== "safety" ? (
            <>
              <label className="mt-4 block text-[13px] font-bold text-[color:var(--label)]">품목명</label>
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className={clsx(INPUT, "mt-2 w-full")} />
              <label className="mt-4 block text-[13px] font-bold text-[color:var(--label)]">단위</label>
              <input value={unitInput} onChange={(e) => setUnitInput(e.target.value)} className={clsx(INPUT, "mt-2 w-full")} />
              <label className="mt-4 block text-[13px] font-bold text-[color:var(--label)]">입고가</label>
              <input
                value={itemCostInput}
                onChange={(e) => setItemCostInput(e.target.value)}
                className={clsx(INPUT, "mt-2 w-full")}
                inputMode="numeric"
              />
            </>
          ) : null}
          <label className="mt-4 block text-[13px] font-bold text-[color:var(--label)]">부족 기준</label>
          <input
            value={safetyInput}
            onChange={(e) => setSafetyInput(e.target.value)}
            className={clsx(INPUT, "mt-2 w-full")}
            inputMode="numeric"
          />
        </Modal>
      ) : null}
    </div>
  );
}

export default function AdminInventoryPage() {
  return (
    <Suspense fallback={<p className="pt-6 font-sans-kr text-[13px] text-[color:var(--muted)]">불러오는 중…</p>}>
      <InventoryBody />
    </Suspense>
  );
}
