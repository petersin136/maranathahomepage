"use client";

import { useCallback, useState } from "react";
import { clsx } from "clsx";
import {
  CheckBox,
  Empty,
  FinanceHeader,
  INPUT,
  Modal,
  MonthPicker,
  Note,
  OutlineButton,
  PrimaryButton,
  RefreshButton,
  Section,
  ShareBar,
  StatStrip,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  Icon,
  pct,
  won
} from "@/components/admin/finance-ui";
import { AdminDatePicker } from "@/components/admin/AdminDatePicker";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@/lib/admin/expense-categories";
import type { ExpenseRow, ExpensesDashboard } from "@/lib/admin/expenses-data";
import { todayKst } from "@/lib/admin/sales-data";

type ExpenseForm = {
  expense_date: string;
  category: string;
  amount: string;
  vendor: string;
  memo: string;
  has_tax_invoice: boolean;
  is_recurring: boolean;
};

function emptyForm(): ExpenseForm {
  return {
    expense_date: todayKst(),
    category: "material",
    amount: "",
    vendor: "",
    memo: "",
    has_tax_invoice: false,
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
    has_tax_invoice: Boolean(row.has_tax_invoice),
    is_recurring: Boolean(row.is_recurring)
  };
}

function dotted(ymd: string) {
  return ymd.slice(2).replace(/-/g, ". ");
}

