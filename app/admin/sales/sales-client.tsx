"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { BriefingPeriodPicker } from "@/components/admin/BriefingPeriodPicker";
import {
  ArtistFilterChip,
  CheckBox,
  DownloadExportButton,
  FinanceHeader,
  FinanceSticky,
  RefreshButton,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  Toolbar,
  useOutsideClose,
  won
} from "@/components/admin/finance-ui";
import { briefingRange, compareWord, type BriefingKind } from "@/lib/admin/briefing-period";
import { useAdminSession } from "@/components/admin/admin-session";
import type { SalesDashboard } from "@/lib/admin/sales-data";
import { METHOD_LABEL, salesBoardView, todayKst } from "@/lib/admin/sales-data";

type Staff = { id: string; name_kr: string | null; role: string | null };

const SALES_MODES: { id: BriefingKind; label: string }[] = [
  { id: "week", label: "주간" },
  { id: "month", label: "월간" },
  { id: "quarter", label: "분기" },
  { id: "half", label: "반기" },
  { id: "year", label: "연간" }
];

const METHOD_TONE: Record<"card" | "transfer" | "cash", string> = {
  card: "var(--accent)",
  transfer: "var(--muted)",
  cash: "var(--label)"
};

const PAGE_SIZE = 12;

function formatPaidAt(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value])
  );
  return `${parts.month}. ${parts.day} ${parts.hour}:${parts.minute}`;
}

function phoneTail(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-4);
}

function signedPct(rate: number) {
  const body = `${Math.abs(rate).toFixed(1)}%`;
  if (rate > 0) return `+${body} ▲`;
  if (rate < 0) return `-${body} ▼`;
  return "0.0%";
}

function signedCount(delta: number) {
  if (delta > 0) return `+${delta.toLocaleString("ko-KR")}건 ▲`;
  if (delta < 0) return `${delta.toLocaleString("ko-KR")}건 ▼`;
  return "0건";
}

function signedWon(delta: number) {
  const abs = Math.abs(delta).toLocaleString("ko-KR");
  if (delta > 0) return `+${abs}원 ▲`;
  if (delta < 0) return `-${abs}원 ▼`;
  return "0원";
}

function displayMethodPercents(methods: { share: number; amount: number }[]): number[] {
  const total = methods.reduce((sum, method) => sum + method.amount, 0);
  if (total === 0) return methods.map(() => 0);
  const floors = methods.map((method) => Math.floor(method.share));
  let rest = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = methods
    .map((method, index) => ({
      index,
      frac: method.share - Math.floor(method.share),
      amount: method.amount
    }))
    .sort((a, b) => b.frac - a.frac || b.amount - a.amount);
  const percents = floors.slice();
  for (const item of order) {
    if (rest <= 0) break;
    percents[item.index] += 1;
    rest -= 1;
  }
  return percents;
}

type SalesPick = { period: BriefingKind; year: number; month: number; date: string };

