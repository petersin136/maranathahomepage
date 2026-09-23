"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import type { SettlementArtistRow, SettlementDashboard } from "@/lib/admin/settlements-data";
import { todayKst } from "@/lib/admin/sales-data";

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function parseYmdParts(ymd: string) {
  const [y, m] = ymd.split("-").map(Number);
  return { y, m };
}

function shiftMonth(year: number, month: number, delta: number) {
  const dt = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1 };
}

function defaultLastMonth() {
  const { y, m } = parseYmdParts(todayKst());
  return shiftMonth(y, m, -1);
}

export default function AdminSettlementsPage() {
  const initial = useMemo(() => defaultLastMonth(), []);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [data, setData] = useState<SettlementDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const current = parseYmdParts(todayKst()).y;
    const years: number[] = [];
    for (let y = current + 1; y >= current - 4; y -= 1) years.push(y);
    return years;
  }, []);

  const load = useCallback(async (nextYear: number, nextMonth: number) => {
    setLoading(true);
    setError(null);
    setExpandedId(null);
    try {
      const params = new URLSearchParams({
        year: String(nextYear),
        month: String(nextMonth)
      });
      const res = await fetch(`/api/admin/settlements?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setData(json as SettlementDashboard);
      setYear(json.year);
      setMonth(json.month);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initial.year, initial.month);
  }, [initial.year, initial.month, load]);

  const moveMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    void load(next.year, next.month);
  };

  const onSelectYearMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    void load(nextYear, nextMonth);
  };

  const copyAccount = async (row: SettlementArtistRow) => {
    if (!row.bankAccount) return;
    try {
      await navigator.clipboard.writeText(row.bankAccount);
      setCopiedId(row.artistId);
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === row.artistId ? null : cur));
      }, 1500);
    } catch {
      setError("계좌번호 복사에 실패했습니다.");
    }
  };

  const empty = data != null && data.artists.length === 0;
  const hasStaff = (data?.artists ?? []).some((a) => !a.isFreelance && a.hasCommission);

  return (
    <div>
      <h1 className="font-serif text-[28px] tracking-[0.06em] lg:text-[32px]">SETTLEMENTS</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">
        디자이너 정산
        {data ? ` · ${data.year}년 ${data.month}월` : ""}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-8">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="h-9 border border-hu-black/20 bg-hu-white px-3 font-sans-kr text-[13px] text-hu-black"
          aria-label="이전 달"
        >
          ←
        </button>
        <label className="font-sans-kr text-[13px] text-hu-muted">
          년
          <select
            value={year}
            onChange={(e) => onSelectYearMonth(Number(e.target.value), month)}
            className="ml-2 h-9 border border-hu-black/20 bg-hu-white px-2.5 text-hu-black outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="font-sans-kr text-[13px] text-hu-muted">
          월
          <select
            value={month}
            onChange={(e) => onSelectYearMonth(year, Number(e.target.value))}
            className="ml-2 h-9 border border-hu-black/20 bg-hu-white px-2.5 text-hu-black outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="h-9 border border-hu-black/20 bg-hu-white px-3 font-sans-kr text-[13px] text-hu-black"
          aria-label="다음 달"
        >
          →
        </button>
      </div>

      {error ? <p className="mt-6 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}
      {loading && !data ? (
        <p className="mt-6 font-sans-kr text-[13px] text-hu-muted">불러오는 중…</p>
      ) : null}

      {data ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:mt-8 lg:grid-cols-4 lg:gap-4">
            <SummaryCard label="총 매출" value={won(data.summary.totalRevenue)} />
            <SummaryCard label="총 인센티브" value={won(data.summary.totalIncentive)} />
            <SummaryCard label="총 원천징수" value={won(data.summary.totalWithholding)} />
            <SummaryCard label="총 실지급액" value={won(data.summary.totalNetPay)} />
          </div>

          {empty ? (
            <p className="mt-10 bg-hu-white px-5 py-10 text-center font-sans-kr text-[13px] text-hu-muted">
              해당 월에 정산할 내역이 없습니다
            </p>
          ) : (
            <section className="mt-10">
              <h2 className="font-serif text-[16px] tracking-[0.08em]">디자이너별 정산</h2>
              {hasStaff ? (
                <p className="mt-2 font-sans-kr text-[12px] text-hu-muted">
                  직원이 아닌 프리랜서만 원천징수(3.3%)를 적용합니다. 4대보험 대상 직원의
                  급여·공제는 급여대장에서 별도 처리하세요.
                </p>
              ) : null}
              <div className="mt-4 overflow-x-auto bg-hu-white">
                <table className="min-w-full text-left font-sans-kr text-[13px]">
                  <thead>
                    <tr className="border-b border-hu-black/10 text-hu-muted">
                      <th className="px-4 py-3 font-normal">디자이너</th>
                      <th className="px-4 py-3 font-normal">고용형태</th>
                      <th className="px-4 py-3 font-normal">매출</th>
                      <th className="px-4 py-3 font-normal">건수</th>
                      <th className="px-4 py-3 font-normal">커미션율</th>
                      <th className="px-4 py-3 font-normal">인센티브</th>
                      <th className="px-4 py-3 font-normal">원천징수(3.3%)</th>
                      <th className="px-4 py-3 font-normal">실지급액</th>
                      <th className="px-4 py-3 font-normal">계좌</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hu-black/10">
                    {data.artists.map((row) => {
                      const open = expandedId === row.artistId;
                      return (
                        <ArtistSettlementBlock
                          key={row.artistId}
                          row={row}
                          open={open}
                          copied={copiedId === row.artistId}
                          onToggle={() =>
                            setExpandedId((cur) => (cur === row.artistId ? null : row.artistId))
                          }
                          onCopyAccount={() => {
                            void copyAccount(row);
                          }}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 font-sans-kr text-[12px] leading-relaxed text-hu-muted">
                원천징수 3.3%는 일반적인 사업소득 기준이며, 실제 신고·납부는 세무 대리인과
                확인하세요.
                <br />
                원천징수한 세액은 지급일이 속한 달의 다음 달 10일까지 신고·납부해야 합니다.
              </p>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-hu-white px-4 py-5 lg:px-5 lg:py-6">
      <p className="font-serif text-[12px] tracking-[0.14em] text-hu-muted">{label}</p>
      <p className="mt-3 font-serif text-[22px] leading-tight lg:text-[26px]">{value}</p>
    </div>
  );
}

function ArtistSettlementBlock({
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
        className={clsx("cursor-pointer hover:bg-hu-beige/40", open && "bg-hu-beige/30")}
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-medium">{row.artistName}</td>
        <td className="px-4 py-3 text-hu-muted">{row.employmentLabel}</td>
        <td className="px-4 py-3 tabular-nums">{won(row.revenue)}</td>
        <td className="px-4 py-3 tabular-nums">{row.count}</td>
        <td className="px-4 py-3 tabular-nums">
          {row.hasCommission ? `${row.commissionRate}%` : "0%"}
        </td>
        <td className="px-4 py-3 tabular-nums">
          {row.incentive != null ? won(row.incentive) : "—"}
        </td>
        <td className="px-4 py-3 tabular-nums">
          {row.withholding != null ? won(row.withholding) : "—"}
        </td>
        <td className="px-4 py-3 tabular-nums">
          {row.netPay != null ? won(row.netPay) : "—"}
        </td>
        <td className="px-4 py-3">
          {row.bankDisplay && row.bankAccount ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyAccount();
              }}
              className="max-w-[220px] truncate text-left text-hu-muted underline-offset-2 hover:underline"
              title="계좌번호 복사"
            >
              {copied ? "복사됨" : row.bankDisplay}
            </button>
          ) : (
            <span className="text-hu-muted">—</span>
          )}
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={9} className="bg-[#faf8f6] px-4 py-4">
            <p className="font-sans-kr text-[12px] text-hu-muted">
              {row.artistName} · 완료 예약 {row.count}건
              {row.isFreelance && row.incomeTax != null && row.localIncomeTax != null
                ? ` · 소득세 ${won(row.incomeTax)} + 지방소득세 ${won(row.localIncomeTax)}`
                : null}
            </p>
            <ul className="mt-3 divide-y divide-hu-black/10 bg-hu-white">
              {row.bookings.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 font-sans-kr text-[13px]"
                >
                  <span className="tabular-nums text-hu-muted">{b.bookingDate.slice(2)}</span>
                  <span>{b.customerName}</span>
                  <span className="text-hu-black/25">·</span>
                  <span className="min-w-0 text-hu-muted">
                    {b.serviceNames.length ? b.serviceNames.join(", ") : "—"}
                  </span>
                  <span className="text-hu-black/25">·</span>
                  <span className="text-hu-muted">{b.paymentMethodLabel}</span>
                  <span className="ml-auto tabular-nums">{won(b.amount)}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      ) : null}
    </>
  );
}
