"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { WEEKDAY_LABELS } from "@/lib/admin/customers-data";
import Link from "next/link";
import { customerProfileHref, useCustomerFilters } from "@/components/admin/CustomerFilters";

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function heatOpacity(count: number, max: number) {
  if (max <= 0 || count <= 0) return 0.04;
  return 0.08 + (count / max) * 0.72;
}

export default function AdminCustomerDashboardPage() {
  const { data, loading, error, setError } = useCustomerFilters();
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const hours = useMemo(() => {
    const set = new Set((data?.heatmap.cells ?? []).map((c) => c.hour));
    return [...set].sort((a, b) => a - b);
  }, [data]);

  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data?.heatmap.cells ?? []) {
      map.set(`${c.weekday}-${c.hour}`, c.count);
    }
    return map;
  }, [data]);

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      window.setTimeout(() => {
        setCopiedPhone((cur) => (cur === phone ? null : cur));
      }, 1500);
    } catch {
      setError("전화번호 복사에 실패했습니다.");
    }
  };

  return (
    <div className="insight-page font-pc-kr text-text1">
      {error ? <p className="mt-4 text-pc-base text-danger">{error}</p> : null}
      {loading && !data ? <p className="mt-6 text-pc-base text-text3">불러오는 중…</p> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-4 min-[1440px]:grid-cols-4">
            <Stat label="총 고객" value={data.summary.totalCustomers.toLocaleString("ko-KR")} unit="명" />
            <Stat
              label="재방문 고객"
              value={data.summary.returningCustomers.toLocaleString("ko-KR")}
              unit="명"
              hint={`재방문율 ${data.summary.returningRate.toFixed(1)}%`}
            />
            <Stat
              label="이번 달 신규"
              value={data.summary.newCustomersThisMonth.toLocaleString("ko-KR")}
              unit="명"
            />
            <Stat
              label="평균 방문 주기"
              value={data.summary.avgCycleDays != null ? String(Math.round(data.summary.avgCycleDays)) : "—"}
              unit={data.summary.avgCycleDays != null ? "일" : undefined}
              hint="재방문 고객 기준"
            />
          </div>

          <section className="float-card mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-dash-section font-bold text-dash-ink">이탈 위험 고객</h2>
              <p className="text-pc-base text-text2">
                {data.churn.contactCount.toLocaleString("ko-KR")}명에게 연락하면 예상 회복 매출{" "}
                <span className="font-bold text-dash-ink">{won(data.churn.expectedRecoverRevenue)}</span>
              </p>
            </div>
            {data.churn.customers.length === 0 ? (
              <p className="insight-empty">이탈 위험으로 분류된 고객이 없습니다</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="insight-table">
                  <thead>
                    <tr>
                      <th>고객명</th>
                      <th>전화번호</th>
                      <th>마지막 방문</th>
                      <th className="is-right">경과일</th>
                      <th className="is-right">방문</th>
                      <th className="is-right">누적 매출</th>
                      <th>주 담당</th>
                      <th>마지막 시술</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.churn.customers.map((c) => (
                      <tr key={c.phone}>
                        <td className="font-semibold">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={clsx("inline-block h-[6px] w-[6px] rounded-full", c.highValue && "bg-dash-ink")}
                              title={c.highValue ? "누적 매출 상위 20%" : undefined}
                            />
                            <Link href={customerProfileHref(c.phone)} className="hover:underline">
                              {c.name}
                            </Link>
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => void copyPhone(c.phone)}
                            className="tabular-nums text-text2 underline-offset-2 hover:underline"
                            title="전화번호 복사"
                          >
                            {copiedPhone === c.phone ? "복사됨" : c.phone}
                          </button>
                        </td>
                        <td className="tabular-nums text-text2">{c.lastVisitDate.slice(2)}</td>
                        <td className="is-right tabular-nums font-semibold text-danger">{c.daysSince}일</td>
                        <td className="is-right tabular-nums">{c.visitCount}회</td>
                        <td className="is-right tabular-nums font-semibold">{won(c.lifetimeRevenue)}</td>
                        <td className="text-text2">{c.primaryArtistName}</td>
                        <td className="max-w-[180px] truncate text-text2">
                          {c.lastServiceNames.join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="mt-4 grid grid-cols-1 gap-4 min-[1440px]:grid-cols-2">
            <section className="float-card">
              <h2 className="text-dash-section font-bold text-dash-ink">디자이너별 재방문율</h2>
              {data.artists.length === 0 ? (
                <p className="insight-empty">데이터가 없습니다</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="insight-table">
                    <thead>
                      <tr>
                        <th>디자이너</th>
                        <th className="is-right">담당 고객</th>
                        <th className="is-right">재방문 고객</th>
                        <th className="is-right">재방문율</th>
                        <th className="is-right">평균 방문주기</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.artists.map((a) => (
                        <tr key={a.artistId}>
                          <td className="font-semibold">{a.artistName}</td>
                          <td className="is-right tabular-nums">{a.customerCount}명</td>
                          <td className="is-right tabular-nums">{a.returningCount}명</td>
                          <td className={clsx("is-right tabular-nums", a.sampleInsufficient ? "text-text3" : "font-semibold")}>
                            {a.sampleInsufficient ? "표본 부족" : `${(a.retentionRate ?? 0).toFixed(1)}%`}
                          </td>
                          <td className="is-right tabular-nums text-text2">
                            {a.avgCycleDays != null ? `${Math.round(a.avgCycleDays)}일` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="float-card">
              <h2 className="text-dash-section font-bold text-dash-ink">시술별 재방문 기여도</h2>
              {data.services.length === 0 ? (
                <p className="insight-empty">데이터가 없습니다</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="insight-table">
                    <thead>
                      <tr>
                        <th>시술명</th>
                        <th className="is-right">시술 건수</th>
                        <th className="is-right">이후 재방문 비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.services.map((s) => (
                        <tr key={s.serviceName}>
                          <td className="font-semibold">{s.serviceName}</td>
                          <td className="is-right tabular-nums">{s.treatmentCount}건</td>
                          <td className="is-right tabular-nums font-semibold">{s.returnRate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 min-[1440px]:grid-cols-[2fr_3fr]">
            <section className="float-card">
              <h2 className="text-dash-section font-bold text-dash-ink">노쇼 / 예약금 상관관계</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="insight-tile">
                  <p className="text-pc-base font-semibold text-text2">예약금 받은 예약</p>
                  <p className="mt-3 text-pc-3xl font-bold leading-none tracking-[-0.02em] text-dash-ink">
                    {data.depositNoshow.paidNoshowRate.toFixed(1)}
                    <span className="ml-1 text-pc-lg font-bold">%</span>
                  </p>
                  <p className="mt-2 text-pc-sm text-text3">
                    노쇼 {data.depositNoshow.paidNoshow} / {data.depositNoshow.paidTotal}건
                  </p>
                </div>
                <div className="insight-tile">
                  <p className="text-pc-base font-semibold text-text2">예약금 안 받은 예약</p>
                  <p className="mt-3 text-pc-3xl font-bold leading-none tracking-[-0.02em] text-dash-ink">
                    {data.depositNoshow.unpaidNoshowRate.toFixed(1)}
                    <span className="ml-1 text-pc-lg font-bold">%</span>
                  </p>
                  <p className="mt-2 text-pc-sm text-text3">
                    노쇼 {data.depositNoshow.unpaidNoshow} / {data.depositNoshow.unpaidTotal}건
                  </p>
                </div>
              </div>
              {data.depositNoshow.suggestExpandDeposit ? (
                <p className="mt-4 text-pc-base font-semibold text-danger">
                  노쇼율 차이가 5%p 이상입니다. 예약금 정책 확대를 검토해보세요.
                </p>
              ) : null}
            </section>

            <section className="float-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-dash-section font-bold text-dash-ink">시간대별 예약 분포</h2>
                <p className="text-pc-sm text-text3">
                  가장 비는 시간대{" "}
                  <span className="font-semibold text-text1">
                    {data.heatmap.quietSlots
                      .map((s) => `${s.weekdayLabel} ${s.hour}시(${s.count}건)`)
                      .join(" · ") || "—"}
                  </span>
                </p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `32px repeat(${hours.length}, minmax(24px, 1fr))` }}
                >
                  <div />
                  {hours.map((h) => (
                    <div key={h} className="text-center text-pc-xs tabular-nums text-text3">
                      {h}
                    </div>
                  ))}
                  {WEEKDAY_LABELS.map((label, weekday) => (
                    <div key={label} className="contents">
                      <div className="flex items-center text-pc-sm font-semibold text-text2">{label}</div>
                      {hours.map((hour) => {
                        const count = cellMap.get(`${weekday}-${hour}`) ?? 0;
                        return (
                          <div
                            key={`${weekday}-${hour}`}
                            title={`${label} ${hour}시 · ${count}건`}
                            className="insight-heat-cell"
                          >
                            <div
                              className="customer-heat-fill h-full w-full"
                              style={{ opacity: heatOpacity(count, data.heatmap.maxCount) }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  hint
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="float-card flex min-h-[148px] flex-col justify-between">
      <p className="text-pc-lg font-bold text-dash-ink">{label}</p>
      <div>
        <p className="text-pc-4xl font-bold leading-none tracking-[-0.02em] text-dash-ink">
          {value}
          {unit ? <span className="ml-1 text-pc-lg font-bold">{unit}</span> : null}
        </p>
        <p className="mt-2 min-h-[18px] text-pc-sm text-text2">{hint ?? ""}</p>
      </div>
    </div>
  );
}
