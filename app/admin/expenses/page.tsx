"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@/lib/admin/expense-categories";
import type {
  ExpenseRow,
  ExpensesDashboard
} from "@/lib/admin/expenses-data";
import { todayKst } from "@/lib/admin/sales-data";

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function pct(value: number | null, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function parseYmdParts(ymd: string) {
  const [y, m] = ymd.split("-").map(Number);
  return { y, m };
}

function shiftMonth(year: number, month: number, delta: number) {
  const dt = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1 };
}

function defaultThisMonth() {
  return parseYmdParts(todayKst());
}

type QuickForm = {
  expense_date: string;
  category: string;
  amount: string;
  vendor: string;
  has_tax_invoice: boolean;
  is_recurring: boolean;
};

type EditForm = {
  expense_date: string;
  category: string;
  amount: string;
  vendor: string;
  memo: string;
  has_tax_invoice: boolean;
  is_recurring: boolean;
};

function toEditForm(row: ExpenseRow): EditForm {
  return {
    expense_date: row.expense_date,
    category: row.category,
    amount: String(row.amount ?? 0),
    vendor: row.vendor || "",
    memo: row.memo || "",
    has_tax_invoice: Boolean(row.has_tax_invoice),
    is_recurring: Boolean(row.is_recurring)
  };
}

