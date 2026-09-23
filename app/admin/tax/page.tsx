"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import type { TaxDashboard } from "@/lib/admin/tax-data";

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function dDayLabel(dDay: number) {
  if (dDay === 0) return "D-Day";
  if (dDay > 0) return `D-${dDay}`;
  return `D+${Math.abs(dDay)}`;
}

export default function AdminTaxPage() {
  const [data, setData] = useState<TaxDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tax");
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as TaxDashboard);
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

  const configured = data?.settingsConfigured;
  const disabled = !configured;

  return (
    <div>
      <h1 className="font-serif text-[28px] tracking-[0.06em] lg:text-[32px]">TAX</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">
        세무 현황
        {data?.today ? ` · ${data.today}` : ""}
      </p>

      <div className="mt-6 border border-[#9b4a4a]/30 bg-[#9b4a4a]/5 px-5 py-4 font-sans-kr text-[13px] leading-relaxed text-[#9b4a4a]">
        이 화면의 세액은 참고용 추정치입니다.
        <br />
        실제 신고 시에는 각종 공제·감면과 업종별 특례가 적용되어 금액이 크게 달라질 수 있습니다.
        <br />
        반드시 세무 대리인과 확인하세요.
      </div>

      {!configured && !loading ? (
        <p className="mt-6 font-sans-kr text-[13px]">
          <Link href="/admin/settings" className="text-hu-muted underline underline-offset-2">
            사업자 정보를 먼저 입력해주세요 →
          </Link>
        </p>
      ) : null}

      {error ? <p className="mt-6 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}
      {loading && !data ? (
        <p className="mt-6 font-sans-kr text-[13px] text-hu-muted">불러오는 중…</p>
      ) : null}

      <div className={clsx(disabled && "pointer-events-none opacity-40")}>
        {data?.vat ? (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-[16px] tracking-[0.08em]">부가가치세 예상</h2>
              <p className="font-sans-kr text-[12px] text-hu-muted">{data.vat.periodLabel}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <Stat label="과세기간 매출" value={won(data.vat.revenue)} />
              <Stat label="매출세액" value={won(data.vat.outputVat)} />
              <Stat
                label={data.vat.taxType === "simplified" ? "매입공제(0.5%)" : "매입세액"}
                value={won(data.vat.inputVat)}
              />
              <Stat
                label="예상 납부세액"
                value={won(data.vat.payable)}
                emphasize
              />
            </div>
            {data.vat.taxType === "simplified" ? (
              <p className="mt-3 font-sans-kr text-[12px] text-hu-muted">
                간이과세 · 부가가치율 30% 적용 (미용업/기타 서비스). 증빙 매입의 0.5% 공제.
                {data.vat.simplifiedExemptNote
                  ? ` ${data.vat.simplifiedExemptNote}`
                  : ""}
              </p>
            ) : (
              <p className="mt-3 font-sans-kr text-[12px] text-hu-muted">
                일반과세 · 매출·증빙지출을 부가세 포함 금액으로 보고 세액 = 금액 × 10/110.
              </p>
            )}
            {data.vat.nextDeadlines[0] ? (
              <p className="mt-2 font-sans-kr text-[13px]">
                다음 기한: {data.vat.nextDeadlines[0].label} {data.vat.nextDeadlines[0].date}{" "}
                <span className="text-hu-muted">
                  ({dDayLabel(data.vat.nextDeadlines[0].dDay)})
                </span>
              </p>
            ) : null}
          </section>
        ) : null}

        {data?.income ? (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-[16px] tracking-[0.08em]">종합소득세 예상</h2>
              <p className="font-sans-kr text-[12px] text-hu-muted">
                {data.income.from} ~ {data.income.to}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <Stat label="수입금액" value={won(data.income.revenue)} />
              <Stat label="필요경비" value={won(data.income.expenseTotal)} />
              <Stat label="소득금액" value={won(data.income.income)} />
              <Stat label="과세표준" value={won(data.income.taxableBase)} />
              <Stat
                label="종합소득세"
                value={won(data.income.incomeTax)}
                hint={
                  data.income.bracketRate != null
                    ? `적용 세율 ${(data.income.bracketRate * 100).toFixed(0)}%`
                    : undefined
                }
              />
              <Stat label="지방소득세(10%)" value={won(data.income.localIncomeTax)} />
              <Stat label="합계" value={won(data.income.totalTax)} emphasize />
              <Stat
                label="신고 기한"
                value={dDayLabel(data.income.filingDeadline.dDay)}
                hint={data.income.filingDeadline.date}
              />
            </div>
            <p className="mt-3 font-sans-kr text-[12px] text-hu-muted">
              기본공제 150만원만 반영했습니다. 인적공제·세액공제·특별공제는 포함하지 않습니다.
              {data.income.expenseUnproven > 0
                ? ` 필요경비 중 증빙 없는 지출 ${won(data.income.expenseUnproven)}.`
                : ""}
            </p>
          </section>
        ) : null}

        {data && configured ? (
          <section className="mt-10">
            <h2 className="font-serif text-[16px] tracking-[0.08em]">월별 추이</h2>
            <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">
              세금 준비금 제안: 매달{" "}
              <span className="text-hu-black">{won(data.recommendedMonthlyReserve)}</span>씩
              적립 권장 (연환산 소득세·지방세 + 당기 부가세 기준)
            </p>
            <div className="mt-4 overflow-x-auto bg-hu-white">
              <table className="min-w-full text-left font-sans-kr text-[13px]">
                <thead>
                  <tr className="border-b border-hu-black/10 text-hu-muted">
                    <th className="px-5 py-3 font-normal">월</th>
                    <th className="px-5 py-3 font-normal">매출</th>
                    <th className="px-5 py-3 font-normal">비용</th>
                    <th className="px-5 py-3 font-normal">소득</th>
                    <th className="px-5 py-3 font-normal">누적 소득</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hu-black/10">
                  {data.monthly.map((row) => (
                    <tr key={`${row.year}-${row.month}`}>
                      <td className="px-5 py-3">{row.label}</td>
                      <td className="px-5 py-3 tabular-nums">{won(row.revenue)}</td>
                      <td className="px-5 py-3 tabular-nums">{won(row.expense)}</td>
                      <td className="px-5 py-3 tabular-nums">{won(row.income)}</td>
                      <td className="px-5 py-3 tabular-nums">{won(row.cumulativeIncome)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {data && configured ? (
          <section className="mt-10">
            <h2 className="font-serif text-[16px] tracking-[0.08em]">세무 일정</h2>
            {data.schedule.length === 0 ? (
              <p className="mt-4 bg-hu-white px-5 py-8 font-sans-kr text-[13px] text-hu-muted">
                다가오는 일정이 없습니다.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-hu-black/10 bg-hu-white">
                {data.schedule.map((item) => (
                  <li
                    key={item.key}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4 font-sans-kr text-[14px]"
                  >
                    <span>
                      {item.label}
                      <span className="ml-2 text-[12px] text-hu-muted">{item.date}</span>
                    </span>
                    <span className="tabular-nums text-hu-muted">{dDayLabel(item.dDay)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {data && configured ? (
          <section className="mt-10">
            <h2 className="font-serif text-[16px] tracking-[0.08em]">경고</h2>
            <div className="mt-4 space-y-3">
              <div
                className={clsx(
                  "bg-hu-white px-5 py-4 font-sans-kr text-[13px]",
                  data.warnings.cashReceiptCount > 0 && "text-[#9b4a4a]"
                )}
              >
                <p>
                  현금영수증 미발급 {data.warnings.cashReceiptCount.toLocaleString("ko-KR")}건 ·
                  대상액 {won(data.warnings.cashReceiptAmount)}
                </p>
                <p className="mt-1">
                  예상 가산세(20%) {won(data.warnings.cashReceiptPenalty)}
                  {data.warnings.cashReceiptCount > 0 ? (
                    <>
                      {" · "}
                      <Link href="/admin/bookings" className="underline">
                        예약 목록
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
              <div
                className={clsx(
                  "bg-hu-white px-5 py-4 font-sans-kr text-[13px]",
                  data.warnings.unprovenExpenseHigh && "text-[#9b4a4a]"
                )}
              >
                증빙 없는 지출 비율{" "}
                {(data.warnings.unprovenExpenseRatio * 100).toFixed(1)}%
                {data.warnings.unprovenExpenseHigh
                  ? " · 30%를 초과했습니다. 증빙을 보완하세요."
                  : " · 양호"}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasize
}: {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="bg-hu-white px-4 py-5 lg:px-5 lg:py-6">
      <p className="font-serif text-[12px] tracking-[0.14em] text-hu-muted">{label}</p>
      <p
        className={clsx(
          "mt-3 font-serif leading-tight",
          emphasize ? "text-[26px] lg:text-[30px]" : "text-[22px] lg:text-[26px]"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">{hint}</p> : null}
    </div>
  );
}
