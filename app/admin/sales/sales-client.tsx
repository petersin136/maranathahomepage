"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CheckBox,
  Empty,
  FinanceHeader,
  Icon,
  MonthPicker,
  RefreshButton,
  Section,
  ShareBar,
  StatStrip,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  TRIM_KR,
  Toolbar,
  pct,
  won
} from "@/components/admin/finance-ui";
import type { SalesDashboard, SalesPreset } from "@/lib/admin/sales-data";

type Staff = { id: string; name_kr: string | null; role: string | null };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthBounds(year: number, month: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = pad2(month);
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${pad2(last)}` };
}

function shortChartDate(ymd: string) {
  return ymd.length >= 10 ? `${ymd.slice(5, 7)}/${ymd.slice(8, 10)}` : ymd;
}

export default function AdminSalesPage({
  initial,
  initialError
}: {
  initial: SalesDashboard | null;
  initialError: string | null;
}) {
  const [preset, setPreset] = useState<SalesPreset>(initial?.period.preset ?? "this_month");
  const [from, setFrom] = useState(initial?.period.from ?? "");
  const [to, setTo] = useState(initial?.period.to ?? "");
  const [data, setData] = useState<SalesDashboard | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [year, setYear] = useState(() => Number((initial?.period.from ?? "2026-10-01").slice(0, 4)));
  const [month, setMonth] = useState(() => Number((initial?.period.from ?? "2026-10-01").slice(5, 7)));
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [artistFilter, setArtistFilter] = useState<string[]>([]);
  const [excelBusy, setExcelBusy] = useState(false);

  const load = useCallback(async (nextPreset: SalesPreset, nextFrom?: string, nextTo?: string) => {
    setRefreshing(true);
    setError(null);
    const params = new URLSearchParams({ preset: nextPreset });
    if (nextPreset === "custom" && nextFrom && nextTo) {
      params.set("from", nextFrom);
      params.set("to", nextTo);
    }
    try {
      const res = await fetch(`/api/admin/sales?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as SalesDashboard);
      setPreset(nextPreset);
      setFrom(json.period.from);
      setTo(json.period.to);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/artists")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setStaff(json.ok ? (json.artists as Staff[]) : []);
      })
      .catch(() => {
        if (!cancelled) setStaff([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [staffOpen, setStaffOpen] = useState(false);
  const showIncentive = useMemo(() => (data?.artists ?? []).some((a) => a.incentive != null), [data]);
  const emptyCompleted = data != null && data.summary.completedCount === 0;
  const setupEmpty = staff != null && staff.length === 0;
  const s = data?.summary;
  const a = data?.attrition;
  const visibleArtists = useMemo(() => {
    const rows = data?.artists ?? [];
    if (artistFilter.length === 0) return rows;
    return rows.filter((r) => r.artistId != null && artistFilter.includes(r.artistId));
  }, [data, artistFilter]);

  const downloadExcel = async () => {
    if (excelBusy) return;
    setExcelBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      const res = await fetch(`/api/admin/export?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "다운로드에 실패했습니다.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const filename = utfMatch ? decodeURIComponent(utfMatch[1]) : `헤어업_${year}년${pad2(month)}월_마감자료.xlsx`;
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
      setExcelBusy(false);
    }
  };

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <div className="sticky top-0 z-20 bg-white pt-[63px]">
      <FinanceHeader embedded />

      <Toolbar
        className="mt-[38px]"
        left={
          <>
            <MonthPicker
              year={year}
              month={month}
              width={179}
              label={`${year}.${pad2(month)}`}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
                const range = monthBounds(y, m);
                void load("custom", range.from, range.to);
              }}
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setStaffOpen((v) => !v)}
                className="flex h-[34px] w-[186px] items-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white pl-3 pr-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
              >
                <Icon src="/admin-icons/lnb/filter.png" className="h-[15px] w-[15px] text-[#9A948C]" />
                <span className={clsx(TRIM_KR, "ml-2")}>담당자</span>
                <span className="ml-2 inline-flex h-[28px] w-[29px] items-center justify-center bg-[#F3EFEA] text-[12px] font-semibold text-[#9A948C]">
                  <span className={TRIM_KR}>{artistFilter.length}</span>
                </span>
                <span className={clsx(TRIM_KR, "ml-2")}>선택</span>
                <Icon
                  src={
                    staffOpen || artistFilter.length > 0
                      ? "/admin-icons/lnb/chevron-down-bold.png"
                      : "/admin-icons/lnb/chevron-down.png"
                  }
                  className={clsx("ml-auto h-[16px] w-[16px] text-[#9A948C]", staffOpen && "rotate-180")}
                />
              </button>
              {staffOpen ? (
                <div className="absolute left-0 top-[40px] z-30 min-w-full rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
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
                            onChange={(next) =>
                              setArtistFilter((cur) =>
                                next ? [...cur, person.id] : cur.filter((id) => id !== person.id)
                              )
                            }
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
            <RefreshButton spinning={refreshing} onClick={() => void load(preset, from, to)} />
          </>
        }
        right={
          <button
            type="button"
            disabled={excelBusy}
            onClick={() => void downloadExcel()}
            className="inline-flex h-[34px] items-center gap-[6px] rounded-[8px] border-[1.5px] border-[#C9C3BB] bg-white px-[12px] text-[13px] font-semibold leading-none text-[#1C1C1C] hover:bg-[#F6F4F0] disabled:opacity-40"
          >
            <svg viewBox="0 0 16 16" className="h-[14px] w-[14px]" fill="none" aria-hidden="true">
              <path d="M8 2.2v7.2M5.2 6.8 8 9.6l2.8-2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3.2 11.2v1.4c0 .6.5 1 1.1 1h7.4c.6 0 1.1-.4 1.1-1v-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className={TRIM_KR}>엑셀 다운로드</span>
          </button>
        }
      />

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}
      </div>

      {setupEmpty ? (
        <div className="flex flex-col items-center" style={{ marginTop: 188 }}>
          <p className={`text-center text-[16px] font-bold leading-[16px] text-[#1C1A19] ${TRIM_KR}`}>
            매장 기본 설정을 먼저 완료해 주세요.
          </p>
          <p className={`mt-[13px] text-center text-[14px] font-normal leading-[21px] text-[#807B77] ${TRIM_KR}`}>
            매장 정보와 디자이너가 등록되어야 매출 데이터를 집계할 수 있습니다.
          </p>
          <Link
            href="/admin/settings"
            className="mt-[35px] flex h-[45px] w-[186px] items-center justify-center rounded-[4px] bg-[#2C3A2E] text-white"
          >
            <span className={`text-[15px] font-bold leading-[15px] ${TRIM_KR}`}>매장 설정 바로가기</span>
          </Link>
        </div>
      ) : null}

      {!setupEmpty && refreshing && !data ? <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p> : null}

      {!setupEmpty && data && s && a ? (
          <StatStrip
            items={[
              { label: "총 매출", value: won(s.totalRevenue), hint: `직전 기간 대비 ${pct(s.revenueChangeRate)}` },
              {
                label: "완료 건수",
                value: `${s.completedCount.toLocaleString("ko-KR")}건`,
                hint:
                  s.missingAmountCount > 0
                    ? `금액 미입력 ${s.missingAmountCount}건 제외`
                    : `직전 대비 ${s.completedChange >= 0 ? "+" : ""}${s.completedChange}건`
              },
              { label: "객단가", value: won(s.avgTicket), hint: "총 매출 ÷ 완료 건수" },
              {
                label: "취소 · 노쇼",
                value: `${a.cancelledCount} · ${a.noshowCount}건`,
                hint: `예약 ${a.totalBookings}건 중 ${a.cancelledRate.toFixed(1)}% · ${a.noshowRate.toFixed(1)}%`,
                tone: a.noshowHigh ? "danger" : undefined
              },
              {
                label: "현금영수증 미발급",
                value: `${s.receiptWarningCount.toLocaleString("ko-KR")}건`,
                hint: s.receiptWarningCount > 0 ? "10만원 이상 현금·이체 →" : "해당 없음",
                tone: s.receiptWarningCount > 0 ? "danger" : undefined,
                href: s.receiptWarningCount > 0 ? "/admin/bookings" : undefined
              }
            ]}
          />
      ) : null}

      {!setupEmpty && data && s && a ? (
        <>
          <Section title="일별 매출" meta={emptyCompleted ? undefined : `${data.daily.length}일`}>
            {emptyCompleted ? (
              <Empty>해당 기간에 완료된 예약이 없습니다.</Empty>
            ) : (
              <div className="mt-4 h-[260px] border-b border-[#F3EFEA] pb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortChartDate}
                      tick={{ fontSize: 13, fill: "#9A948C" }}
                      axisLine={{ stroke: "#C9C3BB" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v: number) => (v >= 10000 ? `${Math.round(v / 10000)}만` : v.toLocaleString("ko-KR"))}
                      tick={{ fontSize: 13, fill: "#9A948C" }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      cursor={{ fill: "#F6F4F0" }}
                      formatter={(value) => [won(Number(value ?? 0)), "매출"]}
                      labelFormatter={(label) => String(label)}
                      contentStyle={{ border: "1px solid #EFEBE6", borderRadius: 8, fontSize: 14 }}
                    />
                    <Bar dataKey="revenue" fill="#2F3A2F" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          <div className="grid grid-cols-[3fr_2fr] gap-12">
            <Section title="디자이너별 매출" meta={`${visibleArtists.length}명`}>
              <table className="mt-4 w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className={clsx(TH, "pl-1")}>디자이너</th>
                    <th className={clsx(TH, "text-right")}>매출</th>
                    <th className={clsx(TH, "w-[64px] text-right")}>건수</th>
                    <th className={clsx(TH, "text-right")}>객단가</th>
                    <th className={clsx(TH, "w-[72px] text-right")}>비중</th>
                    {showIncentive ? <th className={clsx(TH, "pr-0 text-right")}>예상 인센티브</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleArtists.map((r) => (
                    <tr key={`${r.artistId ?? r.artistName}`} className={TABLE_ROW}>
                      <td className={clsx(TD, "truncate pl-1")}>{r.artistName}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(r.revenue)}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{r.count}</td>
                      <td className={clsx(TD, "text-right tabular-nums")}>{won(r.avgTicket)}</td>
                      <td className={clsx(TD, "text-right tabular-nums text-[#8A847C]")}>{r.share.toFixed(1)}%</td>
                      {showIncentive ? (
                        <td className={clsx(TD, "pr-0 text-right tabular-nums")}>
                          {r.incentive != null && r.commissionRate != null ? (
                            <>
                              {won(r.incentive)}
                              <span className="ml-1 text-[13px] text-[#8A847C]">{r.commissionRate}%</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleArtists.length === 0 ? <Empty>해당 기간에 완료된 예약이 없습니다.</Empty> : null}
            </Section>

            <div>
              <Section title="결제수단">
                <ul className="mt-4 border-t-[1.5px] border-[#C9C3BB]">
                  {data.methods.map((m) => (
                    <li key={m.method} className="border-b border-[#F3EFEA] py-[15px]">
                      <div className="flex items-baseline justify-between text-[16px] font-medium">
                        <span>{m.label}</span>
                        <span className="tabular-nums">
                          {won(m.amount)}
                          <span className="ml-2 text-[13px] font-normal text-[#8A847C]">
                            {m.count}건 · {m.share.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                      <ShareBar share={m.share} />
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="많이 받은 시술" meta={data.services.length ? `${data.services.length}종` : undefined} className="mt-10">
                {data.services.length === 0 ? (
                  <Empty>완료된 시술이 없습니다.</Empty>
                ) : (
                  <ol className="mt-4 border-t-[1.5px] border-[#C9C3BB]">
                    {data.services.slice(0, 8).map((sv, i) => (
                      <li key={sv.name} className="flex items-center justify-between border-b border-[#F3EFEA] py-[15px] text-[16px] font-medium">
                        <span className="min-w-0 truncate">
                          <span className="mr-3 inline-block w-[16px] text-[#9A948C] tabular-nums">{i + 1}</span>
                          {sv.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-[#8A847C]">{sv.count}건</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
