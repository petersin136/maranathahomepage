"use client";

import { useMemo, useState } from "react";
import {
  FieldList,
  FinanceHeader,
  Icon,
  MonthPicker,
  Note,
  PrimaryButton,
  Section,
  Toolbar,
  shiftMonth
} from "@/components/admin/finance-ui";
import { todayKst } from "@/lib/admin/sales-data";

/** 마감은 보통 지난달 기준 */
function defaultLastMonth() {
  const [y, m] = todayKst().split("-").map(Number);
  return shiftMonth(y, m, -1);
}

function lastDay(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export default function AdminExportPage() {
  const initial = useMemo(() => defaultLastMonth(), []);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const mm = String(month).padStart(2, "0");
  const defaultName = `헤어업_${year}년${mm}월_마감자료.xlsx`;

  const download = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      const res = await fetch(`/api/admin/export?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "다운로드에 실패했습니다.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const filename = utfMatch ? decodeURIComponent(utfMatch[1]) : defaultName;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <FinanceHeader subtitle="월 마감 · 세무 대리인 전달용" />

      <Toolbar
        left={
          <MonthPicker
            year={year}
            month={month}
            onChange={(y, m) => {
              setYear(y);
              setMonth(m);
              setDone(null);
            }}
          />
        }
        right={
          <PrimaryButton disabled={busy} onClick={() => void download()} className="w-[136px]">
            <Icon src="/admin-icons/lnb/exit.png" className="h-[14px] w-[14px]" />
            {busy ? "생성 중..." : "엑셀 다운로드"}
          </PrimaryButton>
        }
      />

      {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}
      {done ? <p className="mt-4 text-[13px] text-[#8A847C]">{done} 파일을 내려받았습니다.</p> : null}

      <Section title="포함 내용" meta={`${year}년 ${month}월`} className="mt-10">
        <FieldList
          rows={[
            { label: "대상 기간", value: `${year}. ${mm}. 01 ~ ${year}. ${mm}. ${lastDay(year, month)}` },
            { label: "시트 구성", value: "매출내역 · 지출내역 · 디자이너정산 · 요약" },
            { label: "집계 기준", value: "매출·정산은 결제 완료 시각, 지출은 지출일 기준" },
            { label: "개인정보", value: "고객 전화번호는 포함하지 않습니다" },
            { label: "파일명", value: defaultName }
          ]}
        />
        <Note>마감은 보통 지난달 기준이라 기본값으로 지난달이 선택되어 있습니다.</Note>
      </Section>
    </div>
  );
}
