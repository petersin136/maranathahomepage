"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaxType } from "@/lib/admin/tax-data";

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
    <div>
      <h1 className="font-serif text-[28px] tracking-[0.06em] lg:text-[32px]">SETTINGS</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">사업자 정보</p>

      {error ? <p className="mt-6 font-sans-kr text-[13px] text-[#9b4a4a]">{error}</p> : null}
      {loading ? (
        <p className="mt-6 font-sans-kr text-[13px] text-hu-muted">불러오는 중…</p>
      ) : (
        <section className="mt-8 bg-hu-white px-5 py-5 lg:px-6 lg:py-6">
          <h2 className="font-serif text-[16px] tracking-[0.08em]">사업자 설정</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="font-sans-kr text-[13px] text-hu-muted">
              상호
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1.5 block h-9 w-[180px] border border-hu-black/20 bg-hu-white px-2.5 text-hu-black outline-none"
              />
            </label>
            <label className="font-sans-kr text-[13px] text-hu-muted">
              사업자번호
              <input
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="000-00-00000"
                className="mt-1.5 block h-9 w-[160px] border border-hu-black/20 bg-hu-white px-2.5 text-hu-black outline-none"
              />
            </label>
            <label className="font-sans-kr text-[13px] text-hu-muted">
              과세유형
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as TaxType | "")}
                className="mt-1.5 block h-9 border border-hu-black/20 bg-hu-white px-2.5 text-hu-black outline-none"
              >
                <option value="">선택</option>
                <option value="general">일반과세자</option>
                <option value="simplified">간이과세자</option>
              </select>
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSettings()}
              className="h-9 bg-hu-black px-4 font-sans-kr text-[13px] text-white disabled:bg-[#bcbcbc]"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
          {message ? (
            <p className="mt-4 font-sans-kr text-[13px] text-hu-muted">{message}</p>
          ) : (
            <p className="mt-4 font-sans-kr text-[13px] text-hu-muted">
              상호·사업자번호·과세유형은 세무 추정과 월 마감 엑셀 요약에 사용됩니다.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
