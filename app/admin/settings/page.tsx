"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import SettingsNav from "@/components/admin/SettingsNav";
import { AdminBellButton } from "@/components/admin/AdminBellButton";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import type { TaxType } from "@/lib/admin/tax-data";

const inputClass =
  "mt-2 block h-[40px] w-full rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[15px] font-medium text-[#1C1C1C] outline-none";

const labelClass =
  "block text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";

const TAX_LABEL: Record<TaxType, string> = {
  general: "일반과세자",
  simplified: "간이과세자"
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [taxType, setTaxType] = useState<TaxType | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tax");
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "로드 실패");
      setBusinessName(json.settings?.business_name || "");
      setBusinessNumber(json.settings?.business_number || "");
      setTaxType(json.settings?.tax_type || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          business_number: businessNumber,
          tax_type: taxType || null,
          vat_rate: taxType === "general" ? 0.1 : taxType === "simplified" ? 0.3 : null
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "저장 실패");
      setMessage("저장되었습니다.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const previewName = businessName.trim() || "상호 미입력";
  const previewNumber = businessNumber.trim() || "사업자번호 미입력";
  const previewTax = taxType ? TAX_LABEL[taxType] : "과세유형 미선택";
  const filled = Boolean(businessName.trim() && businessNumber.trim() && taxType);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden font-sans-kr text-[#1C1C1C]">
      <div className="flex shrink-0 items-start justify-between gap-6 pl-[6px]">
        <AdminPageTitle>사업자 정보</AdminPageTitle>
        <div className="mt-[24px]">
          <AdminBellButton />
        </div>
      </div>
      <div className="mt-12 shrink-0">
        <SettingsNav />
      </div>
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {error ? <p className="mt-6 text-[15px] font-medium text-[#E24B4B]">{error}</p> : null}

        {loading ? (
          <p className="mt-8 text-[15px] text-[#8A847C]">불러오는 중…</p>
        ) : (
          <>
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)_360px] items-stretch gap-6">
            <section className="min-w-0 rounded-[12px] border border-[#E4E0DA] px-8 py-8">
              <div className="border-b border-[#F3EFEA] pb-6">
                <h2 className="text-[20px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  기본 정보
                </h2>
                <p className="mt-3 text-[14px] leading-[22px] text-[#8A847C]">
                  세무 추정과 월 마감 엑셀에 표시되는 매장 정보입니다.
                </p>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6">
                <label className={labelClass}>
                  상호
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="예: 헤어업 강남점"
                    className={clsx(inputClass, "placeholder:font-medium placeholder:text-[#C9C3BB]")}
                  />
                </label>
                <label className={labelClass}>
                  사업자번호
                  <input
                    type="text"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    placeholder="000-00-00000"
                    className={clsx(inputClass, "placeholder:font-bold placeholder:text-[#9A948C]")}
                  />
                </label>
                <label className={clsx(labelClass, "col-span-2 max-w-[360px]")}>
                  과세유형
                  <select
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value as TaxType | "")}
                    className={inputClass}
                  >
                    <option value="">선택</option>
                    <option value="general">일반과세자</option>
                    <option value="simplified">간이과세자</option>
                  </select>
                </label>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#F3EFEA] pt-6">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveSettings()}
                  className="inline-flex h-[40px] min-w-[96px] items-center justify-center rounded-[8px] bg-[#2F3A2F] px-5 text-[14px] font-bold leading-none text-white [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] disabled:bg-[#C9C3BB]"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
                {message ? (
                  <p className="text-[14px] font-medium text-[#1F9D62] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                    {message}
                  </p>
                ) : (
                  <p className="text-[14px] leading-[20px] text-[#8A847C]">
                    변경 사항은 저장 후 세무·정산 화면에 바로 반영됩니다.
                  </p>
                )}
              </div>
            </section>

            <aside className="flex flex-col rounded-[12px] bg-[#F9F8F4] px-6 py-6">
              <p className="text-[13px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                입력 미리보기
              </p>
              <p
                className={clsx(
                  "mt-5 text-[22px] font-bold leading-[28px] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
                  businessName.trim() ? "text-[#1C1C1C]" : "text-[#C9C3BB]"
                )}
              >
                {previewName}
              </p>
              <dl className="mt-6 space-y-4 border-t border-[#E6E1DA] pt-5">
                <div>
                  <dt className="text-[13px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                    사업자번호
                  </dt>
                  <dd
                    className={clsx(
                      "mt-2 text-[15px] font-medium leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
                      businessNumber.trim() ? "text-[#1C1C1C]" : "text-[#C9C3BB]"
                    )}
                  >
                    {previewNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                    과세유형
                  </dt>
                  <dd
                    className={clsx(
                      "mt-2 text-[15px] font-medium leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
                      taxType ? "text-[#1C1C1C]" : "text-[#C9C3BB]"
                    )}
                  >
                    {previewTax}
                  </dd>
                </div>
              </dl>

              <div className="mt-7 border-t border-[#E6E1DA] pt-5">
                <p className="text-[13px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  어디에 쓰이나요
                </p>
                <ul className="mt-4 space-y-3">
                  <li className="text-[14px] leading-[20px] text-[#3A3A3A]">
                    <span className="font-bold text-[#1C1C1C]">세무 추정</span>
                    <span className="mt-1 block text-[#8A847C]">부가세·종합소득세 예상액 계산</span>
                  </li>
                  <li className="text-[14px] leading-[20px] text-[#3A3A3A]">
                    <span className="font-bold text-[#1C1C1C]">월 마감 엑셀</span>
                    <span className="mt-1 block text-[#8A847C]">요약 시트 상호·사업자번호 표기</span>
                  </li>
                </ul>
              </div>

              <p
                className={clsx(
                  "mt-auto pt-7 text-[13px] font-medium leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
                  filled ? "text-[#1F9D62]" : "text-[#8A847C]"
                )}
              >
                {filled ? "필수 항목이 모두 입력되었습니다." : "상호·사업자번호·과세유형을 모두 입력해 주세요."}
              </p>
            </aside>
          </div>

          <div className="mt-6 mb-10 grid grid-cols-3 gap-3">
            {[
              {
                href: "/admin/tax",
                title: "세무 추정",
                desc: "부가세·소득세 예상액과 일정을 확인합니다."
              },
              {
                href: "/admin/artists",
                title: "디자이너",
                desc: "근무 디자이너와 휴무·점심 시간을 관리합니다."
              },
              {
                href: "/admin/services",
                title: "시술",
                desc: "시술 메뉴와 가격·예약금을 관리합니다."
              }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href as never}
                className="rounded-[12px] border border-[#E4E0DA] bg-white px-5 py-5 transition hover:bg-[#F9F8F4]"
              >
                <p className="text-[15px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  {item.title}
                </p>
                <p className="mt-3 text-[13px] leading-[20px] text-[#8A847C]">{item.desc}</p>
              </Link>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
