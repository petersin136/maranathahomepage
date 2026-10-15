"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  ArtistFilterChip,
  CheckBox,
  DownloadExportButton,
  FinanceHeader,
  MonthPicker,
  RefreshButton,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  Toolbar,
  useOutsideClose,
  won
} from "@/components/admin/finance-ui";
import { useAdminSession } from "@/components/admin/admin-session";
import type { SalesDashboard } from "@/lib/admin/sales-data";
import { METHOD_LABEL, monthEnd, monthStart, salesBoardView, todayKst } from "@/lib/admin/sales-data";

type Staff = { id: string; name_kr: string | null; role: string | null };

const METHOD_TONE: Record<"card" | "transfer" | "cash", string> = {
  card: "var(--accent)",
  transfer: "var(--muted)",
  cash: "var(--label)"
};

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

function monthRange(year: number, month: number) {
  const from = monthStart(`${year}-${String(month).padStart(2, "0")}-01`);
  return { from, to: monthEnd(from) };
}

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
  const session = useAdminSession();
  const lockedArtistId = session?.role === "designer" ? session.artistId : null;
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [artistFilter, setArtistFilter] = useState<string[]>(() => (lockedArtistId ? [lockedArtistId] : []));
  const [staffOpen, setStaffOpen] = useState(false);
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

  const load = useCallback(async (nextYear: number, nextMonth: number) => {
    setRefreshing(true);
    setError(null);
    const range = monthRange(nextYear, nextMonth);
    const params = new URLSearchParams({ preset: "custom", from: range.from, to: range.to });
    try {
      const res = await fetch(`/api/admin/sales?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as SalesDashboard);
      setFrom(json.period.from);
      setTo(json.period.to);
      setYear(Number(json.period.from.slice(0, 4)));
      setMonth(Number(json.period.from.slice(5, 7)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (lockedArtistId) return;
    let cancelled = false;
    fetch("/api/admin/artists")
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
  const a = s?.attrition;
  const prevCount = s ? s.completedCount - s.completedChange : 0;
  const currentEmpty = !s || s.completedCount === 0;
  const canCompare = !currentEmpty && s.revenueChangeRate != null && prevCount > 0;
  const revenueHint = canCompare
    ? `전월 대비 ${signedPct(s.revenueChangeRate ?? 0)}`
    : "전월 결제 내역 없음";
  const excluded = (a?.cancelledCount ?? 0) + (a?.noshowCount ?? 0);
  const countHint = currentEmpty
    ? "결제 내역 없음"
    : canCompare
      ? `전월 대비 ${signedCount(s.completedChange)} · 취소/노쇼 ${excluded}건 제외`
      : `취소/노쇼 ${excluded}건 제외`;
  const avgHint = currentEmpty
    ? "산출 데이터가 없음"
    : canCompare
      ? `전월 대비 ${signedWon(s.avgTicket - s.prevAvgTicket)}`
      : "전월 결제 내역 없음";
  const depositHint =
    s && s.totalRevenue > 0
      ? `전체 매출의 ${s.depositShare.toFixed(1)}% · 현장 결제 ${s.onSiteShare.toFixed(1)}%`
      : "사전 0.0% · 현장 0.0%";
  const revenueUp = canCompare && (s.revenueChangeRate ?? 0) > 0;
  const countUp = canCompare && s.completedChange > 0;
  const avgUp = canCompare && s.avgTicket - s.prevAvgTicket > 0;

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <FinanceHeader />

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
            <RefreshButton spinning={refreshing} onClick={() => void load(year, month)} />
          </>
        }
        right={
          <DownloadExportButton
            labeled
            from={from}
            to={to}
            year={year}
            month={month}
            artistIds={lockedArtistId ? [lockedArtistId] : artistFilter}
            onError={setError}
          />
        }
      />

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}

      {setupEmpty ? (
        <div className="flex flex-col items-center" style={{ marginTop: 188 }}>
          <p className="text-center text-[16px] font-bold leading-normal text-[#1C1A19]">
            매장 기본 설정을 먼저 완료해 주세요.
          </p>
          <p className="mt-[13px] text-center text-[14px] font-normal leading-[21px] text-[#807B77]">
            매장 정보와 디자이너가 등록되어야 매출 데이터를 집계할 수 있습니다.
          </p>
          <Link
            href="/admin/settings"
            className="mt-[35px] flex h-[45px] w-[186px] items-center justify-center rounded-[4px] bg-[#2C3A2E] text-white"
          >
            <span className="text-[15px] font-bold leading-normal">매장 설정 바로가기</span>
          </Link>
        </div>
      ) : null}

      {!setupEmpty && refreshing && !data ? (
        <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p>
      ) : null}

      {!setupEmpty && s ? (
        <>
          <div className="mt-6 grid grid-cols-4 gap-2">
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
                {s.methods.map((m) => (
                  <li key={m.method} className="flex items-center justify-between py-[10px] text-[16px] font-medium">
                    <span className="flex min-w-0 items-center">
                      <span
                        className="mr-2 inline-block h-[14px] w-[3px] shrink-0 rounded-full"
                        style={{ background: METHOD_TONE[m.method] }}
                      />
                      <span className="font-bold tabular-nums">{Math.round(m.share)}%</span>
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
                  share: s.totalRevenue > 0 ? 100 : 0,
                  amount: s.totalRevenue,
                  tone: "var(--accent)"
                },
                { label: "제품", share: 0, amount: 0, tone: "var(--muted)" }
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
                      style={{ width: `${row.share}%`, background: row.tone }}
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
              {s.payments.length > 0 ? (
                <tbody>
                  {s.payments.map((row) => {
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
  );
}