export default function AdminExpensesPage() {
  const initial = useMemo(() => defaultThisMonth(), []);
  const [year, setYear] = useState(initial.y);
  const [month, setMonth] = useState(initial.m);
  const [data, setData] = useState<ExpensesDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [form, setForm] = useState<QuickForm>(() => ({
    expense_date: todayKst(),
    category: "material",
    amount: "",
    vendor: "",
    has_tax_invoice: false,
    is_recurring: false
  }));

  const yearOptions = useMemo(() => {
    const current = parseYmdParts(todayKst()).y;
    const years: number[] = [];
    for (let y = current + 1; y >= current - 4; y -= 1) years.push(y);
    return years;
  }, []);

  const load = useCallback(async (nextYear: number, nextMonth: number) => {
    setLoading(true);
    setError(null);
    setEditingId(null);
    setEditForm(null);
    try {
      const params = new URLSearchParams({
        year: String(nextYear),
        month: String(nextMonth)
      });
      const res = await fetch(`/api/admin/expenses?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as ExpensesDashboard);
      setYear(json.year);
      setMonth(json.month);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initial.y, initial.m);
  }, [initial.y, initial.m, load]);

  const moveMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    void load(next.year, next.month);
  };

  const onSelectYearMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    void load(nextYear, nextMonth);
  };

  const createExpense = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_date: form.expense_date,
          category: form.category,
          amount: form.amount,
          vendor: form.vendor,
          has_tax_invoice: form.has_tax_invoice,
          is_recurring: form.is_recurring
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "등록 실패");
      setForm((f) => ({
        ...f,
        amount: "",
        vendor: "",
        has_tax_invoice: false,
        is_recurring: false
      }));
      await load(year, month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editForm || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_date: editForm.expense_date,
          category: editForm.category,
          amount: editForm.amount,
          vendor: editForm.vendor,
          memo: editForm.memo,
          has_tax_invoice: editForm.has_tax_invoice,
          is_recurring: editForm.is_recurring
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "수정 실패");
      setEditingId(null);
      setEditForm(null);
      await load(year, month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setBusy(false);
    }
  };

  const removeExpense = async (id: string) => {
    if (busy) return;
    if (!confirm("이 지출을 삭제할까요?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "삭제 실패");
      if (editingId === id) {
        setEditingId(null);
        setEditForm(null);
      }
      await load(year, month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_recurring",
          year,
          month
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "가져오기 실패");
      setImportOpen(false);
      await load(year, month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오기 실패");
    } finally {
      setBusy(false);
    }
  };

  const empty = data != null && data.expenses.length === 0;
  const importPreview = data?.recurringImport;

  return (
    <div>
      <h1 className="font-serif text-[28px] tracking-[0.06em] lg:text-[32px]">EXPENSES</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">
        비용 관리
        {data ? ` · ${data.year}년 ${data.month}월` : ""}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-8">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="h-9 border border-hu-black/20 bg-hu-white px-3 font-sans-kr text-[13px]"
          aria-label="이전 달"
        >
          ←
        </button>
        <label className="font-sans-kr text-[13px] text-hu-muted">
          년
          <select
            value={year}
            onChange={(e) => onSelectYearMonth(Number(e.target.value), month)}
            className="ml-2 h-9 border border-hu-black/20 bg-hu-white px-2.5 outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="font-sans-kr text-[13px] text-hu-muted">
          월
          <select
            value={month}
            onChange={(e) => onSelectYearMonth(year, Number(e.target.value))}
            className="ml-2 h-9 border border-hu-black/20 bg-hu-white px-2.5 outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="h-9 border border-hu-black/20 bg-hu-white px-3 font-sans-kr text-[13px]"
          aria-label="다음 달"
        >
          →
        </button>
        <button
          type="button"
          disabled={busy || !importPreview || importPreview.available + importPreview.skipped === 0}
          onClick={() => setImportOpen(true)}
          className="ml-auto h-9 border border-hu-black/20 bg-hu-white px-3 font-sans-kr text-[13px] disabled:opacity-40"
        >
          지난달 반복 지출 가져오기
        </button>
      </div>

      <form
        className="sticky top-[96px] z-20 mt-6 border border-hu-black/10 bg-[#faf8f6]/95 px-3 py-3 backdrop-blur lg:px-4"
        onSubmit={(e) => {
          e.preventDefault();
          void createExpense();
        }}
      >
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <input
            type="date"
            value={form.expense_date}
            onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
            className="h-9 w-[140px] border border-hu-black/20 bg-hu-white px-2 font-sans-kr text-[13px] outline-none"
          />
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="h-9 min-w-[110px] border border-hu-black/20 bg-hu-white px-2 font-sans-kr text-[13px] outline-none"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="금액"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="h-9 w-[110px] border border-hu-black/20 bg-hu-white px-2 font-sans-kr text-[13px] outline-none"
            required
          />
          <input
            type="text"
            placeholder="거래처"
            value={form.vendor}
            onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
            className="h-9 min-w-[120px] flex-1 border border-hu-black/20 bg-hu-white px-2 font-sans-kr text-[13px] outline-none"
          />
          <label className="flex items-center gap-1.5 whitespace-nowrap font-sans-kr text-[12px] text-hu-muted">
            <input
              type="checkbox"
              checked={form.has_tax_invoice}
              onChange={(e) =>
                setForm((f) => ({ ...f, has_tax_invoice: e.target.checked }))
              }
            />
            증빙
          </label>
          <label className="flex items-center gap-1.5 whitespace-nowrap font-sans-kr text-[12px] text-hu-muted">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_recurring: e.target.checked }))
              }
            />
            반복
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-9 bg-hu-black px-4 font-sans-kr text-[13px] text-white disabled:bg-[#bcbcbc]"
          >
            추가
          </button>
        </div>
      </form>

      {error ? <p className="mt-4 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}
      {loading && !data ? (
        <p className="mt-6 font-sans-kr text-[13px] text-hu-muted">불러오는 중…</p>
      ) : null}

      {data ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <div className="bg-hu-white px-4 py-5 lg:px-5 lg:py-6">
              <p className="font-serif text-[12px] tracking-[0.14em] text-hu-muted">총 지출</p>
              <p className="mt-3 font-serif text-[22px] leading-tight lg:text-[26px]">
                {won(data.summary.totalAmount)}
              </p>
              <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
                전월 대비{" "}
                {data.summary.changeAmount >= 0 ? "+" : ""}
                {won(data.summary.changeAmount)} · {pct(data.summary.changeRate)}
              </p>
            </div>
            <div className="bg-hu-white px-4 py-5 lg:px-5 lg:py-6">
              <p className="font-serif text-[12px] tracking-[0.14em] text-hu-muted">건수</p>
              <p className="mt-3 font-serif text-[22px] leading-tight lg:text-[26px]">
                {data.expenses.length.toLocaleString("ko-KR")}건
              </p>
              <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">선택 월 지출</p>
            </div>
            <div className="bg-hu-white px-4 py-5 lg:px-5 lg:py-6">
              <p className="font-serif text-[12px] tracking-[0.14em] text-hu-muted">증빙 있음</p>
              <p className="mt-3 font-serif text-[22px] leading-tight lg:text-[26px]">
                {won(data.summary.withProofAmount)}
              </p>
            </div>
            <div className="bg-hu-white px-4 py-5 lg:px-5 lg:py-6">
              <p className="font-serif text-[12px] tracking-[0.14em] text-hu-muted">증빙 없음</p>
              <p className="mt-3 font-serif text-[22px] leading-tight lg:text-[26px] text-hu-muted">
                {won(data.summary.withoutProofAmount)}
              </p>
            </div>
          </div>

          {data.summary.categories.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-serif text-[16px] tracking-[0.08em]">카테고리별 비중</h2>
              <ul className="mt-4 divide-y divide-hu-black/10 bg-hu-white">
                {data.summary.categories.map((c) => (
                  <li key={c.category} className="px-5 py-4">
                    <div className="flex items-baseline justify-between gap-4 font-sans-kr text-[14px]">
                      <span>{c.label}</span>
                      <span className="text-hu-muted">
                        {won(c.amount)} · {c.count}건 · {c.share.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 bg-hu-black/10">
                      <div
                        className="h-full bg-hu-black"
                        style={{ width: `${Math.min(100, c.share)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="font-serif text-[16px] tracking-[0.08em]">지출 목록</h2>
            {empty ? (
              <p className="mt-4 bg-hu-white px-5 py-10 text-center font-sans-kr text-[13px] text-hu-muted">
                해당 월에 등록된 지출이 없습니다
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto bg-hu-white">
                <table className="min-w-full text-left font-sans-kr text-[13px]">
                  <thead>
                    <tr className="border-b border-hu-black/10 text-hu-muted">
                      <th className="px-4 py-3 font-normal">날짜</th>
                      <th className="px-4 py-3 font-normal">카테고리</th>
                      <th className="px-4 py-3 font-normal">거래처</th>
                      <th className="px-4 py-3 font-normal">금액</th>
                      <th className="px-4 py-3 font-normal">증빙</th>
                      <th className="px-4 py-3 font-normal">메모</th>
                      <th className="px-4 py-3 font-normal">수정/삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hu-black/10">
                    {data.expenses.map((row) => {
                      const editing = editingId === row.id && editForm;
                      if (editing) {
                        return (
                          <tr key={row.id} className="bg-hu-beige/30">
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                value={editForm.expense_date}
                                onChange={(e) =>
                                  setEditForm((f) =>
                                    f ? { ...f, expense_date: e.target.value } : f
                                  )
                                }
                                className="h-8 w-[132px] border border-hu-black/20 bg-hu-white px-1.5 outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={editForm.category}
                                onChange={(e) =>
                                  setEditForm((f) =>
                                    f ? { ...f, category: e.target.value } : f
                                  )
                                }
                                className="h-8 border border-hu-black/20 bg-hu-white px-1.5 outline-none"
                              >
                                {EXPENSE_CATEGORIES.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={editForm.vendor}
                                onChange={(e) =>
                                  setEditForm((f) =>
                                    f ? { ...f, vendor: e.target.value } : f
                                  )
                                }
                                className="h-8 w-full min-w-[100px] border border-hu-black/20 bg-hu-white px-1.5 outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min={0}
                                value={editForm.amount}
                                onChange={(e) =>
                                  setEditForm((f) =>
                                    f ? { ...f, amount: e.target.value } : f
                                  )
                                }
                                className="h-8 w-[100px] border border-hu-black/20 bg-hu-white px-1.5 outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <label className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={editForm.has_tax_invoice}
                                  onChange={(e) =>
                                    setEditForm((f) =>
                                      f
                                        ? { ...f, has_tax_invoice: e.target.checked }
                                        : f
                                    )
                                  }
                                />
                                <span className="text-[12px] text-hu-muted">증빙</span>
                              </label>
                              <label className="mt-1 flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={editForm.is_recurring}
                                  onChange={(e) =>
                                    setEditForm((f) =>
                                      f ? { ...f, is_recurring: e.target.checked } : f
                                    )
                                  }
                                />
                                <span className="text-[12px] text-hu-muted">반복</span>
                              </label>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={editForm.memo}
                                onChange={(e) =>
                                  setEditForm((f) =>
                                    f ? { ...f, memo: e.target.value } : f
                                  )
                                }
                                className="h-8 w-full min-w-[120px] border border-hu-black/20 bg-hu-white px-1.5 outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void saveEdit()}
                                  className="font-sans-kr text-[12px] text-hu-black underline"
                                >
                                  저장
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditForm(null);
                                  }}
                                  className="font-sans-kr text-[12px] text-hu-muted"
                                >
                                  취소
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={row.id}
                          className="cursor-pointer hover:bg-hu-beige/40"
                          onClick={() => {
                            setEditingId(row.id);
                            setEditForm(toEditForm(row));
                          }}
                        >
                          <td className="px-4 py-3 tabular-nums text-hu-muted">
                            {row.expense_date.slice(2)}
                          </td>
                          <td className="px-4 py-3">{expenseCategoryLabel(row.category)}</td>
                          <td className="px-4 py-3">{row.vendor || "—"}</td>
                          <td className="px-4 py-3 tabular-nums">{won(Number(row.amount))}</td>
                          <td
                            className={clsx(
                              "px-4 py-3",
                              row.has_tax_invoice ? "text-hu-black" : "text-hu-muted"
                            )}
                          >
                            {row.has_tax_invoice ? "있음" : "없음"}
                            {row.is_recurring ? (
                              <span className="ml-1 text-[11px] text-hu-muted">·반복</span>
                            ) : null}
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-hu-muted">
                            {row.memo || "—"}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setEditingId(row.id);
                                setEditForm(toEditForm(row));
                              }}
                              className="mr-2 font-sans-kr text-[12px] text-hu-muted underline"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void removeExpense(row.id)}
                              className="font-sans-kr text-[12px] text-[#9b4a4a]"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-4 font-sans-kr text-[12px] leading-relaxed text-hu-muted">
              세금계산서·카드전표·현금영수증 중 하나를 받은 지출만 &apos;증빙 있음&apos;으로
              체크하세요.
              <br />
              증빙이 없으면 비용으로 인정받지 못하거나 부가세 매입세액 공제를 받을 수
              없습니다.
            </p>
          </section>
        </>
      ) : null}

      {importOpen && importPreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (!busy) setImportOpen(false);
          }}
        >
          <div
            className="w-full max-w-[400px] bg-hu-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-[18px] tracking-[0.06em]">반복 지출 가져오기</p>
            <p className="mt-3 font-sans-kr text-[13px] text-hu-muted">
              지난달 반복 지출 중{" "}
              <span className="text-hu-black">{importPreview.available}건</span>을{" "}
              {year}년 {month}월로 복사합니다.
              {importPreview.skipped > 0
                ? ` 같은 카테고리·거래처 ${importPreview.skipped}건은 이미 있어 건너뜁니다.`
                : ""}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setImportOpen(false)}
                className="px-4 py-2 font-sans-kr text-[13px] text-hu-muted disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                disabled={busy || importPreview.available === 0}
                onClick={() => void runImport()}
                className="bg-hu-black px-4 py-2 font-sans-kr text-[13px] text-white disabled:bg-[#bcbcbc]"
              >
                {busy ? "처리 중..." : `${importPreview.available}건 가져오기`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
