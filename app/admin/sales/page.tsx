"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  SalesDashboard,
  SalesPreset
} from "@/lib/admin/sales-data";

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

  return (
    <div>
      <h1 className="font-serif text-[28px] tracking-[0.06em] lg:text-[32px]">SALES</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">
        매출 현황
        {from && to ? ` · ${from} ~ ${to}` : ""}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-hu-black/10 lg:mt-8">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setPreset(p.key);
              if (p.key !== "custom") void load(p.key);
            }}
            className={clsx(
              "pb-3 font-serif text-[13px] tracking-[0.1em]",
              preset === p.key
                ? "border-b-2 border-hu-black text-hu-black"
                : "text-hu-muted"
            )}
          >
            {p.label}
          </button>
        ))}
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
          <label className="font-sans-kr text-[13px] text-hu-muted">
            시작
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-1.5 block h-9 border border-hu-black/20 bg-hu-white px-2.5 text-hu-black outline-none"
            />
          </label>
          <label className="font-sans-kr text-[13px] text-hu-muted">
            종료
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-1.5 block h-9 border border-hu-black/20 bg-hu-white px-2.5 text-hu-black outline-none"
            />
          </label>
          <button
            type="submit"
            className="h-9 bg-hu-black px-4 font-sans-kr text-[13px] text-white"
          >
            조회
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-6 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}
      {loading && !data ? (
        <p className="mt-6 font-sans-kr text-[13px] text-hu-muted">불러오는 중…</p>
      ) : null}

      {data ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:mt-8 lg:grid-cols-4 lg:gap-4">
            <SummaryCard
              label="총 매출"
              value={won(data.summary.totalRevenue)}
              hint={`직전 기간 대비 ${pct(data.summary.revenueChangeRate)}`}
            />
            <SummaryCard
              label="완료 건수"
              value={`${data.summary.completedCount.toLocaleString("ko-KR")}건`}
              hint={
                data.summary.missingAmountCount > 0
                  ? `직전 대비 ${data.summary.completedChange >= 0 ? "+" : ""}${data.summary.completedChange} · 금액 미입력 ${data.summary.missingAmountCount}건 제외`
                  : `직전 대비 ${data.summary.completedChange >= 0 ? "+" : ""}${data.summary.completedChange} · ${pct(data.summary.completedChangeRate)}`
              }
            />
            <SummaryCard
              label="객단가"
              value={won(data.summary.avgTicket)}
              hint="총매출 / 완료 건수"
            />
            <Link
              href="/admin/bookings"
              className="block bg-hu-white px-4 py-5 transition hover:bg-hu-beige/40 lg:px-5 lg:py-6"
            >
              <p className="font-serif text-[12px] tracking-[0.14em] text-hu-muted">
                현금영수증 미발급
              </p>
              <p
                className={clsx(
                  "mt-3 font-serif text-[28px] lg:text-[32px]",
                  data.summary.receiptWarningCount > 0
                    ? "text-[#9b4a4a]"
                    : "text-hu-muted"
                )}
              >
                {data.summary.receiptWarningCount.toLocaleString("ko-KR")}
              </p>
              <p
                className={clsx(
                  "mt-1 font-sans-kr text-[12px]",
                  data.summary.receiptWarningCount > 0
                    ? "text-[#9b4a4a]"
                    : "text-hu-muted"
                )}
              >
                {data.summary.receiptWarningCount > 0
                  ? "10만원 이상 현금·이체 · 예약 목록"
                  : "해당 없음 · 예약 목록"}
              </p>
            </Link>
          </div>

          {emptyCompleted ? (
            <p className="mt-10 bg-hu-white px-5 py-10 text-center font-sans-kr text-[13px] text-hu-muted">
              해당 기간에 완료된 예약이 없습니다
            </p>
          ) : (
            <>
              <section className="mt-10">
                <h2 className="font-serif text-[16px] tracking-[0.08em]">일별 매출 추이</h2>
                <div className="mt-4 h-[260px] bg-hu-white px-2 py-4 lg:px-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortChartDate}
                        tick={{ fontSize: 11, fill: "#666" }}
                        axisLine={{ stroke: "rgba(0,0,0,0.12)" }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                        tick={{ fontSize: 11, fill: "#666" }}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${Number(value ?? 0).toLocaleString("ko-KR")}원`,
                          "매출"
                        ]}
                        labelFormatter={(label) => `날짜 ${label}`}
                        contentStyle={{
                          border: "1px solid rgba(0,0,0,0.12)",
                          fontSize: 12
                        }}
                      />
                      <Bar dataKey="revenue" fill="#1c1a19" maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="mt-10">
                <h2 className="font-serif text-[16px] tracking-[0.08em]">결제수단별 비중</h2>
                <ul className="mt-4 divide-y divide-hu-black/10 bg-hu-white">
                  {data.methods.map((m) => (
                    <li key={m.method} className="px-5 py-4">
                      <div className="flex items-baseline justify-between gap-4 font-sans-kr text-[14px]">
                        <span>{m.label}</span>
                        <span className="text-hu-muted">
                          {won(m.amount)} · {m.count.toLocaleString("ko-KR")}건 · {m.share.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-hu-black/10">
                        <div
                          className="h-full bg-hu-black"
                          style={{ width: `${Math.min(100, m.share)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-10">
                <h2 className="font-serif text-[16px] tracking-[0.08em]">디자이너별 매출</h2>
                {data.artists.length === 0 ? (
                  <p className="mt-4 bg-hu-white px-5 py-8 font-sans-kr text-[13px] text-hu-muted">
                    해당 기간에 완료된 예약이 없습니다
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto bg-hu-white">
                    <table className="min-w-full text-left font-sans-kr text-[13px]">
                      <thead>
                        <tr className="border-b border-hu-black/10 text-hu-muted">
                          <th className="px-5 py-3 font-normal">디자이너</th>
                          <th className="px-5 py-3 font-normal">매출</th>
                          <th className="px-5 py-3 font-normal">건수</th>
                          <th className="px-5 py-3 font-normal">객단가</th>
                          <th className="px-5 py-3 font-normal">비중</th>
                          {showIncentive ? (
                            <th className="px-5 py-3 font-normal">예상 인센티브</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hu-black/10">
                        {data.artists.map((a) => (
                          <tr key={`${a.artistId ?? a.artistName}`}>
                            <td className="px-5 py-3">{a.artistName}</td>
                            <td className="px-5 py-3 tabular-nums">{won(a.revenue)}</td>
                            <td className="px-5 py-3 tabular-nums">{a.count}</td>
                            <td className="px-5 py-3 tabular-nums">{won(a.avgTicket)}</td>
                            <td className="px-5 py-3 tabular-nums">{a.share.toFixed(1)}%</td>
                            {showIncentive ? (
                              <td className="px-5 py-3 tabular-nums text-hu-muted">
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

              <section className="mt-10">
                <h2 className="font-serif text-[16px] tracking-[0.08em]">시술별 선택 건수</h2>
                {data.services.length === 0 ? (
                  <p className="mt-4 bg-hu-white px-5 py-8 font-sans-kr text-[13px] text-hu-muted">
                    해당 기간에 완료된 예약이 없습니다
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-hu-black/10 bg-hu-white">
                    {data.services.map((s, i) => (
                      <li
                        key={s.name}
                        className="flex items-center justify-between px-5 py-3 font-sans-kr text-[13px]"
                      >
                        <span>
                          <span className="mr-3 text-hu-muted">{i + 1}</span>
                          {s.name}
                        </span>
                        <span className="tabular-nums text-hu-muted">{s.count}건</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          <section className="mt-10">
            <h2 className="font-serif text-[16px] tracking-[0.08em]">취소 / 노쇼 현황</h2>
            <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
              예약일(booking_date) 기준 · 전체 {data.attrition.totalBookings.toLocaleString("ko-KR")}건
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-hu-white px-5 py-5">
                <p className="font-sans-kr text-[13px] text-hu-muted">취소</p>
                <p className="mt-2 font-serif text-[28px]">
                  {data.attrition.cancelledCount.toLocaleString("ko-KR")}
                </p>
                <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
                  전체 대비 {data.attrition.cancelledRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-hu-white px-5 py-5">
                <p className="font-sans-kr text-[13px] text-hu-muted">노쇼</p>
                <p
                  className={clsx(
                    "mt-2 font-serif text-[28px]",
                    data.attrition.noshowHigh && "text-[#9b4a4a]"
                  )}
                >
                  {data.attrition.noshowCount.toLocaleString("ko-KR")}
                </p>
                <p
                  className={clsx(
                    "mt-1 font-sans-kr text-[12px]",
                    data.attrition.noshowHigh ? "text-[#9b4a4a]" : "text-hu-muted"
                  )}
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
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-hu-white px-4 py-5 lg:px-5 lg:py-6">
      <p className="font-serif text-[12px] tracking-[0.14em] text-hu-muted">{label}</p>
      <p className="mt-3 font-serif text-[22px] leading-tight lg:text-[26px]">{value}</p>
      <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">{hint}</p>
    </div>
  );
}
