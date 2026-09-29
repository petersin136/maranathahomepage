"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminChart,
  adminColor,
  adminLayout,
  adminSize,
  adminTrend,
  adminType
} from "@/lib/admin/design-tokens";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  SalesDashboard,
  SalesPreset
} from "@/lib/admin/sales-data";

/** 고객관리 검색·필터 칩 테두리 두께. 토큰 목록에는 없다. */
const controlBorder = `1.5px solid ${adminColor.label}`;

const cardStyle = {
  background: adminColor.surface,
  borderRadius: adminLayout.cardRadius,
  boxShadow: adminLayout.cardShadow,
  padding: adminLayout.cardPadding
};

const statCardStyle = {
  ...cardStyle,
  minHeight: "100px"
};

const sectionTitleStyle = {
  ...adminType.tableHead,
  color: adminColor.ink,
  marginBottom: adminLayout.cardGap
};

function px(value: string) {
  return Number.parseInt(value, 10);
}

const cellStyle = {
  ...adminType.tableCell,
  color: adminColor.ink,
  paddingTop: adminSize.tableCellPaddingY,
  paddingBottom: adminSize.tableCellPaddingY
};

const PRESETS: { key: SalesPreset; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "this_week", label: "이번 주" },
  { key: "this_month", label: "이번 달" },
  { key: "last_month", label: "지난 달" },
  { key: "custom", label: "직접 선택" }
];

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function pct(value: number | null, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function shortChartDate(ymd: string) {
  return ymd.length >= 10 ? `${ymd.slice(5, 7)}/${ymd.slice(8, 10)}` : ymd;
}

function trendColor(value: number | null | undefined) {
  if (value == null || value === 0) return adminTrend.flat;
  return value > 0 ? adminTrend.up : adminTrend.down;
}

function chartOpacity(value: number, max: number) {
  if (max <= 0 || value <= 0) return 0.2;
  return 0.35 + 0.65 * (value / max);
}

export default function AdminSalesPage() {
  const [preset, setPreset] = useState<SalesPreset>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<SalesDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextPreset: SalesPreset, nextFrom?: string, nextTo?: string) => {
    setLoading(true);
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
      setFrom(json.period.from);
      setTo(json.period.to);
      if (nextPreset === "custom") {
        setCustomFrom(json.period.from);
        setCustomTo(json.period.to);
      }
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("this_month");
  }, [load]);

  const emptyCompleted = data != null && data.summary.completedCount === 0;
  const showIncentive = useMemo(
    () => (data?.artists ?? []).some((a) => a.incentive != null),
    [data]
  );

  const maxDaily = Math.max(0, ...(data?.daily ?? []).map((d) => d.revenue));

  return (
    <div
      className="font-sans-kr -mx-5 -my-6 min-h-[100dvh] px-5 py-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8 min-[1440px]:-mx-10 min-[1440px]:-my-10 min-[1440px]:px-10 min-[1440px]:py-10"
      style={{ background: adminLayout.pageBg, color: adminColor.ink }}
    >
      <h1 className="mt-8 flex items-baseline gap-2 leading-none tracking-[-0.02em]">
        <span style={adminType.pageTitle}>매출</span>
        <span style={{ ...adminType.pageCount, color: adminColor.muted }}>
          {from && to ? `${from} ~ ${to}` : "매출 현황"}
        </span>
      </h1>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const on = preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPreset(p.key);
                if (p.key !== "custom") void load(p.key);
              }}
              className="inline-flex items-center px-3"
              style={{
                height: adminSize.buttonHeight,
                borderRadius: adminSize.buttonRadius,
                ...adminType.button,
                background: on ? adminColor.accent : adminColor.surface,
                color: on ? adminColor.surface : adminColor.ink,
                border: on ? `1.5px solid ${adminColor.accent}` : controlBorder
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {preset === "custom" ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!customFrom || !customTo) return;
            void load("custom", customFrom, customTo);
          }}
        >
          <label style={{ ...adminType.button, color: adminColor.label }}>
            시작
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-2 block px-2.5 outline-none"
              style={{
                height: adminSize.buttonHeight,
                borderRadius: adminSize.buttonRadius,
                border: controlBorder,
                background: adminColor.surface,
                ...adminType.button,
                color: adminColor.ink
              }}
            />
          </label>
          <label style={{ ...adminType.button, color: adminColor.label }}>
            종료
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-2 block px-2.5 outline-none"
              style={{
                height: adminSize.buttonHeight,
                borderRadius: adminSize.buttonRadius,
                border: controlBorder,
                background: adminColor.surface,
                ...adminType.button,
                color: adminColor.ink
              }}
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center px-4"
            style={{
              height: adminSize.buttonHeight,
              borderRadius: adminSize.buttonRadius,
              background: adminColor.accent,
              ...adminType.button,
              color: adminColor.surface
            }}
          >
            조회
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-6" style={{ ...adminType.pageCount, color: adminTrend.down }}>
          {error}
        </p>
      ) : null}
      {loading && !data ? (
        <p className="mt-6" style={{ ...adminType.pageCount, color: adminColor.muted }}>
          불러오는 중…
        </p>
      ) : null}

      {data ? (
        <>
          <div
            className="mt-8 grid grid-cols-2 min-[1440px]:grid-cols-4"
            style={{ gap: adminLayout.cardGap }}
          >
            <SummaryCard
              label="총 매출"
              value={won(data.summary.totalRevenue)}
              hint={`직전 기간 대비 ${pct(data.summary.revenueChangeRate)}`}
              trend={data.summary.revenueChangeRate}
            />
            <SummaryCard
              label="완료 건수"
              value={`${data.summary.completedCount.toLocaleString("ko-KR")}건`}
              hint={
                data.summary.missingAmountCount > 0
                  ? `직전 대비 ${data.summary.completedChange >= 0 ? "+" : ""}${data.summary.completedChange} · 금액 미입력 ${data.summary.missingAmountCount}건 제외`
                  : `직전 대비 ${data.summary.completedChange >= 0 ? "+" : ""}${data.summary.completedChange} · ${pct(data.summary.completedChangeRate)}`
              }
              trend={data.summary.completedChange}
            />
            <SummaryCard
              label="객단가"
              value={won(data.summary.avgTicket)}
              hint="총매출 / 완료 건수"
            />
            <Link href="/admin/bookings" className="block" style={statCardStyle}>
              <p style={adminLayout.statLabel}>현금영수증 미발급</p>
              <p
                className="mt-4"
                style={{
                  ...adminLayout.statNumber,
                  color:
                    data.summary.receiptWarningCount > 0 ? adminChart.warning : adminLayout.statNumber.color
                }}
              >
                {data.summary.receiptWarningCount.toLocaleString("ko-KR")}
              </p>
              <p className="mt-2" style={{ ...adminType.pageCount, color: adminColor.muted }}>
                {data.summary.receiptWarningCount > 0
                  ? "10만원 이상 현금·이체 · 예약 목록"
                  : "해당 없음 · 예약 목록"}
              </p>
            </Link>
          </div>

          {emptyCompleted ? (
            <p className="mt-10 py-16 text-center" style={{ ...adminType.pageCount, color: adminColor.muted }}>
              해당 기간에 완료된 예약이 없습니다
            </p>
          ) : (
            <div className="flex flex-col" style={{ marginTop: adminLayout.cardGap, gap: adminLayout.cardGap }}>
              <section style={cardStyle}>
                <h2 style={sectionTitleStyle}>일별 매출 추이</h2>
                <div className="h-[280px] px-3 py-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortChartDate}
                        tick={{ fontSize: px(adminType.tableHead.fontSize), fill: adminColor.label }}
                        axisLine={{ stroke: adminColor.ruleStrong }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                        tick={{ fontSize: px(adminType.tableHead.fontSize), fill: adminColor.label }}
                        axisLine={false}
                        tickLine={false}
                        width={64}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${Number(value ?? 0).toLocaleString("ko-KR")}원`,
                          "매출"
                        ]}
                        labelFormatter={(label) => `날짜 ${label}`}
                        contentStyle={{
                          border: `1px solid ${adminColor.rule}`,
                          borderRadius: px(adminSize.buttonRadius),
                          fontSize: px(adminType.button.fontSize),
                          color: adminColor.ink
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        radius={[px(adminSize.navItemRadius), px(adminSize.navItemRadius), 0, 0]}
                        maxBarSize={28}
                      >
                        {data.daily.map((d) => (
                          <Cell
                            key={d.date}
                            fill={adminChart.color}
                            fillOpacity={chartOpacity(d.revenue, maxDaily)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section style={cardStyle}>
                <h2 style={sectionTitleStyle}>결제수단별 비중</h2>
                <ul className="grid min-[1440px]:grid-cols-3">
                  {data.methods.map((m) => (
                    <li key={m.method}>
                      <p style={{ ...adminType.tableHead, color: adminColor.label }}>{m.label}</p>
                      <p className="mt-3 tabular-nums" style={adminLayout.statNumber}>
                        {won(m.amount)}
                      </p>
                      <p className="mt-2" style={{ ...adminType.pageCount, color: adminColor.muted }}>
                        {m.count.toLocaleString("ko-KR")}건 · {m.share.toFixed(1)}%
                      </p>
                      <div
                        className="mt-4 h-[8px] rounded-full"
                        style={{ background: adminColor.rule }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(m.share, m.amount > 0 ? 2 : 0))}%`,
                            background: adminChart.color,
                            opacity: chartOpacity(m.share, 100)
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section style={cardStyle}>
                <h2 style={sectionTitleStyle}>디자이너별 매출</h2>
                {data.artists.length === 0 ? (
                  <p className="px-6 py-10" style={{ ...adminType.pageCount, color: adminColor.muted }}>
                    해당 기간에 완료된 예약이 없습니다
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left" style={{ lineHeight: "20px" }}>
                      <thead>
                        <tr
                          style={{
                            ...adminType.tableHead,
                            color: adminColor.label,
                            borderBottom: `1.5px solid ${adminColor.ruleStrong}`
                          }}
                        >
                          <th className="py-3 font-bold">디자이너</th>
                          <th className="py-3 font-bold">매출</th>
                          <th className="py-3 font-bold">건수</th>
                          <th className="py-3 font-bold">객단가</th>
                          <th className="py-3 font-bold">비중</th>
                          {showIncentive ? <th className="py-3 font-bold">예상 인센티브</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {data.artists.map((a) => (
                          <tr
                            key={`${a.artistId ?? a.artistName}`}
                            style={{ borderBottom: `1px solid ${adminColor.rule}` }}
                          >
                            <td className="pr-3" style={cellStyle}>{a.artistName}</td>
                            <td className="pr-3 tabular-nums" style={cellStyle}>{won(a.revenue)}</td>
                            <td className="pr-3 tabular-nums" style={cellStyle}>{a.count}</td>
                            <td className="pr-3 tabular-nums" style={cellStyle}>{won(a.avgTicket)}</td>
                            <td className="pr-3 tabular-nums" style={cellStyle}>{a.share.toFixed(1)}%</td>
                            {showIncentive ? (
                              <td className="tabular-nums" style={{ ...cellStyle, color: adminColor.muted }}>
                                {a.incentive != null && a.commissionRate != null
                                  ? `${a.commissionRate}% · ${won(a.incentive)}`
                                  : "—"}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section style={cardStyle}>
                <h2 style={sectionTitleStyle}>시술별 선택 건수</h2>
                {data.services.length === 0 ? (
                  <p className="px-6 py-10" style={{ ...adminType.pageCount, color: adminColor.muted }}>
                    해당 기간에 완료된 예약이 없습니다
                  </p>
                ) : (
                  <ul>
                    {data.services.map((s, i) => (
                      <li
                        key={s.name}
                        className="flex items-center justify-between"
                        style={{
                          ...adminType.tableCell,
                          color: adminColor.ink,
                          paddingTop: adminSize.tableCellPaddingY,
                          paddingBottom: adminSize.tableCellPaddingY,
                          borderBottom: `1px solid ${adminColor.rule}`
                        }}
                      >
                        <span>
                          <span className="mr-3" style={{ color: adminColor.label }}>
                            {i + 1}
                          </span>
                          {s.name}
                        </span>
                        <span className="tabular-nums">{s.count}건</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          <section style={{ ...cardStyle, marginTop: adminLayout.cardGap }}>
            <h2 className="flex items-baseline gap-2" style={sectionTitleStyle}>
              <span>취소 / 노쇼</span>
              <span style={{ ...adminType.pageCount, color: adminColor.muted }}>
                예약일 기준 · 전체 {data.attrition.totalBookings.toLocaleString("ko-KR")}건
              </span>
            </h2>
            <div className="grid grid-cols-2">
              <div>
                <p style={{ ...adminType.tableHead, color: adminColor.label }}>취소</p>
                <p className="mt-3" style={adminLayout.statNumber}>
                  {data.attrition.cancelledCount.toLocaleString("ko-KR")}
                </p>
                <p className="mt-2" style={{ ...adminType.pageCount, color: adminColor.muted }}>
                  전체 대비 {data.attrition.cancelledRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p style={{ ...adminType.tableHead, color: adminColor.label }}>노쇼</p>
                <p
                  className="mt-3"
                  style={{
                    ...adminLayout.statNumber,
                    color: data.attrition.noshowHigh ? adminChart.warning : adminLayout.statNumber.color
                  }}
                >
                  {data.attrition.noshowCount.toLocaleString("ko-KR")}
                </p>
                <p
                  className="mt-2"
                  style={{
                    ...adminType.pageCount,
                    color: data.attrition.noshowHigh ? adminChart.warning : adminColor.muted
                  }}
                >
                  전체 대비 {data.attrition.noshowRate.toFixed(1)}%
                  {data.attrition.noshowHigh ? " · 10% 초과" : ""}
                </p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  trend
}: {
  label: string;
  value: string;
  hint: string;
  trend?: number | null;
}) {
  return (
    <div style={statCardStyle}>
      <p style={adminLayout.statLabel}>{label}</p>
      <p className="mt-4" style={adminLayout.statNumber}>{value}</p>
      <p className="mt-2" style={{ ...adminType.pageCount, color: trendColor(trend) }}>
        {hint}
      </p>
    </div>
  );
}
