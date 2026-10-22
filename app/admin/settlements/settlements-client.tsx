"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  ChipDropdown,
  Empty,
  FinanceHeader,
  FinanceSticky,
  Icon,
  Modal,
  MonthPicker,
  Note,
  OutlineButton,
  PanelOption,
  RefreshButton,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  Toolbar,
  shiftMonth,
  won
} from "@/components/admin/finance-ui";
import { useAdminSession } from "@/components/admin/admin-session";
import { PRODUCT_DESIGNER_RATE } from "@/lib/admin/retail-products";
import {
  bankAccountDisplay,
  remainderPercents,
  type SettlementArtistRow,
  type SettlementBookingRow,
  type SettlementDashboard
} from "@/lib/admin/settlements-data";
import { productAmountFromNames } from "@/lib/admin/retail-products";
import { splitSettlementHistory } from "@/lib/admin/settlement-history";
import { todayKst } from "@/lib/admin/sales-data";

const STATUS_FILTERS = [
  { id: "all", label: "전체" },
  { id: "정산대기", label: "정산대기" },
  { id: "지급 완료", label: "지급 완료" }
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

function defaultLastMonth() {
  const [y, m] = todayKst().split("-").map(Number);
  return shiftMonth(y, m, -1);
}

function currentKstMonth() {
  const [y, m] = todayKst().split("-").map(Number);
  return { year: y, month: m };
}

function signedPct(rate: number) {
  const body = `${Math.abs(rate).toFixed(1)}%`;
  if (rate > 0) return `+${body} ▲`;
  if (rate < 0) return `-${body} ▼`;
  return "0.0%";
}

function withholdingCell(value: number | null) {
  if (value == null) return "—";
  if (value > 0) return `-${won(value)}`;
  return won(value);
}

function formatPaidAt(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}. ${parts.month}. ${parts.day} ${parts.hour}:${parts.minute}`;
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-[14px] w-[14px]" fill="none" aria-hidden="true">
      <rect x="5.2" y="5.2" width="7.2" height="8.2" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.6 5.2V3.8A1.2 1.2 0 0 0 9.4 2.6H3.8A1.2 1.2 0 0 0 2.6 3.8v7.2A1.2 1.2 0 0 0 3.8 12.2h1.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-[16px] w-[16px]" fill="none" aria-hidden="true">
      <path d="M8 2.2v7.2M5.2 6.8 8 9.6l2.8-2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.2 11.2v1.4c0 .6.5 1 1.1 1h7.4c.6 0 1.1-.4 1.1-1v-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminSettlementsPage({
  initial,
  initialError
}: {
  initial: SettlementDashboard | null;
  initialError: string | null;
}) {
  const session = useAdminSession();
  const isDesigner = session?.role === "designer";
  const fallback = useMemo(() => defaultLastMonth(), []);
  const [year, setYear] = useState(initial?.year ?? fallback.year);
  const [month, setMonth] = useState(initial?.month ?? fallback.month);
  const [data, setData] = useState<SettlementDashboard | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [closeOpen, setCloseOpen] = useState(false);
  const [notifyRequested, setNotifyRequested] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (nextYear: number, nextMonth: number) => {
    setRefreshing(true);
    setError(null);
    setExpandedId(null);
    setYear(nextYear);
    setMonth(nextMonth);
    try {
      const params = new URLSearchParams({ year: String(nextYear), month: String(nextMonth) });
      const res = await fetch(`/api/admin/settlements?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as SettlementDashboard);
      setYear(json.year);
      setMonth(json.month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const copyAccount = async (row: SettlementArtistRow) => {
    if (!row.bankAccount) return;
    try {
      await navigator.clipboard.writeText(row.bankAccount);
      setCopiedId(row.artistId);
      window.setTimeout(() => setCopiedId((cur) => (cur === row.artistId ? null : cur)), 1500);
    } catch {
      setError("계좌번호 복사에 실패했습니다.");
    }
  };

  const now = currentKstMonth();
  const closeDisabled = !data || data.closed || (year === now.year && month === now.month);
  const notifyCount = (data?.artists ?? []).filter((row) => (row.netPay ?? 0) > 0).length;
  const closeLabel = notifyRequested ? "마감 및 발송" : "정산 마감";

  const rows = useMemo(() => {
    const list = data?.artists ?? [];
    if (isDesigner || statusFilter === "all") return list;
    return list.filter((row) => row.status === statusFilter);
  }, [data, isDesigner, statusFilter]);

  const shareRows = useMemo(() => {
    const list = (data?.artists ?? []).filter((row) => (row.netPay ?? 0) > 0);
    const percents = remainderPercents(list.map((row) => row.netPay ?? 0));
    return list.map((row, index) => ({ row, percent: percents[index] }));
  }, [data]);

  const structure = useMemo(() => {
    const incentive = data?.summary.totalIncentive ?? 0;
    if (incentive <= 0) return { net: 0, tax: 0 };
    return {
      net: ((data?.summary.totalNetPay ?? 0) / incentive) * 100,
      tax: ((data?.summary.totalWithholding ?? 0) / incentive) * 100
    };
  }, [data]);

  const s = data?.summary;
  const mix = useMemo(() => {
    const rows = (data?.artists ?? []).flatMap((artist) => artist.bookings);
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const productAmount = rows.reduce(
      (sum, row) => sum + productAmountFromNames(row.serviceNames, row.amount),
      0
    );
    const serviceAmount = Math.max(0, total - productAmount);
    return {
      total,
      serviceAmount,
      productAmount,
      serviceShare: total > 0 ? (serviceAmount / total) * 100 : 0,
      productShare: total > 0 ? (productAmount / total) * 100 : 0
    };
  }, [data]);
  const mixPercents = useMemo(() => {
    if (mix.total <= 0) return [0, 0];
    const floors = [Math.floor(mix.serviceShare), Math.floor(mix.productShare)];
    let rest = 100 - floors[0] - floors[1];
    const order = [
      { index: 0, frac: mix.serviceShare - floors[0], amount: mix.serviceAmount },
      { index: 1, frac: mix.productShare - floors[1], amount: mix.productAmount }
    ].sort((a, b) => b.frac - a.frac || b.amount - a.amount);
    for (const item of order) {
      if (rest <= 0) break;
      floors[item.index] += 1;
      rest -= 1;
    }
    return floors;
  }, [mix]);
  const prevPayout = data?.prevMonthPayout ?? 0;
  const canCompare = prevPayout > 0;
  const payoutDeltaRate = canCompare && s ? ((s.totalNetPay - prevPayout) / prevPayout) * 100 : 0;
  const payoutUp = canCompare && payoutDeltaRate > 0;
  const payoutHint = canCompare ? `전월 대비 ${signedPct(payoutDeltaRate)}` : "비교 없음";
  const rateHint = `(시술 매출 × 디자이너별 커미션 요율) + (제품 매출 × ${PRODUCT_DESIGNER_RATE}%)`;

  const runClose = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settlements/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, notifyRequested })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "마감 실패");
      setCloseOpen(false);
      setNotifyRequested(false);
      await load(year, month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "마감 실패");
    } finally {
      setBusy(false);
    }
  };

  const runPayout = async (artistId: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settlements/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, artistId })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "지급 처리 실패");
      await load(year, month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "지급 처리 실패");
    } finally {
      setBusy(false);
    }
  };

  const downloadStatement = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      const res = await fetch(`/api/admin/settlements/statement?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "다운로드에 실패했습니다.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const mm = String(month).padStart(2, "0");
      const filename = utfMatch
        ? decodeURIComponent(utfMatch[1])
        : `헤어업_${year}년${mm}월_명세서.xlsx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const hasStaff = (data?.artists ?? []).some((a) => !a.isFreelance && a.hasCommission);
  const kpi = s
    ? isDesigner
      ? [
          { label: "실지급액", value: won(s.totalNetPay), hint: payoutHint, up: payoutUp, dark: true },
          {
            label: "매출액",
            value: won(s.totalRevenue),
            hint: `시술 + 제품 매출 · ${s.completedCount}건`,
            up: false,
            dark: false
          },
          { label: "발생 인센티브", value: won(s.totalIncentive), hint: rateHint, up: false, dark: false },
          {
            label: "원천징수(3.3%)",
            value: won(s.totalWithholding),
            hint: "익월 10일 세무 납부 대상",
            up: false,
            dark: false
          }
        ]
      : [
          { label: "총 실지급액", value: won(s.totalNetPay), hint: payoutHint, up: payoutUp, dark: true },
          {
            label: "총 매출액",
            value: won(s.totalRevenue),
            hint: `시술 + 제품 매출 · ${s.completedCount}건`,
            up: false,
            dark: false
          },
          { label: "총 발생 인센티브", value: won(s.totalIncentive), hint: rateHint, up: false, dark: false },
          {
            label: "총 원천징수(3.3%)",
            value: won(s.totalWithholding),
            hint: "익월 10일 세무 납부 대상",
            up: false,
            dark: false
          }
        ]
    : [];

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <FinanceSticky>
      <FinanceHeader embedded />

      <Toolbar
        left={
          <>
            <MonthPicker
              year={year}
              month={month}
              width={202}
              label={`${year}. ${String(month).padStart(2, "0")}`}
              onChange={(y, m) => void load(y, m)}
            />
            {isDesigner ? (
              <div className="flex h-[34px] items-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-none text-[#1C1C1C]">
                {data?.closed ? "정산 확정" : "집계 중"}
              </div>
            ) : (
              <ChipDropdown
                icon={<Icon src="/admin-icons/lnb/filter.png" className="h-[15px] w-[15px] text-[#9A948C]" />}
                label={STATUS_FILTERS.find((item) => item.id === statusFilter)?.label ?? "전체"}
                width={202}
              >
                {(close) =>
                  STATUS_FILTERS.map((item) => (
                    <PanelOption
                      key={item.id}
                      label={item.label}
                      selected={statusFilter === item.id}
                      onClick={() => {
                        setStatusFilter(item.id);
                        close();
                      }}
                    />
                  ))
                }
              </ChipDropdown>
            )}
            <RefreshButton spinning={refreshing} onClick={() => void load(year, month)} />
          </>
        }
        right={
          isDesigner ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void downloadStatement()}
              className="inline-flex h-[34px] items-center gap-2 rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-normal text-[#1C1C1C] hover:bg-[#F6F4F0] disabled:opacity-40"
            >
              <DownloadGlyph />
              <span>{busy ? "다운로드 중" : "명세서 다운로드"}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={closeDisabled || busy}
                onClick={() => {
                  setNotifyRequested(false);
                  setCloseOpen(true);
                }}
                className="inline-flex h-[34px] min-w-[96px] items-center justify-center rounded-[8px] bg-[color:var(--accent)] px-4 text-[14px] font-bold leading-none text-white disabled:opacity-40"
              >
                정산 마감
              </button>
              <SettlementReportMenu
                year={year}
                month={month}
                status={statusFilter}
                artists={rows}
                onError={setError}
              />
            </>
          )
        }
      />
      </FinanceSticky>

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}
      {refreshing && !data ? <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p> : null}

      {data && s ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            {kpi.map((card) => (
              <article
                key={card.label}
                className={clsx(
                  "overflow-visible rounded-[8px] px-5 py-5",
                  card.dark
                    ? "bg-[color:var(--accent)] text-white"
                    : "bg-[color:var(--sidebar-bg)] text-[color:var(--ink)]"
                )}
              >
                <p
                  className={clsx(
                    "text-[15px] font-bold leading-normal",
                    card.dark ? "text-white" : "text-[color:var(--label)]"
                  )}
                >
                  {card.label}
                </p>
                <p className="mt-3 text-[20px] font-bold leading-normal tabular-nums">{card.value}</p>
                <p
                  className={clsx(
                    "mt-1 text-[13px] leading-normal",
                    card.dark
                      ? card.up
                        ? "text-white"
                        : "text-[color:var(--sidebar-bg)]"
                      : card.up
                        ? "text-[color:var(--accent)]"
                        : "text-[color:var(--muted)]"
                  )}
                >
                  {card.hint}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {isDesigner ? (
              <>
                <section className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
                  <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">내 매출 구성 비중</h2>
                  {[
                    {
                      label: "시술",
                      share: mixPercents[0],
                      bar: mix.serviceShare,
                      amount: mix.serviceAmount,
                      tone: "var(--accent)"
                    },
                    {
                      label: "제품",
                      share: mixPercents[1],
                      bar: mix.productShare,
                      amount: mix.productAmount,
                      tone: "var(--muted)"
                    }
                  ].map((row) => (
                    <div key={row.label} className="mt-4">
                      <div className="flex items-baseline justify-between text-[16px] font-medium">
                        <span>
                          <span className="font-bold tabular-nums">{row.share}%</span>
                          <span className="ml-2">{row.label}</span>
                        </span>
                        <span className="tabular-nums text-[color:var(--muted)]">{won(row.amount)}</span>
                      </div>
                      <div className="mt-2 h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
                        <div
                          className="h-full rounded-[2px]"
                          style={{ width: `${row.bar}%`, background: row.tone }}
                        />
                      </div>
                    </div>
                  ))}
                </section>
                <StructureCard net={structure.net} tax={structure.tax} title="내 정산 구조" />
              </>
            ) : (
              <>
                <section className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
                  <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">
                    디자이너별 정산액 비중
                  </h2>
                  <div className="mt-4 flex h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
                    {shareRows.map((item, index) =>
                      item.percent > 0 ? (
                        <span
                          key={item.row.artistId}
                          className="h-full"
                          style={{
                            width: `${item.percent}%`,
                            background: index % 2 === 0 ? "var(--accent)" : "var(--muted)"
                          }}
                        />
                      ) : null
                    )}
                  </div>
                  <ul className="mt-4">
                    {shareRows.map((item, index) => (
                      <li
                        key={item.row.artistId}
                        className="flex items-center justify-between py-[10px] text-[16px] font-medium"
                      >
                        <span className="flex min-w-0 items-center">
                          <span
                            className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full"
                            style={{ background: index % 2 === 0 ? "var(--accent)" : "var(--muted)" }}
                          />
                          <span className="font-bold tabular-nums">{item.percent}%</span>
                          <span className="ml-2">{item.row.artistName}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-[color:var(--muted)]">
                          {won(item.row.netPay)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
                <StructureCard net={structure.net} tax={structure.tax} title="수당 vs 공제 구조" />
              </>
            )}
          </div>

          <p className="mt-6 pl-6 text-[15px] font-bold leading-normal text-[color:var(--label)]">디자이너별 정산</p>
          <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
            <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[15%]" />
                <col className="w-[13%]" />
                <col />
              </colgroup>
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={clsx(TH, "pl-1")}>디자이너</th>
                  <th className={clsx(TH, "text-right")}>담당매출</th>
                  <th className={clsx(TH, "text-right")}>커미션 요율</th>
                  <th className={clsx(TH, "text-right")}>발생 인센티브</th>
                  <th className={clsx(TH, "text-right")}>원천징수(3.3%)</th>
                  <th className={clsx(TH, "text-right")}>실지급액</th>
                  <th className={clsx(TH, "pr-0")}>지급 계좌</th>
                </tr>
              </thead>
              {rows.length > 0 ? (
                <tbody>
                  {rows.map((row) => (
                    <ArtistRow
                      key={row.artistId}
                      row={row}
                      owner={!isDesigner}
                      open={expandedId === row.artistId}
                      copied={copiedId === row.artistId}
                      busy={busy}
                      onToggle={() => setExpandedId((cur) => (cur === row.artistId ? null : row.artistId))}
                      onCopyAccount={() => void copyAccount(row)}
                      onPayout={() => void runPayout(row.artistId)}
                    />
                  ))}
                </tbody>
              ) : null}
            </table>
            {rows.length === 0 ? <Empty>해당 월에 정산할 내역이 없습니다.</Empty> : null}
          </section>

          <Note>
            {hasStaff
              ? "원천징수(3.3%)는 프리랜서에게만 적용합니다. 4대보험 대상 직원의 급여·공제는 급여대장에서 별도로 처리하세요."
              : "원천징수 3.3%는 일반적인 사업소득 기준입니다."}
            <br />
            원천징수한 세액은 지급일이 속한 달의 다음 달 10일까지 신고·납부해야 하며, 실제 신고는 세무 대리인과 확인하세요.
          </Note>
        </>
      ) : null}

      {closeOpen ? (
        <Modal
          title={`${year}년 ${month}월 정산을 마감하시겠습니까?`}
          busy={busy}
          onClose={() => {
            if (!busy) setCloseOpen(false);
          }}
          actions={
            <>
              <OutlineButton disabled={busy} onClick={() => setCloseOpen(false)}>
                취소
              </OutlineButton>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runClose()}
                className="inline-flex h-[34px] min-w-[96px] items-center justify-center rounded-[8px] bg-[color:var(--accent)] px-4 text-[14px] font-bold leading-none text-white disabled:opacity-40"
              >
                {busy ? "처리 중..." : closeLabel}
              </button>
            </>
          }
        >
          <label className="mt-1 flex cursor-not-allowed items-start gap-2 text-[14px] font-medium text-[color:var(--ink)] opacity-40">
            <input
              type="checkbox"
              checked={notifyRequested}
              disabled
              onChange={(e) => setNotifyRequested(e.target.checked)}
              className="mt-[3px] size-[18px] accent-[color:var(--ink)]"
            />
            <span>마감 완료 후 디자이너 {notifyCount}명에게 명세서 알림톡 발송</span>
          </label>
        </Modal>
      ) : null}
    </div>
  );
}

function StructureCard({ net, tax, title }: { net: number; tax: number; title: string }) {
  const rows = [
    { label: "발생 인센티브", share: net, tone: "var(--accent)" },
    { label: "원천징수", share: tax, tone: "var(--muted)" }
  ];
  return (
    <section className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
      <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">{title}</h2>
      {rows.map((row) => (
        <div key={row.label} className="mt-4">
          <div className="flex items-baseline justify-between text-[16px] font-medium">
            <span>
              <span className="font-bold tabular-nums">{row.share.toFixed(1)}%</span>
              <span className="ml-2">{row.label}</span>
            </span>
          </div>
          <div className="mt-2 h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
            <div className="h-full rounded-[2px]" style={{ width: `${row.share}%`, background: row.tone }} />
          </div>
        </div>
      ))}
    </section>
  );
}

function PayMeta({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "ok" | "wait";
}) {
  return (
    <span className="mr-[22px] inline-flex items-baseline">
      <span className="text-[12px] leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        {label}
      </span>
      <span
        className={clsx(
          "ml-[6px] text-[13px] leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
          tone === "ok" ? "font-medium text-[#2A744B]" : tone === "wait" ? "font-medium text-[#B16242]" : "text-[#5C564F]"
        )}
      >
        {value}
      </span>
    </span>
  );
}

function PayAmount({
  label,
  detail,
  amount,
  strong = false,
  size = "md",
  tone = "ink"
}: {
  label: string;
  detail?: string;
  amount: string;
  strong?: boolean;
  size?: "md" | "lg";
  tone?: "service" | "product" | "minus" | "ink" | "net";
}) {
  const amountColor =
    tone === "service"
      ? "text-[#2F3A2F]"
      : tone === "product"
        ? "text-[#3A5476]"
        : tone === "minus"
          ? "text-[#B16242]"
          : tone === "net"
            ? "text-[#2F3A2F]"
            : "text-[#1C1C1C]";
  const swatch =
    tone === "service" ? "#2F3A2F" : tone === "product" ? "#3A5476" : tone === "minus" ? "#B16242" : null;
  return (
    <div className={clsx("flex items-baseline justify-between py-[7px]", strong && "mt-[2px] border-t border-[#D7E0D4] pt-[10px]")}>
      <span
        className={clsx(
          "inline-flex min-w-0 items-baseline leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
          size === "lg" ? "text-[15px] text-[#1C1C1C]" : "text-[13px] text-[#8A847C]"
        )}
      >
        {swatch ? (
          <span className="mr-[8px] inline-block h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: swatch }} />
        ) : null}
        {label}
        {detail ? (
          <span className="ml-[10px] tabular-nums [text-box-edge:text_alphabetic] [text-box-trim:trim-both]">{detail}</span>
        ) : null}
      </span>
      <span
        className={clsx(
          "shrink-0 tabular-nums leading-none",
          size === "lg" ? "text-[15px]" : "text-[13px]",
          strong && "font-medium",
          amountColor
        )}
      >
        {amount}
      </span>
    </div>
  );
}

function SettlementReportMenu({
  year,
  month,
  status,
  artists,
  onError
}: {
  year: number;
  month: number;
  status: string;
  artists: SettlementArtistRow[];
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPicked([]);
  }, [year, month, status]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const download = async (ids: string[]) => {
    if (busy) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (!ids.length && status !== "all") params.set("status", status);
      for (const id of ids) params.append("artistId", id);
      const res = await fetch(`/api/admin/settlements/pdf?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "다운로드에 실패했습니다.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const mm = String(month).padStart(2, "0");
      const filename = utfMatch
        ? decodeURIComponent(utfMatch[1])
        : `헤어업_${year}년${mm}월_정산리포트.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const allIds = artists.map((row) => row.artistId);
  const allOn = allIds.length > 0 && allIds.every((id) => picked.includes(id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-normal text-[#1C1C1C] hover:bg-[#F6F4F0] disabled:opacity-40"
      >
        <DownloadGlyph />
        <span>{busy ? "준비 중" : "정산 리포트 PDF"}</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] rounded-[12px] border border-[#EFEBE6] bg-white p-3 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void download([])}
            className="flex h-[34px] w-full items-center rounded-[8px] bg-[#1C1C1C] px-3 text-left text-[13px] font-semibold text-white disabled:opacity-40"
          >
            전체 리포트
          </button>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] font-medium text-[#9A948C]">인원별</p>
            <button
              type="button"
              disabled={!artists.length}
              onClick={() => setPicked(allOn ? [] : allIds)}
              className="text-[12px] font-medium text-[#1C1C1C]"
            >
              {allOn ? "선택 해제" : "모두 선택"}
            </button>
          </div>
          <div className="mt-2 max-h-[220px] overflow-auto">
            {artists.length ? (
              artists.map((row) => (
                <label key={row.artistId} className="flex cursor-pointer items-center gap-2 py-1.5 text-[13px] text-[#1C1C1C]">
                  <input
                    type="checkbox"
                    checked={picked.includes(row.artistId)}
                    onChange={() =>
                      setPicked((current) =>
                        current.includes(row.artistId)
                          ? current.filter((id) => id !== row.artistId)
                          : [...current, row.artistId]
                      )
                    }
                    className="h-[14px] w-[14px] accent-[#1C1C1C]"
                  />
                  <span className="min-w-0 truncate">
                    {row.artistName}
                    <span className="text-[#9A948C]"> ({row.employmentLabel})</span>
                  </span>
                </label>
              ))
            ) : (
              <p className="py-2 text-[13px] text-[#9A948C]">이 달에 정산할 디자이너가 없습니다.</p>
            )}
          </div>
          <button
            type="button"
            disabled={busy || !picked.length}
            onClick={() => void download(picked)}
            className="mt-2 flex h-[34px] w-full items-center justify-center rounded-[8px] border border-[#E6E1DA] text-[13px] font-semibold text-[#1C1C1C] disabled:opacity-40"
          >
            선택 인원 다운로드
          </button>
        </div>
      ) : null}
    </div>
  );
}

function historyDate(ymd: string) {
  return ymd.slice(2).replaceAll("-", ". ");
}

const KIND_TONE: Record<string, string> = {
  cut: "#78716C",
  perm: "#BF7768",
  color: "#4E7970",
  care: "#4C7CA2",
  etc: "#9A948C"
};

function FolderTab({
  on,
  label,
  count,
  small = false,
  onClick
}: {
  on: boolean;
  label: string;
  count?: number;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "relative -mb-px border border-[#D5DFD2] leading-none",
        small
          ? "rounded-t-[7px] px-[12px] pb-[7px] pt-[6px] text-[12px]"
          : "rounded-t-[9px] px-[16px] pb-[9px] pt-[8px] text-[13px]",
        on
          ? "z-[1] border-b-[#F4F7F2] bg-[#F4F7F2] font-semibold text-[#1C1C1C]"
          : "bg-[#E3EBDF] font-medium text-[#7A8476]"
      )}
    >
      <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        {label}
        {count != null ? <span className="ml-[6px] font-medium tabular-nums">{count}</span> : null}
      </span>
    </button>
  );
}

function payMethodColor(label: string) {
  if (label === "카드") return "#2F3A2F";
  if (label === "계좌이체") return "#3A5476";
  if (label === "현금") return "#B16242";
  return "#8A847C";
}

function HistoryTable({
  rows
}: {
  rows: { id: string; bookingDate: string; customerName: string; names: string; paymentMethodLabel: string; amount: number }[];
}) {
  return (
    <table className="w-full table-fixed text-left text-[13px] font-medium leading-[18px]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-[#D7E0D4] last:border-b-0">
            <td className="w-[14%] py-[10px] pr-3 tabular-nums text-[#8A847C]">{historyDate(row.bookingDate)}</td>
            <td className="w-[14%] truncate py-[10px] pr-3 text-[13px] text-[#1C1C1C]">{row.customerName}</td>
            <td className="truncate py-[10px] pr-3 text-[#3A3A3A]">{row.names || "—"}</td>
            <td className="w-[12%] py-[10px] pr-3" style={{ color: payMethodColor(row.paymentMethodLabel) }}>
              {row.paymentMethodLabel}
            </td>
            <td className="w-[14%] py-[10px] text-right tabular-nums text-[#1C1C1C]">{won(row.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CompletedHistory({ bookings }: { bookings: SettlementBookingRow[] }) {
  const [tab, setTab] = useState<"service" | "product">("service");
  const [view, setView] = useState<"date" | "kind">("date");
  const history = useMemo(() => splitSettlementHistory(bookings), [bookings]);

  if (bookings.length === 0) {
    return (
      <>
        <p className="text-[12px] font-medium leading-none text-[#3A5476] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
          완료 내역
        </p>
        <Empty>완료된 예약이 없습니다.</Empty>
      </>
    );
  }

  const tabs = [
    { id: "service" as const, label: "시술", count: history.serviceCount, amount: history.serviceAmount },
    { id: "product" as const, label: "제품 판매", count: history.productCount, amount: history.productAmount }
  ];

  return (
    <div>
      <p className="text-[12px] font-medium leading-none text-[#8A847C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        완료 내역
      </p>
      <div className="mt-[14px] flex items-end gap-[18px]">
        <div className="flex items-end gap-[4px]">
          {tabs.map((item) => (
            <FolderTab
              key={item.id}
              on={tab === item.id}
              label={item.label}
              count={item.count}
              onClick={() => setTab(item.id)}
            />
          ))}
        </div>
        {tab === "service" ? (
          <div className="flex items-end gap-[4px]">
            {(
              [
                { id: "date" as const, label: "일자별 보기" },
                { id: "kind" as const, label: "시술별 보기" }
              ] as const
            ).map((item) => (
              <FolderTab
                key={item.id}
                small
                on={view === item.id}
                label={item.label}
                onClick={() => setView(item.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="-mt-px border-t border-[#D5DFD2] pt-[12px]">
        {tab === "service" ? (
          history.serviceCount === 0 ? (
            <Empty>시술 내역이 없습니다.</Empty>
          ) : view === "date" ? (
            <HistoryTable
              rows={history.serviceVisits.map((row) => ({
                id: row.id,
                bookingDate: row.bookingDate,
                customerName: row.customerName,
                names: row.names.join(" / "),
                paymentMethodLabel: row.paymentMethodLabel,
                amount: row.amount
              }))}
            />
          ) : (
            <div>
              {history.kindGroups.map((group) => (
                <div key={group.kind} className="mt-[12px] border-l-2 pl-[10px] first:mt-0" style={{ borderColor: KIND_TONE[group.kind] }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className="text-[12px] font-medium leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]"
                      style={{ color: KIND_TONE[group.kind] }}
                    >
                      {group.label}
                      <span className="ml-1 tabular-nums">{group.count}건</span>
                    </p>
                    <p className="text-[13px] font-medium tabular-nums leading-none text-[#1C1C1C] [text-box-edge:text_alphabetic] [text-box-trim:trim-both]">
                      {won(group.amount)}
                    </p>
                  </div>
                  <div className="mt-[4px]">
                    <HistoryTable
                      rows={group.lines.map((row) => ({
                        id: row.id,
                        bookingDate: row.bookingDate,
                        customerName: row.customerName,
                        names: row.name,
                        paymentMethodLabel: row.paymentMethodLabel,
                        amount: row.amount
                      }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : history.productCount === 0 ? (
          <Empty>제품 판매 내역이 없습니다.</Empty>
        ) : (
          <HistoryTable
            rows={history.productVisits.map((row) => ({
              id: row.id,
              bookingDate: row.bookingDate,
              customerName: row.customerName,
              names: row.names.join(" / "),
              paymentMethodLabel: row.paymentMethodLabel,
              amount: row.amount
            }))}
          />
        )}
      </div>
    </div>
  );
}

function PayBreakdown({ row }: { row: SettlementArtistRow }) {
  const serviceBasis = won(row.serviceRevenue ?? row.revenue);
  const productBasis = won(row.productRevenue ?? 0);
  if (!row.hasCommission) {
    return (
      <p className="text-[13px] leading-none text-[#8A847C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        커미션 요율이 없어 인센티브를 산정하지 않습니다.
      </p>
    );
  }
  return (
    <div>
      <p className="text-[15px] font-medium leading-none text-[#2F3A2F] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        지급 산정
      </p>
      <div className="mt-[8px]">
        <PayAmount
          label="시술 인센티브"
          detail={`${serviceBasis} × ${row.commissionRate}%`}
          amount={row.serviceIncentive != null ? won(row.serviceIncentive) : "—"}
          tone="service"
        />
        <PayAmount
          label="제품 인센티브"
          detail={`${productBasis} × ${PRODUCT_DESIGNER_RATE}%`}
          amount={row.productIncentive != null ? won(row.productIncentive) : "—"}
          tone="product"
        />
        <PayAmount label="발생 인센티브" amount={row.incentive != null ? won(row.incentive) : "—"} strong size="lg" />
        {row.isFreelance ? (
          <>
            <PayAmount
              label="소득세"
              detail="발생 인센티브의 3%, 10원 미만 버림"
              amount={row.incomeTax != null ? `−${won(row.incomeTax)}` : "—"}
              tone="minus"
            />
            <PayAmount
              label="지방소득세"
              detail="소득세의 10%, 10원 미만 버림"
              amount={row.localIncomeTax != null ? `−${won(row.localIncomeTax)}` : "—"}
              tone="minus"
            />
          </>
        ) : null}
        <PayAmount label="실지급액" amount={row.netPay != null ? won(row.netPay) : "—"} strong size="lg" tone="net" />
      </div>
    </div>
  );
}

function ArtistRow({
  row,
  owner,
  open,
  copied,
  busy,
  onToggle,
  onCopyAccount,
  onPayout
}: {
  row: SettlementArtistRow;
  owner: boolean;
  open: boolean;
  copied: boolean;
  busy: boolean;
  onToggle: () => void;
  onCopyAccount: () => void;
  onPayout: () => void;
}) {
  const account = bankAccountDisplay(row.bankName, row.bankAccount);
  const payoutReady = row.status === "정산대기";
  const payable = row.netPay != null && row.netPay > 0;
  return (
    <>
      <tr className={TABLE_ROW}>
        <td className={clsx(TD, "truncate pl-1")}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="inline-flex max-w-full items-center gap-2 text-left"
          >
            <Icon
              src="/admin-icons/lnb/chevron-down.png"
              className={clsx("h-[14px] w-[14px] shrink-0 text-[#9A948C] transition-transform", open && "rotate-180")}
            />
            <span className="truncate">
              {row.artistName}({row.employmentLabel})
            </span>
          </button>
        </td>
        <td className={clsx(TD, "text-right tabular-nums")}>{won(row.revenue)}</td>
        <td className={clsx(TD, "text-right tabular-nums")}>
          {row.hasCommission ? `${row.commissionRate}%` : "0%"}
        </td>
        <td className={clsx(TD, "text-right tabular-nums")}>{row.incentive != null ? won(row.incentive) : "—"}</td>
        <td className={clsx(TD, "text-right tabular-nums")}>{withholdingCell(row.withholding)}</td>
        <td className={clsx(TD, "text-right font-bold tabular-nums")}>
          {row.netPay != null ? won(row.netPay) : "—"}
        </td>
        <td className={clsx(TD, "truncate pr-0")}>
          {account && row.bankAccount ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyAccount();
              }}
              className="inline-flex max-w-full items-center gap-1 truncate text-left text-[14px] text-[#8A847C] hover:text-[#1C1C1C]"
              title="계좌번호 복사"
            >
              <span className="truncate">{copied ? "복사됨" : account}</span>
              <CopyGlyph />
            </button>
          ) : (
            <span className="text-[#8A847C]">—</span>
          )}
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={7} className="px-0 pb-[18px] pt-[16px]">
            <div className="rounded-[10px] bg-[#F4F7F2] px-[20px] pb-[18px] pt-[20px]">
              <PayBreakdown row={row} />
              <div className="mt-[12px] flex flex-wrap items-center">
                <PayMeta label="완료" value={`${row.count}건`} />
                <PayMeta label="예금주" value={row.bankHolder || "—"} />
                <PayMeta
                  label="상태"
                  value={row.status}
                  tone={row.status === "지급 완료" ? "ok" : row.status === "정산대기" ? "wait" : undefined}
                />
                {row.status === "지급 완료" && row.paidAt ? (
                  <PayMeta label="지급일시" value={formatPaidAt(row.paidAt)} />
                ) : null}
              </div>
              {owner && payable && row.status !== "지급 완료" ? (
                <div className="mt-[14px]">
                  <button
                    type="button"
                    disabled={!payoutReady || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPayout();
                    }}
                    className="inline-flex h-[34px] items-center rounded-[8px] bg-[color:var(--accent)] px-4 text-[13px] font-bold text-white disabled:opacity-40"
                  >
                    지급 완료 처리
                  </button>
                </div>
              ) : null}
              <div className="mt-[16px] border-t border-[#D7E0D4] pt-[16px]">
                <CompletedHistory bookings={row.bookings} />
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
