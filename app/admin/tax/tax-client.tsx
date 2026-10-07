"use client";

import Link from "next/link";
import { clsx } from "clsx";
import {
  Empty,
  FinanceHeader,
  Note,
  Section,
  StatStrip,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  won
} from "@/components/admin/finance-ui";
import type { TaxDashboard } from "@/lib/admin/tax-data";

function dDayLabel(dDay: number) {
  if (dDay === 0) return "D-day";
  if (dDay > 0) return `D-${dDay}`;
  return `D+${Math.abs(dDay)}`;
}

function dotted(ymd: string) {
  return ymd.slice(2).replace(/-/g, ". ");
}

export default function AdminTaxPage({
  initial,
  initialError
}: {
  initial: TaxDashboard | null;
  initialError: string | null;
}) {
  const data = initial;
  const configured = !!data?.settingsConfigured;
  const vat = data?.vat;
  const income = data?.income;

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <FinanceHeader subtitle={data?.today ? `${dotted(data.today)} 기준 예상` : undefined} />

      <p className="mt-[34px] rounded-[8px] bg-[#F9F8F4] px-5 py-4 text-[13px] leading-[20px] text-[#8A847C]">
        이 화면의 세액은 참고용 추정치입니다. 실제 신고 시에는 각종 공제·감면과 업종별 특례가 적용되어 금액이 크게
        달라질 수 있으니, 반드시 세무 대리인과 확인하세요.
      </p>

      {initialError ? <p className="mt-4 text-[13px] text-[#E24B4B]">{initialError}</p> : null}

      {data && !configured ? (
        <div className="mt-10 border-y-[1.5px] border-[#C9C3BB] py-16 text-center">
          <p className="text-[18px] font-bold">사업자 정보가 아직 없어요</p>
          <p className="mt-3 text-[14px] leading-[22px] text-[#8A847C]">
            상호·사업자등록번호·과세 유형(일반·간이)을 입력하면 부가세·종합소득세 예상액과 세무 일정을 계산해 드립니다.
          </p>
          <Link
            href="/admin/settings"
            className="mt-6 inline-flex h-[40px] items-center rounded-[8px] bg-[#2F3A2F] px-5 text-[14px] font-bold text-white"
          >
            사업자 정보 입력하기
          </Link>
        </div>
      ) : null}

      {configured && vat ? (
        <Section
          title="부가가치세"
          meta={`${vat.periodLabel} · ${vat.taxType === "simplified" ? "간이과세" : "일반과세"}`}
          right={
            vat.nextDeadlines[0] ? (
              <span className="text-[14px] text-[#8A847C]">
                {vat.nextDeadlines[0].label} {dotted(vat.nextDeadlines[0].date)}
                <b className="ml-2 text-[#1C1C1C]">{dDayLabel(vat.nextDeadlines[0].dDay)}</b>
              </span>
            ) : null
          }
        >
          <StatStrip
            className="mt-4"
            items={[
              { label: "과세기간 매출", value: won(vat.revenue) },
              { label: "매출세액", value: won(vat.outputVat) },
              { label: vat.taxType === "simplified" ? "매입공제 (0.5%)" : "매입세액", value: won(vat.inputVat) },
              { label: "예상 납부세액", value: won(vat.payable) }
            ]}
          />
          <Note>
            {vat.taxType === "simplified"
              ? `간이과세 · 부가가치율 30% 적용(미용업). 증빙 매입의 0.5%를 공제합니다.${vat.simplifiedExemptNote ? ` ${vat.simplifiedExemptNote}` : ""}`
              : "일반과세 · 매출과 증빙 지출을 부가세 포함 금액으로 보고 세액 = 금액 × 10/110 으로 계산합니다."}
          </Note>
        </Section>
      ) : null}

      {configured && income ? (
        <Section
          title="종합소득세"
          meta={`${dotted(income.from)} ~ ${dotted(income.to)}`}
          right={
            <span className="text-[14px] text-[#8A847C]">
              신고 기한 {dotted(income.filingDeadline.date)}
              <b className="ml-2 text-[#1C1C1C]">{dDayLabel(income.filingDeadline.dDay)}</b>
            </span>
          }
        >
          <StatStrip
            className="mt-4"
            cols={4}
            items={[
              { label: "수입금액", value: won(income.revenue) },
              {
                label: "필요경비",
                value: won(income.expenseTotal),
                hint: income.expenseUnproven > 0 ? `증빙 없음 ${won(income.expenseUnproven)}` : undefined
              },
              { label: "소득금액", value: won(income.income) },
              { label: "과세표준", value: won(income.taxableBase), hint: "기본공제 150만원 반영" },
              {
                label: "종합소득세",
                value: won(income.incomeTax),
                hint: income.bracketRate != null ? `적용 세율 ${(income.bracketRate * 100).toFixed(0)}%` : undefined
              },
              { label: "지방소득세 (10%)", value: won(income.localIncomeTax) },
              { label: "합계", value: won(income.totalTax) },
              {
                label: "월 적립 권장",
                value: won(data?.recommendedMonthlyReserve ?? 0),
                hint: "소득세·지방세 + 부가세 기준"
              }
            ]}
          />
          <Note>인적공제·세액공제·특별공제는 포함하지 않았습니다.</Note>
        </Section>
      ) : null}

      {configured && data ? (
        <div className="grid grid-cols-[3fr_2fr] gap-12">
          <Section title="월별 추이" meta={`${data.monthly.length}개월`}>
            <table className="mt-4 w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={clsx(TH, "pl-1")}>월</th>
                  <th className={clsx(TH, "text-right")}>매출</th>
                  <th className={clsx(TH, "text-right")}>비용</th>
                  <th className={clsx(TH, "text-right")}>소득</th>
                  <th className={clsx(TH, "pr-0 text-right")}>누적 소득</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((row) => (
                  <tr key={`${row.year}-${row.month}`} className={TABLE_ROW}>
                    <td className={clsx(TD, "pl-1")}>{row.label}</td>
                    <td className={clsx(TD, "text-right tabular-nums")}>{won(row.revenue)}</td>
                    <td className={clsx(TD, "text-right tabular-nums text-[#8A847C]")}>{won(row.expense)}</td>
                    <td className={clsx(TD, "text-right tabular-nums", row.income < 0 && "text-[#E24B4B]")}>
                      {won(row.income)}
                    </td>
                    <td className={clsx(TD, "pr-0 text-right font-bold tabular-nums")}>{won(row.cumulativeIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.monthly.length === 0 ? <Empty>집계할 데이터가 없습니다.</Empty> : null}
          </Section>

          <div>
            <Section title="세무 일정" meta={data.schedule.length ? `${data.schedule.length}건` : undefined}>
              {data.schedule.length === 0 ? (
                <Empty>다가오는 일정이 없습니다.</Empty>
              ) : (
                <ul className="mt-4 border-t-[1.5px] border-[#C9C3BB]">
                  {data.schedule.map((item) => (
                    <li key={item.key} className="flex items-baseline justify-between gap-4 border-b border-[#F3EFEA] py-[15px]">
                      <span className="min-w-0 text-[16px] font-medium">
                        {item.label}
                        <span className="ml-2 text-[13px] font-normal text-[#8A847C]">{dotted(item.date)}</span>
                      </span>
                      <span
                        className={clsx(
                          "shrink-0 text-[14px] font-bold tabular-nums",
                          item.dDay <= 14 ? "text-[#E24B4B]" : "text-[#1C1C1C]"
                        )}
                      >
                        {dDayLabel(item.dDay)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="점검" className="mt-10">
              <ul className="mt-4 border-t-[1.5px] border-[#C9C3BB]">
                <CheckRow
                  bad={data.warnings.cashReceiptCount > 0}
                  label="현금영수증 미발급"
                  value={`${data.warnings.cashReceiptCount}건 · ${won(data.warnings.cashReceiptAmount)}`}
                  detail={
                    data.warnings.cashReceiptCount > 0 ? (
                      <>
                        예상 가산세(20%) {won(data.warnings.cashReceiptPenalty)} ·{" "}
                        <Link href="/admin/bookings" className="underline underline-offset-2">
                          예약 목록에서 확인
                        </Link>
                      </>
                    ) : (
                      "미발급 건이 없습니다."
                    )
                  }
                />
                <CheckRow
                  bad={data.warnings.unprovenExpenseHigh}
                  label="증빙 없는 지출 비율"
                  value={`${(data.warnings.unprovenExpenseRatio * 100).toFixed(1)}%`}
                  detail={data.warnings.unprovenExpenseHigh ? "30%를 넘었습니다. 증빙을 보완하세요." : "양호합니다."}
                />
              </ul>
            </Section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CheckRow({
  bad,
  label,
  value,
  detail
}: {
  bad: boolean;
  label: string;
  value: string;
  detail: React.ReactNode;
}) {
  return (
    <li className="border-b border-[#F3EFEA] py-[15px]">
      <div className="flex items-baseline justify-between gap-4 text-[16px] font-medium">
        <span className="inline-flex items-center gap-[6px]" style={{ color: bad ? "var(--danger)" : "#1C1C1C" }}>
          <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
          {label}
        </span>
        <span className={clsx("tabular-nums", bad && "text-[#E24B4B]")}>{value}</span>
      </div>
      <p className={clsx("mt-1 pl-[13px] text-[13px]", bad ? "text-[#E24B4B]" : "text-[#8A847C]")}>{detail}</p>
    </li>
  );
}
