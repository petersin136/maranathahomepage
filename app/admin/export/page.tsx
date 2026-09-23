"use client";

import { useMemo, useState } from "react";
import { todayKst } from "@/lib/admin/sales-data";

function parseYmdParts(ymd: string) {
  const [y, m] = ymd.split("-").map(Number);
  return { y, m };
}

function shiftMonth(year: number, month: number, delta: number) {
  const dt = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1 };
}

/** 마감은 보통 지난달 기준 */
function defaultLastMonth() {
  const { y, m } = parseYmdParts(todayKst());
  return shiftMonth(y, m, -1);
}

export default function AdminExportPage() {
  const initial = useMemo(() => defaultLastMonth(), []);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const current = parseYmdParts(todayKst()).y;
    const years: number[] = [];
    for (let y = current + 1; y >= current - 4; y -= 1) years.push(y);
    return years;
  }, []);

  const moveMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const download = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month)
      });
      const res = await fetch(`/api/admin/export?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "다운로드에 실패했습니다.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const filename = utfMatch
        ? decodeURIComponent(utfMatch[1])
        : `헤어업_${year}년${String(month).padStart(2, "0")}월_마감자료.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="font-serif text-[28px] tracking-[0.06em] lg:text-[32px]">EXPORT</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">
        월 마감 내보내기 · 세무 대리인 전달용 엑셀
      </p>

      <section className="mt-8 bg-hu-white px-5 py-6 lg:px-6">
        <h2 className="font-serif text-[16px] tracking-[0.08em]">대상 월 선택</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="h-9 border border-hu-black/20 bg-hu-white px-3 font-sans-kr text-[13px]"
            aria-label="이전 달"
          >
            ←
          </button>
          <label className="font-sans-kr text-[13px] text-hu-muted">
            년
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="ml-2 h-9 border border-hu-black/20 bg-hu-white px-2.5 outline-none"
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
              onChange={(e) => setMonth(Number(e.target.value))}
              className="ml-2 h-9 border border-hu-black/20 bg-hu-white px-2.5 outline-none"
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
            className="h-9 border border-hu-black/20 bg-hu-white px-3 font-sans-kr text-[13px]"
            aria-label="다음 달"
          >
            →
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void download()}
            className="ml-auto h-9 bg-hu-black px-4 font-sans-kr text-[13px] text-white disabled:bg-[#bcbcbc]"
          >
            {busy ? "생성 중..." : "엑셀 다운로드"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p>
        ) : null}

        <ul className="mt-6 space-y-1.5 font-sans-kr text-[13px] text-hu-muted">
          <li>· 시트: 매출내역 / 지출내역 / 디자이너정산 / 요약</li>
          <li>· 매출·정산은 결제 완료 시각(paid_at) 기준, 지출은 지출일 기준</li>
          <li>· 고객 전화번호는 포함하지 않습니다</li>
          <li>
            · 파일명: 헤어업_{year}년{String(month).padStart(2, "0")}월_마감자료.xlsx
          </li>
        </ul>
      </section>
    </div>
  );
}
