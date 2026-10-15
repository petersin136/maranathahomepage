"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  ArtistFilterChip,
  CheckBox,
  DownloadExportButton,
  FinanceHeader,
  INPUT,
  Modal,
  MonthPicker,
  Note,
  OutlineButton,
  PrimaryButton,
  RefreshButton,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  Toolbar,
  useOutsideClose,
  won
} from "@/components/admin/finance-ui";
import { AdminDatePicker } from "@/components/admin/AdminDatePicker";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_PROOF_TYPES,
  expenseCategoryLabel,
  expensePaymentLabel,
  expenseProofLabel,
  isMissingExpenseProof,
  type ExpenseCategory
} from "@/lib/admin/expense-categories";
import { remainderPercents, type ExpenseRow, type ExpensesDashboard } from "@/lib/admin/expenses-data";
import { todayKst } from "@/lib/admin/sales-data";

type ExpenseForm = {
  expense_date: string;
  category: string;
  amount: string;
  vendor: string;
  memo: string;
  payment_method: string;
  proof_type: string;
  is_recurring: boolean;
};

const LINE_BTN =
  "inline-flex h-[34px] items-center gap-2 rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-normal text-[#1C1C1C] hover:bg-[#F6F4F0] disabled:opacity-40";

const SELECT = clsx(
  INPUT,
  "appearance-none bg-[url('/admin-icons/lnb/chevron-down.png')] bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-8"
);

function defaultDate(year: number, month: number) {
  const today = todayKst();
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return today.startsWith(prefix) ? today : `${prefix}-01`;
}

function emptyForm(year: number, month: number): ExpenseForm {
  return {
    expense_date: defaultDate(year, month),
    category: "material",
    amount: "",
    vendor: "",
    memo: "",
    payment_method: "card",
    proof_type: "none",
    is_recurring: false
  };
}

function toForm(row: ExpenseRow): ExpenseForm {
  return {
    expense_date: row.expense_date,
    category: row.category,
    amount: String(row.amount ?? 0),
    vendor: row.vendor || "",
    memo: row.memo || "",
    payment_method: row.payment_method || "card",
    proof_type: row.proof_type || (row.has_tax_invoice ? "tax_invoice" : "none"),
    is_recurring: Boolean(row.is_recurring)
  };
}

function dotted(ymd: string) {
  const [y, m, d] = ymd.split("-");
  return `${m}. ${d}`;
}

function signedPct(rate: number) {
  const body = `${Math.abs(rate).toFixed(1)}%`;
  if (rate > 0) return `+${body} ▲`;
  if (rate < 0) return `-${body} ▼`;
  return "0.0%";
}

function signedWon(delta: number) {
  const abs = Math.abs(delta).toLocaleString("ko-KR");
  if (delta > 0) return `+${abs}원 ▲`;
  if (delta < 0) return `-${abs}원 ▼`;
  return "0원";
}

function payloadOf(form: ExpenseForm) {
  return {
    expense_date: form.expense_date,
    category: form.category,
    amount: form.amount,
    vendor: form.vendor,
    memo: form.memo,
    payment_method: form.payment_method || null,
    proof_type: form.proof_type,
    is_recurring: form.is_recurring
  };
}

