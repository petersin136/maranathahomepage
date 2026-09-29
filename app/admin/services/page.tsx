"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
type Artist = {
  id: string;
  name_kr: string;
  name_en: string;
};

type Service = {
  id: string;
  category: string;
  name: string;
  price: number;
  duration_minutes: number;
  deposit_amount: number | null;
  sort_order: number;
  revisit_days: number | null;
  is_published: boolean;
  artist_prices?: Record<string, number>;
};

const CATEGORIES = ["Cut", "Perm", "Color", "Clinic"] as const;

const CATEGORY_LABEL: Record<(typeof CATEGORIES)[number], string> = {
  Cut: "커트",
  Perm: "펌",
  Color: "컬러",
  Clinic: "클리닉"
};

function categoryLabel(category: string) {
  return CATEGORY_LABEL[category as (typeof CATEGORIES)[number]] ?? category;
}

type FormState = {
  id: string;
  category: string;
  name: string;
  price: number;
  duration_minutes: number;
  deposit_amount: number;
  sort_order: number;
  revisit_days: number | null;
  is_published: boolean;
  artistPrices: Record<string, number>;
};

const emptyForm = (): FormState => ({
  id: "",
  category: "Cut",
  name: "",
  price: 0,
  duration_minutes: 60,
  deposit_amount: 0,
  sort_order: 0,
  revisit_days: null,
  is_published: true,
  artistPrices: {}
});

