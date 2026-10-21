"use client";

import { useCallback, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  ChipDropdown,
  DownloadExportButton,
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
  type SettlementDashboard
} from "@/lib/admin/settlements-data";
import { productAmountFromNames } from "@/lib/admin/retail-products";
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
            hint: `정산 대상 실적(${s.completedCount}건)`,
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
            hint: `정산 대상 실적(${s.completedCount}건)`,
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
              <DownloadExportButton
                label="정산 리포트 PDF"
                report="settlements"
                year={year}
                month={month}
                status={statusFilter}
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
      <tr
        className={clsx(TABLE_ROW, "cursor-pointer hover:bg-[#F9F8F4]", open && "bg-[#F4EFE9]")}
        onClick={onToggle}
      >
        <td className={clsx(TD, "truncate pl-1")}>
          <span className="inline-flex items-center gap-2">
            <Icon
              src="/admin-icons/lnb/chevron-down.png"
              className={clsx("h-[14px] w-[14px] text-[#9A948C] transition-transform", open && "rotate-180")}
            />
            {row.artistName}({row.employmentLabel})
          </span>
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
        <tr className="bg-[#F9F8F4]">
          <td colSpan={7} className="px-6 pb-5 pt-3">
            {row.hasCommission ? (
              <p className="text-[13px] text-[#8A847C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                {`계산법 (시술 매출 × ${row.commissionRate}%) + (제품 매출 × ${PRODUCT_DESIGNER_RATE}%)`}
              </p>
            ) : null}
            <p className={clsx("text-[13px] text-[#8A847C]", row.hasCommission && "mt-[6px]")}>
              건수 {row.count}건
              {` · 시술 ${won(row.serviceRevenue ?? row.revenue)}`}
              {` · 제품 ${won(row.productRevenue ?? 0)}`}
              {row.serviceIncentive != null ? ` · 시술 인센 ${won(row.serviceIncentive)}` : ""}
              {row.productIncentive != null ? ` · 제품 인센 ${won(row.productIncentive)}` : ""}
              {row.incomeTax != null ? ` · 소득세 ${won(row.incomeTax)}` : " · 소득세 —"}
              {row.localIncomeTax != null ? ` · 지방소득세 ${won(row.localIncomeTax)}` : " · 지방소득세 —"}
              {` · 예금주 ${row.bankHolder || "—"}`}
              {` · 상태 ${row.status}`}
            </p>
            {owner && ((row.status === "지급 완료" && row.paidAt) || payable) ? (
              <div className="mt-3">
                {row.status === "지급 완료" && row.paidAt ? (
                  <p className="text-[13px] text-[#8A847C]">지급일시 {formatPaidAt(row.paidAt)}</p>
                ) : (
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
                )}
              </div>
            ) : null}
            {row.bookings.length === 0 ? (
              <Empty>완료된 예약이 없습니다.</Empty>
            ) : (
              <table className="mt-2 w-full table-fixed text-left text-[15px] font-medium leading-[20px]">
                <tbody>
                  {row.bookings.map((b) => (
                    <tr key={b.id} className="border-b border-[#EFEBE6] last:border-b-0">
                      <td className="w-[14%] py-3 pr-3 tabular-nums text-[#8A847C]">
                        {b.bookingDate.slice(2).replaceAll("-", ". ")}
                      </td>
                      <td className="w-[14%] truncate py-3 pr-3">{b.customerName}</td>
                      <td className="truncate py-3 pr-3 text-[#3A3A3A]">
                        {b.serviceNames.length ? b.serviceNames.join(" / ") : "—"}
                      </td>
                      <td className="w-[12%] py-3 pr-3 text-[#8A847C]">{b.paymentMethodLabel}</td>
                      <td className="w-[14%] py-3 text-right tabular-nums">{won(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