export default function AdminSalesPage({
  initial,
  initialError
}: {
  initial: SalesDashboard | null;
  initialError: string | null;
}) {
  const [from, setFrom] = useState(initial?.period.from ?? "");
  const [to, setTo] = useState(initial?.period.to ?? "");
  const [data, setData] = useState<SalesDashboard | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [year, setYear] = useState(() => Number((initial?.period.from ?? todayKst()).slice(0, 4)));
  const [month, setMonth] = useState(() => Number((initial?.period.from ?? todayKst()).slice(5, 7)));
  const [kind, setKind] = useState<BriefingKind>("month");
  const session = useAdminSession();
  const lockedArtistId = session?.role === "designer" ? session.artistId : null;
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [artistFilter, setArtistFilter] = useState<string[]>(() => (lockedArtistId ? [lockedArtistId] : []));
  const [staffOpen, setStaffOpen] = useState(false);
  const [page, setPage] = useState(1);
  const closeStaff = useCallback(() => setStaffOpen(false), []);
  const staffRef = useOutsideClose(staffOpen, closeStaff);

  useEffect(() => {
    if (!staffOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStaff();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [staffOpen, closeStaff]);

  useEffect(() => {
    if (!lockedArtistId) return;
    setArtistFilter((cur) => (cur.length === 1 && cur[0] === lockedArtistId ? cur : [lockedArtistId]));
    setStaffOpen(false);
  }, [lockedArtistId]);

  const load = useCallback(async (next: SalesPick) => {
    setRefreshing(true);
    setError(null);
    const range = briefingRange(next.period, next.year, next.month, next.date);
    const params = new URLSearchParams({ preset: "custom", from: range.from, to: range.to });
    try {
      const res = await fetch(`/api/admin/sales?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as SalesDashboard);
      setFrom(json.period.from);
      setTo(json.period.to);
      setKind(next.period);
      setYear(next.year);
      setMonth(next.month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (lockedArtistId) return;
    let cancelled = false;
    fetch("/api/admin/artists?compact=1")
      .then((res) => res.json())
      .then((artistsJson) => {
        if (cancelled) return;
        setStaff(artistsJson.ok ? (artistsJson.artists as Staff[]) : []);
      })
      .catch(() => {
        if (cancelled) return;
        setStaff([]);
      });
    return () => {
      cancelled = true;
    };
  }, [lockedArtistId]);

  const setupEmpty = !lockedArtistId && staff != null && staff.length === 0;

  const view = useMemo(() => {
    if (!data) return null;
    return salesBoardView({
      payments: data.payments ?? [],
      previousPayments: data.previousPayments ?? [],
      periodBookings: data.periodBookings ?? [],
      artistIds: lockedArtistId ? [lockedArtistId] : artistFilter
    });
  }, [data, artistFilter, lockedArtistId]);

  const s = view;
  const mixPercents = s
    ? displayMethodPercents([
        { share: s.serviceShare, amount: s.serviceAmount },
        { share: s.productShare, amount: s.productAmount }
      ])
    : [0, 0];
  const pageCount = Math.max(1, Math.ceil((s?.payments.length ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = s ? s.payments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : [];

  useEffect(() => {
    setPage(1);
  }, [year, month, kind, artistFilter]);
  const methodPercents = s ? displayMethodPercents(s.methods) : [];
  const a = s?.attrition;
  const prevCount = s ? s.completedCount - s.completedChange : 0;
  const currentEmpty = !s || s.completedCount === 0;
  const canCompare = !currentEmpty && s.revenueChangeRate != null && prevCount > 0;
  const versus = compareWord(kind);
  const revenueHint = canCompare
    ? `${versus} 대비 ${signedPct(s.revenueChangeRate ?? 0)}`
    : `${versus} 결제 내역 없음`;
  const excluded = (a?.cancelledCount ?? 0) + (a?.noshowCount ?? 0);
  const countHint = currentEmpty
    ? "결제 내역 없음"
    : canCompare
      ? `${versus} 대비 ${signedCount(s.completedChange)} · 취소/노쇼 ${excluded}건 제외`
      : `취소/노쇼 ${excluded}건 제외`;
  const avgHint = currentEmpty
    ? "산출 데이터가 없음"
    : canCompare
      ? `${versus} 대비 ${signedWon(s.avgTicket - s.prevAvgTicket)}`
      : `${versus} 결제 내역 없음`;
  const depositHint =
    s && s.totalRevenue > 0
      ? `전체 매출의 ${s.depositShare.toFixed(1)}% · 현장 결제 ${s.onSiteShare.toFixed(1)}%`
      : "사전 0.0% · 현장 0.0%";
  const revenueUp = canCompare && (s.revenueChangeRate ?? 0) > 0;
  const countUp = canCompare && s.completedChange > 0;
  const avgUp = canCompare && s.avgTicket - s.prevAvgTicket > 0;

  return (
    <div className="flex h-full min-h-0 flex-col font-sans-kr text-[#1C1C1C]">
      <FinanceSticky>
      <FinanceHeader embedded />

      <Toolbar
        className="mt-[34px]"
        left={
          <>
            <BriefingPeriodPicker
              period={kind}
              year={year}
              month={month}
              from={from || `${year}-${String(month).padStart(2, "0")}-01`}
              to={to || from}
              modes={SALES_MODES}
              onPick={(next) => void load(next)}
            />
            <div ref={staffRef}>
              <ArtistFilterChip
                count={lockedArtistId ? 1 : artistFilter.length}
                open={lockedArtistId ? false : staffOpen}
                locked={!!lockedArtistId}
                name={session?.artistName}
                onToggle={() => setStaffOpen((v) => !v)}
                menu={
                  <div className="absolute left-0 top-full z-50 mt-[6px] min-w-full rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
                    {staff == null || staff.length === 0 ? (
                      <p className="px-5 py-2 text-[14px] text-[#8A847C]">담당자 없음</p>
                    ) : (
                      staff.map((person) => {
                        const checked = artistFilter.includes(person.id);
                        return (
                          <div key={person.id} className="px-5 py-2 hover:bg-[#F6F4F0]">
                            <CheckBox
                              checked={checked}
                              label={[person.name_kr, person.role].filter(Boolean).join(" ")}
                              onChange={(next) => {
                                if (lockedArtistId) return;
                                setArtistFilter((cur) =>
                                  next ? [...cur, person.id] : cur.filter((id) => id !== person.id)
                                );
                              }}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                }
              />
            </div>
            <RefreshButton
              spinning={refreshing}
              onClick={() =>
                void load({
                  period: kind,
                  year,
                  month,
                  date: from || `${year}-${String(month).padStart(2, "0")}-01`
                })
              }
            />
          </>
        }
        right={
          <DownloadExportButton
            label="매출 리포트 PDF"
            report="sales"
            from={from}
            to={to}
            year={year}
            month={month}
            artistIds={lockedArtistId ? [lockedArtistId] : artistFilter}
            onError={setError}
          />
        }
      />
      </FinanceSticky>

      <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}

      {setupEmpty ? (
        <div className="flex flex-col items-center" style={{ marginTop: 188 }}>
          <p className="text-center text-[16px] font-bold leading-normal text-[#1C1A19]">
            매장 기본 설정을 먼저 완료해 주세요.
          </p>
          <p className="mt-[13px] text-center text-[14px] font-normal leading-[21px] text-[#807B77]">
            매장 정보와 디자이너가 등록되어야 매출 데이터를 집계할 수 있습니다.
          </p>
          {session?.role === "designer" ? null : (
            <Link
              href="/admin/settings"
              className="mt-[35px] flex h-[45px] w-[186px] items-center justify-center rounded-[4px] bg-[#2C3A2E] text-white"
            >
              <span className="text-[15px] font-bold leading-normal">매장 설정 바로가기</span>
            </Link>
          )}
        </div>
      ) : null}

      {!setupEmpty && refreshing && !data ? (
        <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p>
      ) : null}

      {!setupEmpty && s ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            <article className="overflow-visible rounded-[8px] bg-[color:var(--accent)] px-5 py-5 text-white">
              <p className="text-[15px] font-bold leading-normal">총 매출액</p>
              <p className="mt-3 text-[20px] font-bold leading-normal tabular-nums">{won(s.totalRevenue)}</p>
              <p
                className={clsx(
                  "mt-1 text-[13px] leading-normal",
                  revenueUp ? "text-white" : "text-[color:var(--sidebar-bg)]"
                )}
              >
                {revenueHint}
              </p>
            </article>
            {[
              {
                label: "결제 완료 건수",
                value: `${s.completedCount.toLocaleString("ko-KR")}건`,
                hint: countHint,
                up: countUp
              },
              {
                label: "고객 객단가",
                value: won(s.avgTicket),
                hint: avgHint,
                up: avgUp
              },
              {
                label: "사전 예약금",
                value: won(s.depositAmount),
                hint: depositHint,
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
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <section className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
              <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">결제 수단별 매출</h2>
              <div className="mt-4 flex h-[14px] overflow-hidden rounded-[2px] bg-[#E4DFD6]">
                {s.totalRevenue > 0
                  ? s.methods.map((m) =>
                      m.share > 0 ? (
                        <span
                          key={m.method}
                          className="h-full"
                          style={{ width: `${m.share}%`, background: METHOD_TONE[m.method] }}
                        />
                      ) : null
                    )
                  : null}
              </div>
              <ul className="mt-4">
                {s.methods.map((m, index) => (
                  <li key={m.method} className="flex items-center justify-between py-[10px] text-[16px] font-medium">
                    <span className="flex min-w-0 items-center">
                      <span
                        className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full"
                        style={{ background: METHOD_TONE[m.method] }}
                      />
                      <span className="font-bold tabular-nums">{methodPercents[index]}%</span>
                      <span className="ml-2">{m.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[color:var(--muted)]">{won(m.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="overflow-visible rounded-[8px] bg-[color:var(--sidebar-bg)] px-5 py-5">
              <h2 className="text-[15px] font-bold leading-normal text-[color:var(--label)]">시술 · 제품별 매출</h2>
              {[
                {
                  label: "시술",
                  share: mixPercents[0],
                  bar: s.serviceShare,
                  amount: s.serviceAmount,
                  tone: "var(--accent)"
                },
                {
                  label: "제품",
                  share: mixPercents[1],
                  bar: s.productShare,
                  amount: s.productAmount,
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
          </div>

          <p className="mt-6 pl-6 text-[15px] font-bold leading-normal text-[color:var(--label)]">상세 결제 내역</p>
          <section className="mt-4 overflow-hidden rounded-[8px] bg-[color:var(--sidebar-bg)] px-5">
            <table className="w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={clsx(TH, "pl-1")}>결제 일시</th>
                  <th className={TH}>고객명</th>
                  <th className={TH}>담당자</th>
                  <th className={TH}>결제 항목</th>
                  <th className={TH}>결제 수단</th>
                  <th className={clsx(TH, "text-right")}>결제 금액</th>
                  <th className={clsx(TH, "pr-0 text-right")}>상태</th>
                </tr>
              </thead>
              {pageRows.length > 0 ? (
                <tbody>
                  {pageRows.map((row) => {
                    const tail = phoneTail(row.customerPhone);
                    const cancelled = row.status === "cancelled";
                    const artist = [row.artistName, row.artistRole].filter(Boolean).join(" ");
                    return (
                      <tr key={row.id} className={TABLE_ROW}>
                        <td className={clsx(TD, "truncate pl-1 tabular-nums")}>{formatPaidAt(row.paidAt)}</td>
                        <td className={clsx(TD, "truncate")}>
                          {tail ? `${row.customerName}(${tail})` : row.customerName}
                        </td>
                        <td className={clsx(TD, "truncate")}>{artist}</td>
                        <td className={clsx(TD, "truncate")} title={row.serviceNames.join(" + ")}>
                          <span className="text-[color:var(--muted)]">[시술]</span>
                          {row.serviceNames.length ? ` ${row.serviceNames.join(" + ")}` : " —"}
                        </td>
                        <td className={clsx(TD, "truncate")}>
                          {row.paymentMethod ? METHOD_LABEL[row.paymentMethod] : "—"}
                        </td>
                        <td className={clsx(TD, "text-right font-bold tabular-nums")}>{won(row.amount)}</td>
                        <td className={clsx(TD, "pr-0 text-right")}>
                          <span
                            className="inline-flex rounded-[4px] bg-white px-2 py-[4px] text-[13px] font-medium"
                            style={{ color: cancelled ? "var(--danger)" : "var(--muted)" }}
                          >
                            {cancelled ? "결제취소" : "결제완료"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ) : null}
            </table>
            {s.payments.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[16px] font-semibold leading-normal text-[color:var(--ink)]">
                  결제 내역이 없습니다.
                </p>
                <p className="mt-[15px] text-[14px] leading-normal text-[color:var(--muted)]">
                  첫 결제가 완료되면 이곳에 상세 장부가 실시간으로 기록됩니다.
                </p>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
      </div>

      {!setupEmpty && s ? (
        <div className="mt-auto flex shrink-0 items-center justify-end gap-2 pt-5 text-[14px] text-[#8A847C]">
          <PageBtn disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} label="이전">
            <PagerChevron dir="left" />
          </PageBtn>
          {pageButtons(safePage, pageCount).map((item, index) =>
            item === "…" ? (
              <span key={`e-${index}`} className="px-1">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                className={clsx(
                  "h-[28px] min-w-[28px] rounded-[6px] px-1",
                  item === safePage ? "font-medium text-[#1C1C1C]" : "hover:text-[#1C1C1C]"
                )}
              >
                {item}
              </button>
            )
          )}
          <PageBtn
            disabled={safePage >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            label="다음"
          >
            <PagerChevron dir="right" strong />
          </PageBtn>
        </div>
      ) : null}
    </div>
  );
}

function pageButtons(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current > 5 && current < total) {
    const around: Array<number | "…"> = [1, "…", current - 1, current, current + 1, "…", total];
    return around.filter((item, index, list) => item !== "…" || list[index - 1] !== "…");
  }
  return [1, 2, 3, 4, 5, "…", total];
}

function PagerChevron({ dir, strong }: { dir: "left" | "right"; strong?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={clsx("h-[20px] w-[20px]", strong ? "text-[#111111]" : "text-[#C8C3BB]")}
      fill="none"
      stroke="currentColor"
      strokeWidth={strong ? 2.6 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "left" ? <path d="M10.5 3.2 5.2 8l5.3 4.8" /> : <path d="M5.5 3.2 10.8 8 5.5 12.8" />}
    </svg>
  );
}

function PageBtn({
  disabled,
  onClick,
  label,
  children
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[28px] w-[28px] items-center justify-center disabled:opacity-60"
    >
      {children}
    </button>
  );
}
