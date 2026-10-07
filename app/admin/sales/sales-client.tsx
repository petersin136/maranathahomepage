"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { clsx } from "clsx";
import FinanceNav from "@/components/admin/FinanceNav";
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
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
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
      setFrom(json.period.from);
      setTo(json.period.to);
      if (nextPreset === "custom") {
        setCustomFrom(json.period.from);
        setCustomTo(json.period.to);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const emptyCompleted = data != null && data.summary.completedCount === 0;
  const showIncentive = useMemo(
    () => (data?.artists ?? []).some((a) => a.incentive != null),
    [data]
  );

  return (
    <div className="font-sans-kr text-[#1C1C1C]">
      <FinanceNav />
      <h1 className="mt-8 flex items-baseline gap-2 text-[30px] font-bold leading-none tracking-[-0.02em]">
        매출
        <span className="text-[15px] font-normal text-[#8A847C]">
          {from && to ? `${from} ~ ${to}` : "매출 현황"}
          {refreshing ? " · 갱신 중" : ""}
        </span>
      </h1>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setPreset(p.key);
              if (p.key !== "custom") void load(p.key);
            }}
            className={clsx(
              "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold",
              preset === p.key
                ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                : "border-[#9A948C] bg-white text-[#1C1C1C]"
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
          <label className="text-[13px] font-bold text-[#9A948C]">
            시작
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-1.5 block h-[36px] rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-2.5 text-[14px] font-bold text-[#1C1C1C] outline-none"
            />
          </label>
          <label className="text-[13px] font-bold text-[#9A948C]">
            종료
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-1.5 block h-[36px] rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-2.5 text-[14px] font-bold text-[#1C1C1C] outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-[36px] items-center rounded-[8px] bg-[#2F3A2F] px-4 text-[14px] font-bold text-white"
          >
            조회
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-6 text-[13px] text-[#E24B4B]">{error}</p> : null}
      {refreshing && !data ? (
        <p className="mt-6 text-[14px] text-[#8A847C]">불러오는 중…</p>
      ) : null}

      {data ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 min-[1440px]:grid-cols-4">
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
              className="block rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-5 py-5 transition hover:bg-[#F6F4F0]"
            >
              <p className="text-[15px] font-bold text-[#9A948C]">현금영수증 미발급</p>
              <p
                className={clsx(
                  "mt-4 text-[30px] font-bold leading-none",
                  data.summary.receiptWarningCount > 0 ? "text-[#E24B4B]" : "text-[#1C1C1C]"
                )}
              >
                {data.summary.receiptWarningCount.toLocaleString("ko-KR")}
              </p>
              <p
                className={clsx(
                  "mt-2 text-[13px]",
                  data.summary.receiptWarningCount > 0 ? "text-[#E24B4B]" : "text-[#8A847C]"
                )}
              >
                {data.summary.receiptWarningCount > 0
                  ? "10만원 이상 현금·이체 · 예약 목록"
                  : "해당 없음 · 예약 목록"}
              </p>
            </Link>
          </div>

          {emptyCompleted ? (
            <p className="mt-10 py-16 text-center text-[15px] font-medium text-[#8A847C]">
              해당 기간에 완료된 예약이 없습니다
            </p>
          ) : (
            <div className="mt-10 flex flex-col gap-8">
              <section className="overflow-hidden rounded-[12px] border border-[#E4E0DA] bg-white">
                <h2 className="border-b border-[#E4E0DA] bg-[#F9F8F4] px-6 py-4 text-[18px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  일별 매출 추이
                </h2>
                <div className="h-[280px] px-3 py-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortChartDate}
                        tick={{ fontSize: 13, fill: "#9A948C" }}
                        axisLine={{ stroke: "#E4E0DA" }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                        tick={{ fontSize: 13, fill: "#9A948C" }}
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
                          border: "1px solid #E4E0DA",
                          borderRadius: 8,
                          fontSize: 14
                        }}
                      />
                      <Bar dataKey="revenue" fill="#2F3A2F" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="overflow-hidden rounded-[12px] border border-[#E4E0DA] bg-white">
                <h2 className="border-b border-[#E4E0DA] bg-[#F9F8F4] px-6 py-4 text-[18px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  결제수단별 비중
                </h2>
                <ul className="grid gap-4 px-6 py-6 min-[1440px]:grid-cols-3">
                  {data.methods.map((m) => (
                    <li key={m.method} className="rounded-[8px] bg-[#F9F8F4] px-5 py-5">
                      <p className="text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                        {m.label}
                      </p>
                      <p className="mt-3 text-[24px] font-bold leading-none tabular-nums">{won(m.amount)}</p>
                      <p className="mt-2 text-[14px] text-[#8A847C]">
                        {m.count.toLocaleString("ko-KR")}건 · {m.share.toFixed(1)}%
                      </p>
                      <div className="mt-4 h-[8px] rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[#2F3A2F]"
                          style={{ width: `${Math.min(100, Math.max(m.share, m.amount > 0 ? 2 : 0))}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="overflow-hidden rounded-[12px] border border-[#E4E0DA] bg-white">
                <h2 className="border-b border-[#E4E0DA] bg-[#F9F8F4] px-6 py-4 text-[18px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  디자이너별 매출
                </h2>
                {data.artists.length === 0 ? (
                  <p className="px-6 py-10 text-[15px] font-medium text-[#8A847C]">
                    해당 기간에 완료된 예약이 없습니다
                  </p>
                ) : (
                  <div className="overflow-x-auto px-6">
                    <table className="w-full text-left text-[16px] font-medium leading-[20px]">
                      <thead>
                        <tr className="border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]">
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
                          <tr key={`${a.artistId ?? a.artistName}`} className="border-b border-[#F3EFEA]">
                            <td className="py-[15px] pr-3">{a.artistName}</td>
                            <td className="py-[15px] pr-3 tabular-nums">{won(a.revenue)}</td>
                            <td className="py-[15px] pr-3 tabular-nums">{a.count}</td>
                            <td className="py-[15px] pr-3 tabular-nums">{won(a.avgTicket)}</td>
                            <td className="py-[15px] pr-3 tabular-nums">{a.share.toFixed(1)}%</td>
                            {showIncentive ? (
                              <td className="py-[15px] tabular-nums text-[#8A847C]">
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

              <section className="overflow-hidden rounded-[12px] border border-[#E4E0DA] bg-white">
                <h2 className="border-b border-[#E4E0DA] bg-[#F9F8F4] px-6 py-4 text-[18px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  시술별 선택 건수
                </h2>
                {data.services.length === 0 ? (
                  <p className="px-6 py-10 text-[15px] font-medium text-[#8A847C]">
                    해당 기간에 완료된 예약이 없습니다
                  </p>
                ) : (
                  <ul className="px-6">
                    {data.services.map((s, i) => (
                      <li
                        key={s.name}
                        className="flex items-center justify-between border-b border-[#F3EFEA] py-[15px] text-[16px] font-medium"
                      >
                        <span>
                          <span className="mr-3 text-[#9A948C]">{i + 1}</span>
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

          <section className="mt-8 overflow-hidden rounded-[12px] border border-[#E4E0DA] bg-white">
            <h2 className="flex items-baseline gap-2 border-b border-[#E4E0DA] bg-[#F9F8F4] px-6 py-4 text-[18px] font-bold leading-none">
              <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">취소 / 노쇼</span>
              <span className="text-[15px] font-normal text-[#8A847C]">
                예약일 기준 · 전체 {data.attrition.totalBookings.toLocaleString("ko-KR")}건
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-4 px-6 py-6">
              <div className="rounded-[8px] bg-[#F9F8F4] px-5 py-5">
                <p className="text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  취소
                </p>
                <p className="mt-3 text-[30px] font-bold leading-none">
                  {data.attrition.cancelledCount.toLocaleString("ko-KR")}
                </p>
                <p className="mt-2 text-[14px] text-[#8A847C]">
                  전체 대비 {data.attrition.cancelledRate.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-[8px] bg-[#F9F8F4] px-5 py-5">
                <p className="text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  노쇼
                </p>
                <p
                  className={clsx(
                    "mt-3 text-[30px] font-bold leading-none",
                    data.attrition.noshowHigh && "text-[#E24B4B]"
                  )}
                >
                  {data.attrition.noshowCount.toLocaleString("ko-KR")}
                </p>
                <p
                  className={clsx(
                    "mt-2 text-[14px]",
                    data.attrition.noshowHigh ? "text-[#E24B4B]" : "text-[#8A847C]"
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
    <div className="rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-5 py-5">
      <p className="text-[15px] font-bold text-[#9A948C]">{label}</p>
      <p className="mt-4 text-[30px] font-bold leading-none">{value}</p>
      <p className="mt-2 text-[13px] text-[#8A847C]">{hint}</p>
    </div>
  );
}
