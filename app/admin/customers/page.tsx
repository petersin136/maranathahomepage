"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import type { CustomersDashboard } from "@/lib/admin/customers-data";
import { WEEKDAY_LABELS } from "@/lib/admin/customers-data";

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function maskPhone(phone: string, masked: boolean) {
  if (!masked) return phone;
  const digits = phone.replace(/\s/g, "");
  if (digits.length < 7) return "****";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function heatOpacity(count: number, max: number) {
  if (max <= 0 || count <= 0) return 0.04;
  return 0.08 + (count / max) * 0.72;
}

export default function AdminCustomersPage() {
  const [data, setData] = useState<CustomersDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [maskPhones, setMaskPhones] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers");
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as CustomersDashboard);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[28px] tracking-[0.06em] lg:text-[32px]">
            CUSTOMERS
          </h1>
          <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">
            고객 분석
            {data?.today ? ` · ${data.today}` : ""}
            {data && data.excludedNoPhoneCount > 0
              ? ` · 전화번호 없는 예약 ${data.excludedNoPhoneCount}건 제외`
              : ""}
          </p>
        </div>
        <label className="flex items-center gap-2 font-sans-kr text-[13px] text-hu-muted">
          <input
            type="checkbox"
            checked={maskPhones}
            onChange={(e) => setMaskPhones(e.target.checked)}
          />
          전화번호 마스킹
        </label>
      </div>

      {error ? <p className="mt-6 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}
      {loading && !data ? (
        <p className="mt-6 font-sans-kr text-[13px] text-hu-muted">불러오는 중…</p>
      ) : null}

      {data ? (
        <>
          <section className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-[18px] tracking-[0.08em]">이탈 위험 고객</h2>
              <p className="font-sans-kr text-[13px] text-hu-muted">
                {data.churn.contactCount.toLocaleString("ko-KR")}명에게 연락하면 예상 회복 매출{" "}
                <span className="text-hu-black">{won(data.churn.expectedRecoverRevenue)}</span>
              </p>
            </div>
            {data.churn.customers.length === 0 ? (
              <p className="mt-4 bg-hu-white px-5 py-10 text-center font-sans-kr text-[13px] text-hu-muted">
                이탈 위험으로 분류된 고객이 없습니다
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto bg-hu-white">
                <table className="min-w-full text-left font-sans-kr text-[13px]">
                  <thead>
                    <tr className="border-b border-hu-black/10 text-hu-muted">
                      <th className="px-4 py-3 font-normal">고객명</th>
                      <th className="px-4 py-3 font-normal">전화번호</th>
                      <th className="px-4 py-3 font-normal">마지막 방문</th>
                      <th className="px-4 py-3 font-normal">경과일</th>
                      <th className="px-4 py-3 font-normal">방문</th>
                      <th className="px-4 py-3 font-normal">누적 매출</th>
                      <th className="px-4 py-3 font-normal">주 담당</th>
                      <th className="px-4 py-3 font-normal">마지막 시술</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hu-black/10">
                    {data.churn.customers.map((c) => (
                      <tr key={c.phone}>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            {c.highValue ? (
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full bg-hu-black"
                                title="누적 매출 상위 20%"
                              />
                            ) : (
                              <span className="inline-block h-1.5 w-1.5" />
                            )}
                            {c.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void copyPhone(c.phone)}
                            className="text-left text-hu-muted underline-offset-2 hover:underline"
                            title="전화번호 복사"
                          >
                            {copiedPhone === c.phone
                              ? "복사됨"
                              : maskPhone(c.phone, maskPhones)}
                          </button>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-hu-muted">
                          {c.lastVisitDate.slice(2)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{c.daysSince}일</td>
                        <td className="px-4 py-3 tabular-nums">{c.visitCount}</td>
                        <td className="px-4 py-3 tabular-nums">{won(c.lifetimeRevenue)}</td>
                        <td className="px-4 py-3">{c.primaryArtistName}</td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-hu-muted">
                          {c.lastServiceNames.join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <Stat
              label="총 고객"
              value={`${data.summary.totalCustomers.toLocaleString("ko-KR")}명`}
            />
            <Stat
              label="재방문 고객"
              value={`${data.summary.returningCustomers.toLocaleString("ko-KR")}명`}
              hint={`재방문율 ${data.summary.returningRate.toFixed(1)}%`}
            />
            <Stat
              label="이번 달 신규"
              value={`${data.summary.newCustomersThisMonth.toLocaleString("ko-KR")}명`}
            />
            <Stat
              label="평균 방문 주기"
              value={
                data.summary.avgCycleDays != null
                  ? `${Math.round(data.summary.avgCycleDays)}일`
                  : "—"
              }
              hint="재방문 고객 기준"
            />
          </div>

          <section className="mt-10">
            <h2 className="font-serif text-[16px] tracking-[0.08em]">디자이너별 재방문율</h2>
            {data.artists.length === 0 ? (
              <p className="mt-4 bg-hu-white px-5 py-8 font-sans-kr text-[13px] text-hu-muted">
                데이터가 없습니다
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto bg-hu-white">
                <table className="min-w-full text-left font-sans-kr text-[13px]">
                  <thead>
                    <tr className="border-b border-hu-black/10 text-hu-muted">
                      <th className="px-5 py-3 font-normal">디자이너</th>
                      <th className="px-5 py-3 font-normal">담당 고객</th>
                      <th className="px-5 py-3 font-normal">재방문 고객</th>
                      <th className="px-5 py-3 font-normal">재방문율</th>
                      <th className="px-5 py-3 font-normal">평균 방문주기</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hu-black/10">
                    {data.artists.map((a) => (
                      <tr key={a.artistId}>
                        <td className="px-5 py-3">{a.artistName}</td>
                        <td className="px-5 py-3 tabular-nums">{a.customerCount}</td>
                        <td className="px-5 py-3 tabular-nums">{a.returningCount}</td>
                        <td className="px-5 py-3 tabular-nums">
                          {a.sampleInsufficient
                            ? "표본 부족"
                            : `${(a.retentionRate ?? 0).toFixed(1)}%`}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-hu-muted">
                          {a.avgCycleDays != null ? `${Math.round(a.avgCycleDays)}일` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-[16px] tracking-[0.08em]">시술별 재방문 기여도</h2>
            {data.services.length === 0 ? (
              <p className="mt-4 bg-hu-white px-5 py-8 font-sans-kr text-[13px] text-hu-muted">
                데이터가 없습니다
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto bg-hu-white">
                <table className="min-w-full text-left font-sans-kr text-[13px]">
                  <thead>
                    <tr className="border-b border-hu-black/10 text-hu-muted">
                      <th className="px-5 py-3 font-normal">시술명</th>
                      <th className="px-5 py-3 font-normal">시술 건수</th>
                      <th className="px-5 py-3 font-normal">이후 재방문 비율</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hu-black/10">
                    {data.services.map((s) => (
                      <tr key={s.serviceName}>
                        <td className="px-5 py-3">{s.serviceName}</td>
                        <td className="px-5 py-3 tabular-nums">{s.treatmentCount}</td>
                        <td className="px-5 py-3 tabular-nums">{s.returnRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-[16px] tracking-[0.08em]">
              노쇼 / 예약금 상관관계
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="bg-hu-white px-5 py-5">
                <p className="font-sans-kr text-[13px] text-hu-muted">예약금 받은 예약</p>
                <p className="mt-2 font-serif text-[28px]">
                  {data.depositNoshow.paidNoshowRate.toFixed(1)}%
                </p>
                <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
                  노쇼 {data.depositNoshow.paidNoshow} / {data.depositNoshow.paidTotal}건
                </p>
              </div>
              <div className="bg-hu-white px-5 py-5">
                <p className="font-sans-kr text-[13px] text-hu-muted">예약금 안 받은 예약</p>
                <p className="mt-2 font-serif text-[28px]">
                  {data.depositNoshow.unpaidNoshowRate.toFixed(1)}%
                </p>
                <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
                  노쇼 {data.depositNoshow.unpaidNoshow} / {data.depositNoshow.unpaidTotal}건
                </p>
              </div>
            </div>
            <p className="mt-3 font-sans-kr text-[13px] text-hu-muted">
              예약금 받은 예약 노쇼율 {data.depositNoshow.paidNoshowRate.toFixed(1)}% / 안 받은
              예약 노쇼율 {data.depositNoshow.unpaidNoshowRate.toFixed(1)}%
              {data.depositNoshow.suggestExpandDeposit
                ? " · 차이가 5%p 이상입니다. 예약금 정책 확대를 검토해보세요."
                : ""}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-[16px] tracking-[0.08em]">시간대별 예약 분포</h2>
            <div className="mt-4 overflow-x-auto bg-hu-white p-4">
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `48px repeat(${hours.length}, minmax(28px, 1fr))`
                }}
              >
                <div />
                {hours.map((h) => (
                  <div
                    key={h}
                    className="text-center font-sans-kr text-[10px] text-hu-muted"
                  >
                    {h}
                  </div>
                ))}
                {WEEKDAY_LABELS.map((label, weekday) => (
                  <div key={label} className="contents">
                    <div className="flex items-center font-sans-kr text-[12px] text-hu-muted">
                      {label}
                    </div>
                    {hours.map((hour) => {
                      const count = cellMap.get(`${weekday}-${hour}`) ?? 0;
                      return (
                        <div
                          key={`${weekday}-${hour}`}
                          title={`${label} ${hour}시 · ${count}건`}
                          className="aspect-square min-h-[28px] border border-hu-black/5"
                          style={{
                            backgroundColor: `rgba(28, 26, 25, ${heatOpacity(
                              count,
                              data.heatmap.maxCount
                            )})`
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 font-sans-kr text-[13px] text-hu-muted">
              가장 비는 시간대 3개:{" "}
              {data.heatmap.quietSlots
                .map((s) => `${s.weekdayLabel} ${s.hour}시(${s.count}건)`)
                .join(" · ") || "—"}
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-hu-white px-4 py-5 lg:px-5 lg:py-6">
      <p className="font-serif text-[12px] tracking-[0.14em] text-hu-muted">{label}</p>
      <p className="mt-3 font-serif text-[22px] leading-tight lg:text-[26px]">{value}</p>
      {hint ? <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">{hint}</p> : null}
    </div>
  );
}
