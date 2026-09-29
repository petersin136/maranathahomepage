"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaxType } from "@/lib/admin/tax-data";

const inputClass =
  "mt-2 block h-[36px] w-full rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[15px] font-medium text-[#1C1C1C] outline-none";

const labelClass =
  "block text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";

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
          vat_rate: taxType === "general" ? 10 : taxType === "simplified" ? 30 : null
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

  return (
    <div className="font-sans-kr text-[#1C1C1C]">
      <h1 className="mt-8 text-[30px] font-bold leading-none tracking-[-0.02em] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        사업자 정보
      </h1>

      {error ? <p className="mt-6 text-[15px] font-medium text-[#E24B4B]">{error}</p> : null}
      {loading ? (
        <p className="mt-8 text-[15px] text-[#8A847C]">불러오는 중…</p>
      ) : (
        <section className="mt-8 max-w-[520px] rounded-[12px] border border-[#E4E0DA] px-6 py-6">
          <div className="flex flex-col gap-5">
            <label className={labelClass}>
              상호
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              사업자번호
              <input
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="000-00-00000"
                className={`${inputClass} placeholder:font-bold placeholder:text-[#9A948C]`}
              />
            </label>
            <label className={labelClass}>
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
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveSettings()}
            className="mt-6 inline-flex h-[36px] items-center rounded-[8px] bg-[#2F3A2F] px-4 text-[14px] font-bold leading-none text-white [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] disabled:bg-[#C9C3BB]"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          <p className="mt-4 text-[15px] leading-none text-[#8A847C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            {message || "상호·사업자번호·과세유형은 세무 추정과 월 마감 엑셀 요약에 사용됩니다."}
          </p>
        </section>
      )}
    </div>
  );
}