const SELECT = clsx(INPUT, "appearance-none bg-[url('/admin-icons/lnb/chevron-down.png')] bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-8");

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExpenseForm | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);

  const load = useCallback(async (nextYear: number, nextMonth: number) => {
    setRefreshing(true);
    setError(null);
    setEditingId(null);
    setEditForm(null);
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

  const createExpense = () =>
    run(async () => {
      await send(
        "/api/admin/expenses",
        "POST",
        {
          expense_date: form.expense_date,
          category: form.category,
          amount: form.amount,
          vendor: form.vendor,
          memo: form.memo,
          has_tax_invoice: form.has_tax_invoice,
          is_recurring: form.is_recurring
        },
        "등록 실패"
      );
      setForm((f) => ({ ...emptyForm(), expense_date: f.expense_date, category: f.category }));
    }, "등록 실패");

  const saveEdit = () => {
    if (!editingId || !editForm) return;
    return run(async () => {
      await send(`/api/admin/expenses/${editingId}`, "PATCH", editForm, "수정 실패");
    }, "수정 실패");
  };

  const removeExpense = (id: string) =>
    run(async () => {
      await send(`/api/admin/expenses/${id}`, "DELETE", undefined, "삭제 실패");
      setDeleteTarget(null);
    }, "삭제 실패");

  const runImport = () =>
    run(async () => {
      await send("/api/admin/expenses", "POST", { action: "import_recurring", year, month }, "가져오기 실패");
      setImportOpen(false);
    }, "가져오기 실패");

  const importPreview = data?.recurringImport;
  const canImport = !!importPreview && importPreview.available + importPreview.skipped > 0;

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <FinanceHeader subtitle={`${year}년 ${month}월 지출`} />

      <Toolbar
        left={
          <>
            <MonthPicker year={year} month={month} onChange={(y, m) => void load(y, m)} />
            <RefreshButton spinning={refreshing} onClick={() => void load(year, month)} />
          </>
        }
        right={
          <OutlineButton disabled={busy || !canImport} onClick={() => setImportOpen(true)}>
            지난달 반복 지출 가져오기
            {importPreview?.available ? (
              <span className="ml-2 text-[13px] font-semibold text-[#8A847C]">{importPreview.available}건</span>
            ) : null}
          </OutlineButton>
        }
      />

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}
      {refreshing && !data ? <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p> : null}

      {data ? (
        <StatStrip
          items={[
            {
              label: "총 지출",
              value: won(data.summary.totalAmount),
              hint: `전월 대비 ${data.summary.changeAmount >= 0 ? "+" : ""}${won(data.summary.changeAmount)} · ${pct(data.summary.changeRate)}`
            },
            { label: "건수", value: `${data.expenses.length.toLocaleString("ko-KR")}건` },
            { label: "증빙 있음", value: won(data.summary.withProofAmount), hint: "세금계산서·카드·현금영수증" },
            {
              label: "증빙 없음",
              value: won(data.summary.withoutProofAmount),
              hint: data.summary.withoutProofAmount > 0 ? "비용 인정이 어려울 수 있어요" : undefined,
              tone: data.summary.withoutProofAmount > 0 ? "danger" : "muted"
            }
          ]}
        />
      ) : null}

      <Section title="지출 등록">
        <form
          className="mt-4 flex flex-wrap items-center gap-2 border-y-[1.5px] border-[#C9C3BB] py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void createExpense();
          }}
        >
          <AdminDatePicker
            value={form.expense_date}
            onChange={(ymd) => setForm((f) => ({ ...f, expense_date: ymd }))}
            ariaLabel="지출일"
            className={clsx(INPUT, "w-[168px]")}
          />
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className={clsx(SELECT, "w-[132px]")}
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
            className={clsx(INPUT, "w-[132px] text-right tabular-nums")}
            required
          />
          <input
            type="text"
            placeholder="거래처"
            value={form.vendor}
            onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
            className={clsx(INPUT, "w-[180px]")}
          />
          <input
            type="text"
            placeholder="메모 (선택)"
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            className={clsx(INPUT, "min-w-[160px] flex-1")}
          />
          <div className="flex items-center gap-4 px-2">
            <CheckBox label="증빙" checked={form.has_tax_invoice} onChange={(v) => setForm((f) => ({ ...f, has_tax_invoice: v }))} />
            <CheckBox label="매달 반복" checked={form.is_recurring} onChange={(v) => setForm((f) => ({ ...f, is_recurring: v }))} />
          </div>
          <PrimaryButton type="submit" disabled={busy || !form.amount}>
            <Icon src="/admin-icons/lnb/plus.png" className="h-[14px] w-[14px]" />
            추가
          </PrimaryButton>
        </form>
      </Section>

      {data && data.summary.categories.length > 0 ? (
        <Section title="카테고리별 비중" meta={`${data.summary.categories.length}개`}>
          <ul className="mt-4 grid grid-cols-3 gap-x-12 border-t-[1.5px] border-[#C9C3BB]">
            {data.summary.categories.map((c) => (
              <li key={c.category} className="border-b border-[#F3EFEA] py-[15px]">
                <div className="flex items-baseline justify-between text-[16px] font-medium">
                  <span>{c.label}</span>
                  <span className="tabular-nums">
                    {won(c.amount)}
                    <span className="ml-2 text-[13px] font-normal text-[#8A847C]">{c.share.toFixed(1)}%</span>
                  </span>
                </div>
                <ShareBar share={c.share} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data ? (
        <Section title="지출 목록" meta={`${data.expenses.length}건`}>
          <table className="mt-4 w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
            <colgroup>
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col />
              <col className="w-[120px]" />
            </colgroup>
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <th className={clsx(TH, "pl-1")}>날짜</th>
                <th className={TH}>카테고리</th>
                <th className={TH}>거래처</th>
                <th className={clsx(TH, "text-right")}>금액</th>
                <th className={clsx(TH, "pl-4")}>증빙</th>
                <th className={TH}>메모</th>
                <th className={clsx(TH, "pr-0 text-right")}>관리</th>
              </tr>
            </thead>
            <tbody>
              {data.expenses.map((row) =>
                editingId === row.id && editForm ? (
                  <tr key={row.id} className={clsx(TABLE_ROW, "bg-[#F9F8F4]")}>
                    <td className="py-2 pl-1 pr-2">
                      <AdminDatePicker
                        value={editForm.expense_date}
                        onChange={(ymd) => setEditForm((f) => (f ? { ...f, expense_date: ymd } : f))}
                        ariaLabel="지출일"
                        className={clsx(INPUT, "w-full")}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, category: e.target.value } : f))}
                        className={clsx(SELECT, "w-full")}
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={editForm.vendor}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, vendor: e.target.value } : f))}
                        className={clsx(INPUT, "w-full")}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        value={editForm.amount}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, amount: e.target.value } : f))}
                        className={clsx(INPUT, "w-full text-right tabular-nums")}
                      />
                    </td>
                    <td className="py-2 pl-4 pr-2">
                      <div className="flex flex-col gap-1">
                        <CheckBox
                          label="증빙"
                          checked={editForm.has_tax_invoice}
                          onChange={(v) => setEditForm((f) => (f ? { ...f, has_tax_invoice: v } : f))}
                        />
                        <CheckBox
                          label="반복"
                          checked={editForm.is_recurring}
                          onChange={(v) => setEditForm((f) => (f ? { ...f, is_recurring: v } : f))}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={editForm.memo}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, memo: e.target.value } : f))}
                        className={clsx(INPUT, "w-full")}
                      />
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-3 text-[14px]">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(null);
                            setEditForm(null);
                          }}
                          className="text-[#8A847C] hover:text-[#1C1C1C]"
                        >
                          취소
                        </button>
                        <button type="button" disabled={busy} onClick={() => void saveEdit()} className="font-bold text-[#1C1C1C]">
                          저장
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className={TABLE_ROW}>
                    <td className={clsx(TD, "pl-1 tabular-nums")}>{dotted(row.expense_date)}</td>
                    <td className={clsx(TD, "truncate")}>{expenseCategoryLabel(row.category)}</td>
                    <td className={clsx(TD, "truncate")}>{row.vendor || "—"}</td>
                    <td className={clsx(TD, "text-right tabular-nums")}>{won(Number(row.amount))}</td>
                    <td className={clsx(TD, "truncate pl-4")}>
                      <span
                        className="inline-flex items-center gap-[6px]"
                        style={{ color: row.has_tax_invoice ? "#1C1C1C" : "var(--danger)" }}
                      >
                        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
                        {row.has_tax_invoice ? "있음" : "없음"}
                      </span>
                      {row.is_recurring ? <span className="ml-2 text-[13px] text-[#8A847C]">반복</span> : null}
                    </td>
                    <td className={clsx(TD, "truncate text-[#8A847C]")} title={row.memo || undefined}>
                      {row.memo || "—"}
                    </td>
                    <td className={clsx(TD, "pr-0 text-right font-normal text-[#8A847C]")}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(row.id);
                          setEditForm(toForm(row));
                        }}
                        className="hover:text-[#1C1C1C]"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDeleteTarget(row)}
                        className="ml-3 hover:text-[#E24B4B]"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {data.expenses.length === 0 ? <Empty>해당 월에 등록된 지출이 없습니다.</Empty> : null}

          <Note>
            세금계산서·카드전표·현금영수증 중 하나를 받은 지출만 &lsquo;증빙&rsquo;으로 체크하세요. 증빙이 없으면 비용으로
            인정받지 못하거나 부가세 매입세액 공제를 받을 수 없습니다.
          </Note>
        </Section>
      ) : null}

      {importOpen && importPreview ? (
        <Modal
          title="반복 지출 가져오기"
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
              <PrimaryButton
                disabled={busy}
                onClick={() => void removeExpense(deleteTarget.id)}
                danger
              >
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
