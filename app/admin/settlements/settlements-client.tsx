"use client";

import { useCallback, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  Empty,
  FinanceHeader,
  Icon,
  MonthPicker,
  Note,
  RefreshButton,
  Section,
  StatStrip,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TH,
  Toolbar,
  shiftMonth,
  won
} from "@/components/admin/finance-ui";
import type { SettlementArtistRow, SettlementDashboard } from "@/lib/admin/settlements-data";
import { todayKst } from "@/lib/admin/sales-data";

function defaultLastMonth() {
  const [y, m] = todayKst().split("-").map(Number);
  return shiftMonth(y, m, -1);
}

export default function AdminSettlementsPage({
  initial,
  initialError
}: {
  initial: SettlementDashboard | null;
  initialError: string | null;
}) {
  const fallback = useMemo(() => defaultLastMonth(), []);
  const [year, setYear] = useState(initial?.year ?? fallback.year);
  const [month, setMonth] = useState(initial?.month ?? fallback.month);
  const [data, setData] = useState<SettlementDashboard | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async (nextYear: number, nextMonth: number) => {
    setRefreshing(true);
    setError(null);
    setExpandedId(null);
    setYear(nextYear);
    setMonth(nextMonth);
    try {
      const params = new URLSearchParams({ year: String(nextYear), month: String(nextMonth) });
      const res = await fetch(`/api/admin/settlements?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as SettlementDashboard);
      setYear(json.year);
      setMonth(json.month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const copyAccount = async (row: SettlementArtistRow) => {
    if (!row.bankAccount) return;
    try {
      await navigator.clipboard.writeText(row.bankAccount);
      setCopiedId(row.artistId);
      window.setTimeout(() => setCopiedId((cur) => (cur === row.artistId ? null : cur)), 1500);
    } catch {
      setError("계좌번호 복사에 실패했습니다.");
    }
  };

  const hasStaff = (data?.artists ?? []).some((a) => !a.isFreelance && a.hasCommission);

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <FinanceHeader subtitle={`${year}년 ${month}월 디자이너 정산`} />

      <Toolbar
        left={
          <>
            <MonthPicker year={year} month={month} onChange={(y, m) => void load(y, m)} />
            <RefreshButton spinning={refreshing} onClick={() => void load(year, month)} />
          </>
        }
      />

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}
      {refreshing && !data ? <p className="mt-6 text-[13px] text-[#8A847C]">불러오는 중…</p> : null}

      {data ? (
        <>
          <StatStrip
            items={[
              { label: "총 매출", value: won(data.summary.totalRevenue) },
              { label: "총 인센티브", value: won(data.summary.totalIncentive) },
              { label: "총 원천징수", value: won(data.summary.totalWithholding), hint: "프리랜서 3.3%" },
              { label: "총 실지급액", value: won(data.summary.totalNetPay) }
            ]}
          />

          <Section title="디자이너별 정산" meta={`${data.artists.length}명`}>
            <table className="mt-4 w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[12%]" />
                <col className="w-[6%]" />
                <col className="w-[8%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[19%]" />
              </colgroup>
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={clsx(TH, "pl-1")}>디자이너</th>
                  <th className={TH}>고용형태</th>
                  <th className={clsx(TH, "text-right")}>매출</th>
                  <th className={clsx(TH, "text-right")}>건수</th>
                  <th className={clsx(TH, "text-right")}>커미션</th>
                  <th className={clsx(TH, "text-right")}>인센티브</th>
                  <th className={clsx(TH, "text-right")}>원천징수</th>
                  <th className={clsx(TH, "text-right")}>실지급액</th>
                  <th className={clsx(TH, "pl-4")}>계좌</th>
                </tr>
              </thead>
              <tbody>
                {data.artists.map((row) => (
                  <ArtistRow
                    key={row.artistId}
                    row={row}
                    open={expandedId === row.artistId}
                    copied={copiedId === row.artistId}
                    onToggle={() => setExpandedId((cur) => (cur === row.artistId ? null : row.artistId))}
                    onCopyAccount={() => void copyAccount(row)}
                  />
                ))}
              </tbody>
            </table>
            {data.artists.length === 0 ? <Empty>해당 월에 정산할 내역이 없습니다.</Empty> : null}

            <Note>
              {hasStaff
                ? "원천징수(3.3%)는 프리랜서에게만 적용합니다. 4대보험 대상 직원의 급여·공제는 급여대장에서 별도로 처리하세요."
                : "원천징수 3.3%는 일반적인 사업소득 기준입니다."}
              <br />
              원천징수한 세액은 지급일이 속한 달의 다음 달 10일까지 신고·납부해야 하며, 실제 신고는 세무 대리인과 확인하세요.
            </Note>
          </Section>
        </>
      ) : null}
    </div>
  );
}

function ArtistRow({
  row,
  open,
  copied,
  onToggle,
  onCopyAccount
}: {
  row: SettlementArtistRow;
  open: boolean;
  copied: boolean;
  onToggle: () => void;
  onCopyAccount: () => void;
}) {
  return (
    <>
      <tr
        className={clsx(TABLE_ROW, "cursor-pointer hover:bg-[#F9F8F4]", open && "bg-[#F4EFE9]")}
        onClick={onToggle}
      >
        <td className={clsx(TD, "truncate pl-1")}>
          <span className="inline-flex items-center gap-2">
            <Icon
              src="/admin-icons/lnb/chevron-down.png"
              className={clsx("h-[14px] w-[14px] text-[#9A948C] transition-transform", open && "rotate-180")}
            />
            {row.artistName}
          </span>
        </td>
        <td className={clsx(TD, "truncate text-[#8A847C]")}>{row.employmentLabel}</td>
        <td className={clsx(TD, "text-right tabular-nums")}>{won(row.revenue)}</td>
        <td className={clsx(TD, "text-right tabular-nums")}>{row.count}</td>
        <td className={clsx(TD, "text-right tabular-nums")}>{row.hasCommission ? `${row.commissionRate}%` : "0%"}</td>
        <td className={clsx(TD, "text-right tabular-nums")}>{row.incentive != null ? won(row.incentive) : "—"}</td>
        <td className={clsx(TD, "text-right tabular-nums text-[#8A847C]")}>
          {row.withholding != null ? won(row.withholding) : "—"}
        </td>
        <td className={clsx(TD, "text-right font-bold tabular-nums")}>{row.netPay != null ? won(row.netPay) : "—"}</td>
        <td className={clsx(TD, "truncate pl-4 pr-0")}>
          {row.bankDisplay && row.bankAccount ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyAccount();
              }}
              className="max-w-full truncate text-left text-[14px] text-[#8A847C] hover:text-[#1C1C1C]"
              title="계좌번호 복사"
            >
              {copied ? "복사됨" : row.bankDisplay}
            </button>
          ) : (
            <span className="text-[#8A847C]">—</span>
          )}
        </td>
      </tr>
      {open ? (
        <tr className="bg-[#F9F8F4]">
          <td colSpan={9} className="px-6 pb-5 pt-3">
            <p className="text-[13px] text-[#8A847C]">
              완료 예약 {row.count}건
              {row.isFreelance && row.incomeTax != null && row.localIncomeTax != null
                ? ` · 소득세 ${won(row.incomeTax)} + 지방소득세 ${won(row.localIncomeTax)}`
                : ""}
            </p>
            {row.bookings.length === 0 ? (
              <Empty>완료된 예약이 없습니다.</Empty>
            ) : (
              <table className="mt-2 w-full table-fixed text-left text-[15px] font-medium leading-[20px]">
                <tbody>
                  {row.bookings.map((b) => (
                    <tr key={b.id} className="border-b border-[#EFEBE6] last:border-b-0">
                      <td className="w-[14%] py-3 pr-3 tabular-nums text-[#8A847C]">{b.bookingDate.slice(2).replaceAll("-", ". ")}</td>
                      <td className="w-[14%] truncate py-3 pr-3">{b.customerName}</td>
                      <td className="truncate py-3 pr-3 text-[#3A3A3A]">{b.serviceNames.length ? b.serviceNames.join(" / ") : "—"}</td>
                      <td className="w-[12%] py-3 pr-3 text-[#8A847C]">{b.paymentMethodLabel}</td>
                      <td className="w-[14%] py-3 text-right tabular-nums">{won(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
