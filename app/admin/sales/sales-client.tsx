"use client";

import { useCallback, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ChipDropdown,
  Empty,
  FinanceHeader,
  INPUT,
  PanelOption,
  PrimaryButton,
  RefreshButton,
  Section,
  ShareBar,
  StatStrip,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  Toolbar,
  pct,
  won
} from "@/components/admin/finance-ui";
import { AdminDatePicker } from "@/components/admin/AdminDatePicker";
import type { SalesDashboard, SalesPreset } from "@/lib/admin/sales-data";

const PRESETS: { key: SalesPreset; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "this_week", label: "이번 주" },
  { key: "this_month", label: "이번 달" },
  { key: "last_month", label: "지난 달" }
];

function shortChartDate(ymd: string) {
  return ymd.length >= 10 ? `${ymd.slice(5, 7)}/${ymd.slice(8, 10)}` : ymd;
}

function dotted(ymd: string) {
  return ymd ? ymd.slice(2).replaceAll("-", ". ") : "";
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
  const [customFrom, setCustomFrom] = useState(initial?.period.from ?? "");
  const [customTo, setCustomTo] = useState(initial?.period.to ?? "");
  const [data, setData] = useState<SalesDashboard | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshing, setRefreshing] = useState(false);

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
      setCustomFrom(json.period.from);
      setCustomTo(json.period.to);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const showIncentive = useMemo(() => (data?.artists ?? []).some((a) => a.incentive != null), [data]);
  const emptyCompleted = data != null && data.summary.completedCount === 0;
  const presetLabel = PRESETS.find((p) => p.key === preset)?.label ?? "직접 선택";
  const s = data?.summary;
  const a = data?.attrition;

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <div className="sticky top-0 z-20 bg-white pt-10">
      <FinanceHeader embedded subtitle={from && to ? `${dotted(from)} ~ ${dotted(to)}` : undefined} />

      <Toolbar
        left={
          <>
            <ChipDropdown label={presetLabel}>
              {(close) => (
                <>
                  {PRESETS.map((p) => (
                    <PanelOption
                      key={p.key}
                      label={p.label}
                      selected={preset === p.key}
                      onClick={() => {
                        close();
                        void load(p.key);
                      }}
                    />
                  ))}
                  <form
                    className="mt-1 border-t border-[#F3EFEA] px-5 pb-2 pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!customFrom || !customTo) return;
                      close();
                      void load("custom", customFrom, customTo);
                    }}
                  >
                    <p className="text-[13px] font-bold text-[#9A948C]">직접 선택</p>
                    <div className="mt-2 flex items-center gap-2">
                      <AdminDatePicker
                        value={customFrom}
                        onChange={setCustomFrom}
                        ariaLabel="시작일"
                        className={clsx(INPUT, "w-[168px]")}
                      />
                      <span className="text-[#9A948C]">~</span>
                      <AdminDatePicker
                        value={customTo}
                        onChange={setCustomTo}
                        ariaLabel="종료일"
                        className={clsx(INPUT, "w-[168px]")}
                      />
                    </div>
                    <PrimaryButton type="submit" className="mt-3 w-full">
                      조회
                    </PrimaryButton>
                  </form>
                </>
              )}
            </ChipDropdown>
            <RefreshButton
              spinning={refreshing}
              onClick={() => void load(preset, customFrom, customTo)}
            />
          </>
        }
      />

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}
      {refreshing && !data ? <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p> : null}

      {data && s && a ? (
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
      </div>

      {data && s && a ? (
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
            <Section title="디자이너별 매출" meta={`${data.artists.length}명`}>
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
                  {data.artists.map((r) => (
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
              {data.artists.length === 0 ? <Empty>해당 기간에 완료된 예약이 없습니다.</Empty> : null}
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