export default function AdminExpensesPage({
  initial,
  initialError
}: {
  initial: ExpensesDashboard | null;
  initialError: string | null;
}) {
  const [today] = useState(() => todayKst().split("-").map(Number));
  const [year, setYear] = useState(initial?.year ?? today[0]);
  const [month, setMonth] = useState(initial?.month ?? today[1]);
  const [data, setData] = useState<ExpensesDashboard | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const closeCategory = useCallback(() => setCategoryOpen(false), []);
  const categoryRef = useOutsideClose(categoryOpen, closeCategory);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState<ExpenseForm>(() => emptyForm(initial?.year ?? today[0], initial?.month ?? today[1]));
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);

  useEffect(() => {
    if (!categoryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCategory();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [categoryOpen, closeCategory]);

  const load = useCallback(async (nextYear: number, nextMonth: number) => {
    setRefreshing(true);
    setError(null);
    setFormOpen(false);
    setEditing(null);
    setYear(nextYear);
    setMonth(nextMonth);
    try {
      const params = new URLSearchParams({ year: String(nextYear), month: String(nextMonth) });
      const res = await fetch(`/api/admin/expenses?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as ExpensesDashboard);
      setYear(json.year);
      setMonth(json.month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const send = async (url: string, method: string, body?: unknown, fallback = "저장 실패") => {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || fallback);
    return json;
  };

  const run = async (task: () => Promise<void>, fallback: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await task();
      await load(year, month);
    } catch (e) {
      setError(e instanceof Error ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(year, month));
    setFormOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditing(row);
    setForm(toForm(row));
    setFormOpen(true);
  };

  const saveForm = () =>
    run(async () => {
      if (editing) {
        await send(`/api/admin/expenses/${editing.id}`, "PATCH", payloadOf(form), "수정 실패");
      } else {
        await send("/api/admin/expenses", "POST", payloadOf(form), "등록 실패");
      }
      setFormOpen(false);
      setEditing(null);
    }, editing ? "수정 실패" : "등록 실패");

  const removeExpense = (id: string) =>
    run(async () => {
      await send(`/api/admin/expenses/${id}`, "DELETE", undefined, "삭제 실패");
      setDeleteTarget(null);
      setFormOpen(false);
      setEditing(null);
    }, "삭제 실패");

  const runImport = () =>
    run(async () => {
      await send("/api/admin/expenses", "POST", { action: "import_recurring", year, month }, "가져오기 실패");
      setImportOpen(false);
    }, "가져오기 실패");

  const importPreview = data?.recurringImport;
  const canImport = !!importPreview && importPreview.available + importPreview.skipped > 0;
  const s = data?.summary;
  const rows = useMemo(() => {
    const list = data?.expenses ?? [];
    if (categoryFilter.length === 0) return list;
    return list.filter((row) => categoryFilter.includes(row.category as ExpenseCategory));
  }, [data, categoryFilter]);

  const naturePercents = s ? remainderPercents(s.natures.map((n) => n.amount)) : [];
  const proofPercents = s ? remainderPercents(s.proofs.map((p) => p.amount)) : [];

  const currentEmpty = !s || s.totalAmount === 0;
  const canCompare = !currentEmpty && s.changeRate != null && s.prevTotalAmount > 0;
  const totalUp = canCompare && (s.changeRate ?? 0) > 0;
  const totalHint = canCompare ? `전월 대비 ${signedPct(s.changeRate ?? 0)}` : "비교 없음";

  const materialHint = (() => {
    if (!s) return "산출 데이터가 없음";
    if (s.monthRevenue > 0) {
      return `매출 대비 ${((s.materialAmount / s.monthRevenue) * 100).toFixed(1)}%`;
    }
    if (s.prevMaterialAmount > 0 || s.materialAmount > 0) {
      return `전월 대비 ${signedWon(s.materialAmount - s.prevMaterialAmount)}`;
    }
    return "산출 데이터가 없음";
  })();
  const materialUp =
    s != null && s.monthRevenue <= 0 && s.materialAmount - s.prevMaterialAmount > 0;

  const fixedHint =
    s && s.totalAmount > 0
      ? `전체 지출의 ${((s.fixedAmount / s.totalAmount) * 100).toFixed(1)}%`
      : "산출 데이터가 없음";

  const missingCount = s?.withoutProofCount ?? 0;

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <FinanceHeader subtitle={`${year}년 ${month}월 지출`} />

      <Toolbar
        className="mt-[34px]"
        left={
          <>
            <MonthPicker
              year={year}
              month={month}
              width={202}
              label={`${year}. ${String(month).padStart(2, "0")}`}
              onChange={(nextYear, nextMonth) => void load(nextYear, nextMonth)}
            />
            <div ref={categoryRef}>
              <ArtistFilterChip
                label="카테고리"
                count={categoryFilter.length}
                open={categoryOpen}
                onToggle={() => setCategoryOpen((v) => !v)}
                menu={
                  <div className="absolute left-0 top-full z-50 mt-[6px] min-w-full rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
                    {EXPENSE_CATEGORIES.map((c) => {
                      const checked = categoryFilter.includes(c.value);
                      return (
                        <div key={c.value} className="px-5 py-2 hover:bg-[#F6F4F0]">
                          <CheckBox
                            checked={checked}
                            label={c.label}
                            onChange={(next) => {
                              setCategoryFilter((cur) =>
                                next ? [...cur, c.value] : cur.filter((id) => id !== c.value)
                              );
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                }
              />
            </div>
            <RefreshButton spinning={refreshing} onClick={() => void load(year, month)} />
          </>
        }
        right={
          <>
            <button
              type="button"
              disabled={busy || !canImport}
              onClick={() => setImportOpen(true)}
              className={LINE_BTN}
            >
              지난달 지출 불러오기
              {importPreview?.available ? (
                <span className="text-[13px] font-semibold text-[#8A847C]">{importPreview.available}건</span>
              ) : null}
            </button>
            <DownloadExportButton labeled year={year} month={month} onError={setError} />
            <button
              type="button"
              disabled={busy}
              onClick={openCreate}
              className="inline-flex h-[34px] min-w-[96px] items-center justify-center rounded-[8px] bg-[color:var(--accent)] px-4 text-[14px] font-bold leading-none text-white disabled:opacity-40"
            >
              지출 등록
            </button>
          </>
        }
      />

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}
      {refreshing && !data ? <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p> : null}

      {s ? (
        <>
          <div className="mt-6 grid grid-cols-4 gap-2">
            <article className="overflow-visible rounded-[8px] bg-[color:var(--accent)] px-5 py-5 text-white">
              <p className="text-[15px] font-bold leading-normal">총 지출액</p>
              <p className="mt-3 text-[20px] font-bold leading-normal tabular-nums">{won(s.totalAmount)}</p>
              <p
                className={clsx(
                  "mt-1 text-[13px] leading-normal",
                  totalUp ? "text-white" : "text-[color:var(--sidebar-bg)]"
                )}
              >
                {totalHint}
              </p>
            </article>
            {[
              {
                label: "재료·약제비",
                value: won(s.materialAmount),
                hint: materialHint,
                up: materialUp
              },
              {
                label: "고정비",
                value: won(s.fixedAmount),
                hint: fixedHint,
                up: false
              }
            ].map((card) => (
              <article
                key={card.label}
                className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5 text-[color:var(--ink)]"
              >
                <p className="text-[15px] font-bold leading-normal text-[color:var(--label)]">{card.label}</p>
                <p className="mt-3 text-[20px] font-bold leading-normal tabular-nums">{card.value}</p>
                <p
                  className={clsx(
                    "mt-1 text-[13px] leading-normal",
                    card.up ? "text-[color:var(--accent)]" : "text-[color:var(--muted)]"
                  )}
                >
                  {card.hint}
                </p>
              </article>
            ))}
            <article className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5 text-[color:var(--ink)]">
              <p className="text-[15px] font-bold leading-normal text-[color:var(--label)]">증빙 미비</p>
              <p className="mt-3 text-[20px] font-bold leading-normal tabular-nums">
                {missingCount.toLocaleString("ko-KR")}건
              </p>
              <p
                className={clsx(
                  "mt-1 text-[13px] leading-normal",
                  missingCount > 0 ? "text-[color:var(--danger)]" : "text-[color:var(--muted)]"
                )}
              >
                세금계산서·영수증 누락
              </p>
            </article>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <section className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
              <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">지출 성격별 비중</h2>
              <div className="mt-4 flex h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
                {s.totalAmount > 0
                  ? s.natures.map((n) =>
                      n.share > 0 ? (
                        <span
                          key={n.key}
                          className="h-full"
                          style={{ width: `${n.share}%`, background: n.tone }}
                        />
                      ) : null
                    )
                  : null}
              </div>
              <ul className="mt-4">
                {s.natures.map((n, index) => (
                  <li key={n.key} className="flex items-center justify-between py-[10px] text-[16px] font-medium">
                    <span className="flex min-w-0 items-center">
                      <span
                        className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full"
                        style={{ background: n.tone }}
                      />
                      <span className="font-bold tabular-nums">{naturePercents[index]}%</span>
                      <span className="ml-2">{n.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[color:var(--muted)]">{won(n.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
              <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">증빙 수단별 비중</h2>
              <div className="mt-4 flex h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
                {s.totalAmount > 0
                  ? s.proofs.map((p) =>
                      p.share > 0 ? (
                        <span
                          key={p.key}
                          className="h-full"
                          style={{ width: `${p.share}%`, background: p.tone }}
                        />
                      ) : null
                    )
                  : null}
              </div>
              <ul className="mt-4">
                {s.proofs.map((p, index) => (
                  <li key={p.key} className="flex items-center justify-between py-[10px] text-[16px] font-medium">
                    <span className="flex min-w-0 items-center">
                      <span
                        className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full"
                        style={{ background: p.tone }}
                      />
                      <span className="font-bold tabular-nums">{proofPercents[index]}%</span>
                      <span className="ml-2">{p.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[color:var(--muted)]">{won(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <p className="mt-6 pl-6 text-[15px] font-bold leading-normal text-[color:var(--label)]">상세 지출 내역</p>
          <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
            <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={clsx(TH, "pl-1")}>지출 일시</th>
                  <th className={TH}>카테고리(항목)</th>
                  <th className={TH}>거래처</th>
                  <th className={TH}>지출 내용</th>
                  <th className={TH}>결제 수단</th>
                  <th className={clsx(TH, "text-right")}>지출 금액</th>
                  <th className={clsx(TH, "pr-0 text-right")}>증빙 상태</th>
                </tr>
              </thead>
              {rows.length > 0 ? (
                <tbody>
                  {rows.map((row) => {
                    const missing = isMissingExpenseProof(row.proof_type);
                    return (
                      <tr
                        key={row.id}
                        className={clsx(TABLE_ROW, "cursor-pointer")}
                        onClick={() => openEdit(row)}
                      >
                        <td className={clsx(TD, "truncate pl-1 tabular-nums")}>{dotted(row.expense_date)}</td>
                        <td className={clsx(TD, "truncate")}>{expenseCategoryLabel(row.category)}</td>
                        <td className={clsx(TD, "truncate")}>{row.vendor || "—"}</td>
                        <td className={clsx(TD, "truncate")} title={row.memo || undefined}>
                          {row.memo || "—"}
                        </td>
                        <td className={clsx(TD, "truncate")}>{expensePaymentLabel(row.payment_method)}</td>
                        <td className={clsx(TD, "text-right font-bold tabular-nums")}>{won(Number(row.amount))}</td>
                        <td className={clsx(TD, "pr-0 text-right")}>
                          <span
                            className="inline-flex rounded-[4px] bg-white px-2 py-[4px] text-[13px] font-medium"
                            style={{ color: missing ? "var(--danger)" : "var(--muted)" }}
                          >
                            {expenseProofLabel(row.proof_type)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ) : null}
            </table>
            {rows.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[16px] font-semibold leading-normal text-[color:var(--ink)]">
                  {categoryFilter.length > 0 ? "선택한 카테고리의 지출이 없습니다." : "등록된 지출이 없습니다."}
                </p>
                <p className="mt-[15px] text-[14px] leading-normal text-[color:var(--muted)]">
                  {categoryFilter.length > 0
                    ? "다른 카테고리를 선택하거나 필터를 해제해 보세요."
                    : "지출을 등록하면 이곳에 상세 내역이 기록됩니다."}
                </p>
              </div>
            ) : null}
          </section>
          <Note>
            세금계산서·카드전표·현금영수증 중 하나를 받은 지출만 증빙으로 등록하세요. 증빙이 없으면 비용으로 인정받지
            못하거나 부가세 매입세액 공제를 받을 수 없습니다.
          </Note>
        </>
      ) : null}

      {formOpen ? (
        <Modal
          title={editing ? "지출 수정" : "지출 등록"}
          busy={busy}
          onClose={() => {
            if (busy) return;
            setFormOpen(false);
            setEditing(null);
          }}
          actions={
            <>
              {editing ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeleteTarget(editing)}
                  className="mr-auto text-[14px] font-semibold text-[color:var(--danger)] disabled:opacity-40"
                >
                  삭제
                </button>
              ) : null}
              <OutlineButton
                disabled={busy}
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                }}
              >
                취소
              </OutlineButton>
              <PrimaryButton disabled={busy || !form.amount} onClick={() => void saveForm()}>
                {busy ? "저장 중..." : editing ? "저장" : "등록"}
              </PrimaryButton>
            </>
          }
        >
          <div className="flex flex-col gap-3 text-left">
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#8A847C]">지출일</span>
              <AdminDatePicker
                value={form.expense_date}
                onChange={(ymd) => setForm((f) => ({ ...f, expense_date: ymd }))}
                ariaLabel="지출일"
                className={clsx(INPUT, "w-full")}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#8A847C]">카테고리</span>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={clsx(SELECT, "w-full")}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#8A847C]">거래처</span>
              <input
                type="text"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                className={clsx(INPUT, "w-full")}
                placeholder="거래처"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#8A847C]">지출 내용</span>
              <input
                type="text"
                value={form.memo}
                onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                className={clsx(INPUT, "w-full")}
                placeholder="지출 내용"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-[#8A847C]">결제 수단</span>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className={clsx(SELECT, "w-full")}
                >
                  {EXPENSE_PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-[#8A847C]">지출 금액</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={clsx(INPUT, "w-full text-right tabular-nums")}
                  placeholder="0"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#8A847C]">증빙 상태</span>
              <select
                value={form.proof_type}
                onChange={(e) => setForm((f) => ({ ...f, proof_type: e.target.value }))}
                className={clsx(SELECT, "w-full")}
              >
                {EXPENSE_PROOF_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <CheckBox
              label="매달 반복"
              checked={form.is_recurring}
              onChange={(v) => setForm((f) => ({ ...f, is_recurring: v }))}
            />
          </div>
        </Modal>
      ) : null}

      {importOpen && importPreview ? (
        <Modal
          title="지난달 지출 불러오기"
          busy={busy}
          onClose={() => setImportOpen(false)}
          actions={
            <>
              <OutlineButton disabled={busy} onClick={() => setImportOpen(false)}>
                닫기
              </OutlineButton>
              <PrimaryButton disabled={busy || importPreview.available === 0} onClick={() => void runImport()}>
                {busy ? "처리 중..." : `${importPreview.available}건 가져오기`}
              </PrimaryButton>
            </>
          }
        >
          지난달 반복 지출 중 <b>{importPreview.available}건</b>을 {year}년 {month}월로 복사합니다.
          {importPreview.skipped > 0 ? (
            <span className="mt-2 block text-[13px] text-[#8A847C]">
              같은 카테고리·거래처 {importPreview.skipped}건은 이미 있어 건너뜁니다.
            </span>
          ) : null}
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal
          title="지출 삭제"
          busy={busy}
          onClose={() => setDeleteTarget(null)}
          actions={
            <>
              <OutlineButton disabled={busy} onClick={() => setDeleteTarget(null)}>
                닫기
              </OutlineButton>
              <PrimaryButton disabled={busy} onClick={() => void removeExpense(deleteTarget.id)} danger>
                {busy ? "삭제 중..." : "삭제"}
              </PrimaryButton>
            </>
          }
        >
          {dotted(deleteTarget.expense_date)} · {expenseCategoryLabel(deleteTarget.category)}
          {deleteTarget.vendor ? ` · ${deleteTarget.vendor}` : ""} · {won(Number(deleteTarget.amount))}
          <span className="mt-2 block text-[13px] text-[#8A847C]">삭제하면 되돌릴 수 없습니다.</span>
        </Modal>
      ) : null}
    </div>
  );
}