function priceSummary(s: Service, artists: Artist[]) {
  const prices = artists
    .map((a) => s.artist_prices?.[a.id] ?? s.price)
    .filter((n) => Number.isFinite(n));
  if (!prices.length) return `${s.price.toLocaleString("ko-KR")}원`;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min.toLocaleString("ko-KR")}원`;
  return `${min.toLocaleString("ko-KR")}~${max.toLocaleString("ko-KR")}원`;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const loadArtists = () =>
    fetch("/api/admin/artists")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "디자이너 로드 실패");
        setArtists(
          (data.artists || []).map((a: Artist & { name_kr: string }) => ({
            id: a.id,
            name_kr: a.name_kr,
            name_en: a.name_en
          }))
        );
      })
      .catch((e) => setError(e.message));

  const load = () =>
    fetch("/api/admin/services")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setServices(data.services);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    loadArtists();
    load();
  }, []);

  useEffect(() => {
    if (!editingId && artists.length) {
      setForm((f) => {
        const artistPrices = { ...f.artistPrices };
        for (const a of artists) {
          if (artistPrices[a.id] == null) artistPrices[a.id] = f.price || 0;
        }
        return { ...f, artistPrices };
      });
    }
  }, [artists, editingId]);

  const filtered = useMemo(
    () => (filter === "all" ? services : services.filter((s) => s.category === filter)),
    [services, filter]
  );

  const reset = () => {
    setEditingId(null);
    const base = emptyForm();
    const artistPrices: Record<string, number> = {};
    for (const a of artists) artistPrices[a.id] = 0;
    setForm({ ...base, artistPrices });
  };

  const fillArtistPrices = (base: number, existing?: Record<string, number>) => {
    const artistPrices: Record<string, number> = {};
    for (const a of artists) {
      artistPrices[a.id] = existing?.[a.id] ?? base;
    }
    return artistPrices;
  };

  const save = async () => {
    setError(null);
    const artist_prices = artists.map((a) => ({
      artist_id: a.id,
      price: Number(form.artistPrices[a.id] ?? form.price) || 0
    }));

    // 기본가 = 디자이너 단가 중 최소 (목록/폴백용)
    const prices = artist_prices.map((p) => p.price);
    const basePrice = prices.length ? Math.min(...prices) : Number(form.price) || 0;

    const payload = {
      id: form.id,
      category: form.category,
      name: form.name,
      price: basePrice,
      duration_minutes: Number(form.duration_minutes) || 60,
      deposit_amount: Number(form.deposit_amount) || 0,
      sort_order: Number(form.sort_order) || 0,
      revisit_days:
        form.revisit_days == null || !Number.isFinite(Number(form.revisit_days))
          ? null
          : Math.round(Number(form.revisit_days)),
      is_published: form.is_published,
      artist_prices
    };

    const res = await fetch(
      editingId ? `/api/admin/services/${editingId}` : "/api/admin/services",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error || "저장 실패");
      return;
    }
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("이 시술을 삭제할까요?")) return;
    const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error || "삭제 실패");
      return;
    }
    load();
  };

  return (
    <div className="font-sans-kr text-[#1C1C1C]">
      <h1 className="mt-8 flex items-baseline gap-2 text-[30px] font-bold leading-none tracking-[-0.02em]">
        <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">시술</span>
        <span className="text-[15px] font-normal text-[#8A847C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
          총 {filtered.length}개
        </span>
      </h1>
      {error ? <p className="mt-6 text-[15px] font-medium text-[#E24B4B]">{error}</p> : null}

      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={clsx(
            "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
            filter === "all"
              ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
              : "border-[#9A948C] bg-white text-[#1C1C1C]"
          )}
        >
          전체
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={clsx(
              "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
              filter === c
                ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                : "border-[#9A948C] bg-white text-[#1C1C1C]"
            )}
          >
            {categoryLabel(c)}
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-start gap-8 min-[1440px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]">
                <th className="py-3 pr-4 font-bold">시술명</th>
                <th className="py-3 pr-4 font-bold">가격</th>
                <th className="py-3 pr-4 font-bold">시간</th>
                <th className="py-3 pr-4 font-bold">예약금</th>
                <th className="py-3 pr-4 font-bold">게시</th>
                <th className="py-3 text-right font-bold">관리</th>
              </tr>
            </thead>
            <tbody className="text-[16px] font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-[16px] text-[#8A847C]">
                    시술이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-[#F3EFEA]">
                    <td className="py-[15px] pr-4">
                      {s.name}
                      <span className="ml-2 text-[15px] font-normal text-[#8A847C]">
                        {categoryLabel(s.category)}
                        {s.revisit_days != null ? ` · ${s.revisit_days}일` : ""}
                      </span>
                    </td>
                    <td className="py-[15px] pr-4 whitespace-nowrap">{priceSummary(s, artists)}</td>
                    <td className="py-[15px] pr-4 whitespace-nowrap">{s.duration_minutes}분</td>
                    <td className="py-[15px] pr-4 whitespace-nowrap">
                      {s.deposit_amount != null
                        ? `${s.deposit_amount.toLocaleString("ko-KR")}원`
                        : "—"}
                    </td>
                    <td className="py-[15px] pr-4" style={{ color: s.is_published ? "#1F9D62" : "#8A847C" }}>
                      {s.is_published ? "게시" : "숨김"}
                    </td>
                    <td className="py-[15px] text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(s.id);
                          setForm({
                            id: s.id,
                            category: s.category,
                            name: s.name,
                            price: s.price,
                            duration_minutes: s.duration_minutes,
                            deposit_amount: s.deposit_amount ?? 0,
                            sort_order: s.sort_order,
                            revisit_days: s.revisit_days ?? null,
                            is_published: s.is_published,
                            artistPrices: fillArtistPrices(s.price, s.artist_prices)
                          });
                        }}
                        className="text-[16px] font-normal text-[#8A847C]"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        className="ml-4 text-[16px] font-normal text-[#E24B4B]"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-[12px] border border-[#E4E0DA] px-5 py-5">
          <p className="text-[20px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            {editingId ? "시술 수정" : "시술 추가"}
          </p>
          <div className="mt-5 flex flex-col gap-4">
            <Field
              label="ID"
              value={form.id}
              onChange={(v) => setForm((f) => ({ ...f, id: v }))}
              readOnly={Boolean(editingId)}
            />
            <label className="block text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
              카테고리
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-2 block h-[36px] w-full rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[15px] font-medium text-[#1C1C1C] outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="시술명"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />

            <div>
              <p className="text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                디자이너별 가격
              </p>
              <div className="mt-2 rounded-[8px] border-[1.5px] border-[#9A948C] px-3 py-3">
                {artists.length === 0 ? (
                  <p className="text-[15px] text-[#8A847C]">등록된 디자이너가 없습니다.</p>
                ) : (
                  artists.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="shrink-0 text-[15px] font-medium">
                        {a.name_kr}{" "}
                        <span className="font-normal text-[#8A847C]">{a.name_en}</span>
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={form.artistPrices[a.id] ?? 0}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            artistPrices: {
                              ...f.artistPrices,
                              [a.id]: Number(e.target.value) || 0
                            }
                          }))
                        }
                        className="h-[36px] w-[120px] rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-2 text-right text-[15px] font-medium outline-none"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            <Field
              label="소요시간(분)"
              value={String(form.duration_minutes)}
              onChange={(v) => setForm((f) => ({ ...f, duration_minutes: Number(v) || 60 }))}
            />
            <Field
              label="예약금"
              value={String(form.deposit_amount ?? 0)}
              onChange={(v) => setForm((f) => ({ ...f, deposit_amount: Number(v) || 0 }))}
            />
            <Field
              label="정렬"
              value={String(form.sort_order)}
              onChange={(v) => setForm((f) => ({ ...f, sort_order: Number(v) || 0 }))}
            />
            <Field
              label="재방문 주기 (일)"
              type="number"
              value={form.revisit_days == null || Number.isNaN(form.revisit_days) ? "" : String(form.revisit_days)}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  revisit_days: v.trim() === "" ? null : Number(v)
                }))
              }
            />
            <label className="flex items-center gap-2 text-[15px] font-bold text-[#1C1C1C]">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                className="size-[18px] accent-[#2F3A2F]"
              />
              게시
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                className="inline-flex h-[36px] items-center rounded-[8px] bg-[#2F3A2F] px-4 text-[14px] font-bold text-white"
              >
                저장
              </button>
              <button
                type="button"
                onClick={reset}
                className={clsx(
                  "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] border-[#9A948C] px-4 text-[14px] font-bold text-[#1C1C1C]",
                  !editingId && "invisible"
                )}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  type
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
      {label}
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "mt-2 block h-[36px] w-full rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[15px] font-medium text-[#1C1C1C] outline-none",
          readOnly && "bg-[#F9F8F4] text-[#8A847C]"
        )}
      />
    </label>
  );
}
