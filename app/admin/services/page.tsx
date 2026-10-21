"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import SettingsNav from "@/components/admin/SettingsNav";
import { AdminBellButton } from "@/components/admin/AdminBellButton";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";

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

const PRESET_CATEGORIES = ["Cut", "Perm", "Color", "Clinic", "Etc"] as const;
const CUSTOM_CATEGORY = "__custom__";

const CATEGORY_LABEL: Record<string, string> = {
  Cut: "커트",
  Perm: "펌",
  Color: "컬러",
  Clinic: "클리닉",
  Etc: "기타"
};

function categoryLabel(category: string) {
  return CATEGORY_LABEL[category] ?? category;
}

type FormState = {
  category: string;
  customCategory: string;
  name: string;
  price: number;
  duration_minutes: number;
  deposit_amount: number;
  sort_order: number;
  revisit_days: number | null;
  is_published: boolean;
  artistPrices: Record<string, number>;
};

function emptyForm(artists: Artist[], nextSort: number): FormState {
  return {
    category: "Cut",
    customCategory: "",
    name: "",
    price: 0,
    duration_minutes: 60,
    deposit_amount: 0,
    sort_order: nextSort,
    revisit_days: null,
    is_published: true,
    artistPrices: Object.fromEntries(artists.map((a) => [a.id, 0]))
  };
}

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

function resolvedCategory(form: FormState) {
  if (form.category === CUSTOM_CATEGORY) return form.customCategory.trim();
  return form.category;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [tab, setTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm([], 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const load = () =>
    Promise.all([
      fetch("/api/admin/services").then((r) => r.json()),
      fetch("/api/admin/artists?compact=1").then((r) => r.json())
    ]).then(([svc, art]) => {
      if (svc.ok) setServices(svc.services || []);
      if (art.ok) setArtists(art.artists || []);
      setLoaded(true);
    });

  useEffect(() => {
    void load();
  }, []);

  const extraCategories = useMemo(() => {
    const presets = new Set<string>(PRESET_CATEGORIES);
    return Array.from(new Set(services.map((s) => s.category))).filter((c) => !presets.has(c));
  }, [services]);

  const tabs = useMemo(
    () => [
      { id: "all", label: "전체" },
      ...PRESET_CATEGORIES.map((c) => ({ id: c, label: categoryLabel(c) })),
      ...extraCategories.map((c) => ({ id: c, label: categoryLabel(c) }))
    ],
    [extraCategories]
  );

  const grouped = useMemo(() => {
    const order = [...PRESET_CATEGORIES, ...extraCategories];
    const map = new Map<string, Service[]>();
    for (const key of order) map.set(key, []);
    for (const s of services) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    const keys = tab === "all" ? Array.from(map.keys()).filter((k) => (map.get(k) || []).length) : [tab];
    return keys.map((key) => ({
      key,
      label: categoryLabel(key),
      items: (map.get(key) || []).slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"))
    }));
  }, [services, tab, extraCategories]);

  const visibleCount = tab === "all" ? services.length : services.filter((s) => s.category === tab).length;

  const openCreate = () => {
    const nextSort = services.reduce((max, s) => Math.max(max, s.sort_order), -1) + 1;
    setEditingId(null);
    setForm(emptyForm(artists, nextSort));
    setError(null);
    setFormOpen(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openEdit = (s: Service) => {
    const preset = (PRESET_CATEGORIES as readonly string[]).includes(s.category);
    setEditingId(s.id);
    setForm({
      category: preset ? s.category : CUSTOM_CATEGORY,
      customCategory: preset ? "" : s.category,
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      deposit_amount: s.deposit_amount ?? 0,
      sort_order: s.sort_order,
      revisit_days: s.revisit_days,
      is_published: s.is_published,
      artistPrices: Object.fromEntries(
        artists.map((a) => [a.id, s.artist_prices?.[a.id] ?? s.price])
      )
    });
    setError(null);
    setFormOpen(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const reset = () => {
    setFormOpen(false);
    setEditingId(null);
    setError(null);
    setForm(emptyForm(artists, 0));
  };

  const setBasePrice = (value: number) => {
    setForm((f) => {
      const next = Math.max(0, value);
      const artistPrices = { ...f.artistPrices };
      for (const a of artists) {
        const current = artistPrices[a.id];
        if (current == null || current === 0 || current === f.price) artistPrices[a.id] = next;
      }
      return { ...f, price: next, artistPrices };
    });
  };

  const applyBaseToAll = () => {
    setForm((f) => ({
      ...f,
      artistPrices: Object.fromEntries(artists.map((a) => [a.id, f.price]))
    }));
  };

  const save = async () => {
    const category = resolvedCategory(form);
    if (!form.name.trim()) {
      setError("시술명을 입력해 주세요.");
      return;
    }
    if (!category) {
      setError("카테고리를 선택하거나 직접 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      category,
      name: form.name.trim(),
      price: form.price,
      duration_minutes: form.duration_minutes,
      deposit_amount: form.deposit_amount || null,
      sort_order: form.sort_order,
      revisit_days: form.revisit_days,
      is_published: form.is_published,
      artist_prices: artists.map((a) => ({
        artist_id: a.id,
        price: form.artistPrices[a.id] ?? form.price
      }))
    };
    const res = await fetch(editingId ? `/api/admin/services/${editingId}` : "/api/admin/services", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    setSaving(false);
    if (!json.ok) {
      setError(json.error || "저장에 실패했습니다.");
      return;
    }
    reset();
    void load();
  };

  const remove = async (s: Service) => {
    if (
      !confirm(
        `「${s.name}」을 메뉴에서 삭제할까요?\n지난 예약 기록은 그대로 남고, 앞으로 이 시술은 선택할 수 없습니다.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/services/${s.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) {
      setError(json.error || "삭제에 실패했습니다.");
      return;
    }
    if (editingId === s.id) reset();
    void load();
  };

  const categoryOptions = [
    ...PRESET_CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) })),
    ...extraCategories.map((c) => ({ value: c, label: c })),
    { value: CUSTOM_CATEGORY, label: "직접 입력" }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden font-sans-kr text-[#1C1C1C]">
      <div className="shrink-0 bg-white pb-6">
        <div className="flex items-start justify-between gap-6 pl-[6px]">
          <AdminPageTitle className="flex items-baseline gap-2">
            시술
            <span className="text-[15px] font-normal text-[#8A847C]">총 {services.length}개</span>
          </AdminPageTitle>
          <div className="mt-[24px]">
            <AdminBellButton />
          </div>
        </div>
        <div className="mt-12">
          <SettingsNav />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
                  tab === t.id
                    ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                    : "border-[#9A948C] bg-white text-[#1C1C1C]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-[36px] items-center rounded-[8px] bg-[#2F3A2F] px-4 text-[14px] font-bold text-white"
          >
            시술 추가
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto pb-16 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {error ? (
        <p className="mt-2 text-[14px] font-medium text-[#C45C4A]">{error}</p>
      ) : null}

      {formOpen ? (
        <div
          ref={formRef}
          className="mt-4 overflow-hidden rounded-[12px] border border-[#EFEBE6] bg-[#F9F8F4] shadow-[0_8px_24px_rgba(28,28,28,0.06)]"
        >
          <div className="flex items-center justify-between border-b border-[#E6E1DA] px-6 py-4">
            <p className="text-[18px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
              {editingId ? "시술 수정" : "시술 추가"}
            </p>
            <button
              type="button"
              onClick={reset}
              className="text-[14px] font-medium text-[#8A847C] hover:text-[#1C1C1C]"
            >
              닫기
            </button>
          </div>

          <div className="grid gap-4 px-6 py-6 min-[900px]:grid-cols-2 min-[1200px]:grid-cols-3">
            <SelectField
              label="카테고리"
              value={form.category}
              options={categoryOptions}
              onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            />
            {form.category === CUSTOM_CATEGORY ? (
              <Field
                label="카테고리 이름"
                value={form.customCategory}
                onChange={(v) => setForm((f) => ({ ...f, customCategory: v }))}
                hint="예: 붙임머리, 드라이, 시그니처"
              />
            ) : null}
            <Field
              label="시술명"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <Field
              label="기본가"
              value={form.price ? String(form.price) : ""}
              onChange={(v) => setBasePrice(Number(v.replace(/[^\d]/g, "")) || 0)}
              hint="디자이너 단가의 기준 금액"
            />
            <Field
              label="예약금"
              value={form.deposit_amount ? String(form.deposit_amount) : ""}
              onChange={(v) =>
                setForm((f) => ({ ...f, deposit_amount: Number(v.replace(/[^\d]/g, "")) || 0 }))
              }
            />
            <Field
              label="소요시간(분)"
              value={String(form.duration_minutes)}
              onChange={(v) =>
                setForm((f) => ({ ...f, duration_minutes: Math.max(1, Number(v.replace(/[^\d]/g, "")) || 1) }))
              }
            />
            <Field
              label="재방문(일)"
              value={form.revisit_days == null ? "" : String(form.revisit_days)}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  revisit_days: v.trim() === "" ? null : Number(v.replace(/[^\d]/g, "")) || null
                }))
              }
              hint="비우면 없음"
            />
            <Field
              label="정렬"
              value={String(form.sort_order)}
              onChange={(v) => setForm((f) => ({ ...f, sort_order: Number(v.replace(/[^\d-]/g, "")) || 0 }))}
              hint="숫자가 작을수록 앞에 표시"
            />
            <label className="flex items-end gap-2 pb-[7px] text-[15px] font-bold text-[#1C1C1C]">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                className="size-[18px] accent-[#2F3A2F]"
              />
              홈페이지에 게시
            </label>
          </div>

          <div className="border-t border-[#E6E1DA] px-6 py-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  디자이너별 금액
                </p>
                <p className="mt-2 text-[13px] font-medium text-[#8A847C]">
                  기본가를 먼저 넣고, 디자이너마다 다르게 받을 때만 숫자를 바꾸면 됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={applyBaseToAll}
                className="inline-flex h-[32px] items-center rounded-[8px] border-[1.5px] border-[#9A948C] px-3 text-[13px] font-bold text-[#1C1C1C]"
              >
                기본가로 맞추기
              </button>
            </div>
            {artists.length === 0 ? (
              <p className="mt-4 text-[14px] text-[#8A847C]">등록된 디자이너가 없습니다.</p>
            ) : (
              <ul className="mt-4 grid gap-3 min-[800px]:grid-cols-2">
                {artists.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-[8px] bg-white px-4 py-3"
                  >
                    <span className="min-w-0 truncate text-[15px] font-bold text-[#1C1C1C]">
                      {a.name_kr}
                      <span className="ml-2 text-[13px] font-medium tracking-[0.04em] text-[#8A847C]">
                        {a.name_en}
                      </span>
                    </span>
                    <input
                      value={form.artistPrices[a.id] ? String(form.artistPrices[a.id]) : ""}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(/[^\d]/g, "")) || 0;
                        setForm((f) => ({ ...f, artistPrices: { ...f.artistPrices, [a.id]: n } }));
                      }}
                      inputMode="numeric"
                      className="h-[36px] w-[120px] shrink-0 rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-right text-[15px] font-medium text-[#1C1C1C] outline-none"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-[#E6E1DA] px-6 py-4">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex h-[36px] items-center rounded-[8px] bg-[#2F3A2F] px-5 text-[14px] font-bold text-white disabled:opacity-40"
            >
              {saving ? "저장 중…" : editingId ? "수정 저장" : "시술 등록"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] border-[#9A948C] px-4 text-[14px] font-bold text-[#1C1C1C]"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        {!loaded ? (
          <p className="text-[14px] text-[#8A847C]">불러오는 중…</p>
        ) : visibleCount === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#C9C3BB] bg-[#F9F8F4] px-6 py-16 text-center">
            <p className="text-[16px] font-semibold text-[#1C1C1C]">아직 시술이 없습니다.</p>
            <p className="mt-2 text-[14px] text-[#8A847C]">시술 추가로 매장 메뉴를 만들어 보세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {grouped.map((group) => (
              <section key={group.key}>
                <h2 className="mb-3 text-[16px] font-bold leading-none text-[#2F3A2F] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  {group.label}
                  <span className="ml-2 text-[13px] font-medium text-[#8A847C]">{group.items.length}개</span>
                </h2>
                <ul className="overflow-hidden rounded-[12px] border border-[#EFEBE6] bg-white">
                  {group.items.map((s, idx) => (
                      <li
                        key={s.id}
                        className={clsx("px-5 py-4", idx > 0 && "border-t border-[#EFEBE6]")}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[16px] font-bold leading-normal text-[#1C1C1C]">
                                {s.name}
                              </p>
                              <span
                                className={clsx(
                                  "rounded-[4px] px-2 py-[3px] text-[12px] font-semibold",
                                  s.is_published
                                    ? "bg-[#EAF5EF] text-[#1F9D62]"
                                    : "bg-[#F3EFEA] text-[#8A847C]"
                                )}
                              >
                                {s.is_published ? "게시" : "숨김"}
                              </span>
                            </div>
                            <p className="mt-1.5 text-[13px] font-medium leading-normal text-[#8A847C]">
                              {s.duration_minutes}분
                              {s.revisit_days ? ` · 재방문 ${s.revisit_days}일` : ""}
                              {s.deposit_amount ? ` · 예약금 ${won(s.deposit_amount)}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <p className="text-[16px] font-bold tabular-nums text-[#1C1C1C]">{won(s.price)}</p>
                            <button
                              type="button"
                              onClick={() => openEdit(s)}
                              className="inline-flex h-[32px] items-center rounded-[8px] border-[1.5px] border-[#9A948C] px-3 text-[13px] font-bold text-[#1C1C1C]"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(s)}
                              className="inline-flex h-[32px] items-center rounded-[8px] px-3 text-[13px] font-bold text-[#C45C4A] hover:bg-[#F8EEEA]"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                        {artists.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {artists.map((a) => (
                              <span
                                key={`${s.id}-${a.id}`}
                                className="inline-flex h-[28px] items-center rounded-[6px] bg-[#F6F4F0] px-2.5 text-[12px] font-medium text-[#5C574F]"
                              >
                                {a.name_kr} {won(s.artist_prices?.[a.id] ?? s.price)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block h-[36px] w-full rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[15px] font-medium text-[#1C1C1C] outline-none"
      />
      {hint ? <span className="mt-1.5 block text-[12px] font-medium leading-none text-[#B5AFA7]">{hint}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <p className="text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        {label}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 flex h-[36px] w-full items-center rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-left text-[15px] font-medium text-[#1C1C1C]"
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label || "선택"}</span>
        <span className={clsx("ml-2 text-[12px] text-[#9A948C]", open && "rotate-180")}>▾</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-[220px] w-full overflow-auto rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={`${o.value}-${o.label}`}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center justify-between px-4 py-2 text-left text-[14px] hover:bg-[#F6F4F0]",
                  on ? "font-bold text-[#1C1C1C]" : "font-medium text-[#3A3A3A]"
                )}
              >
                {o.label}
                {on ? <span className="text-[12px] text-[#2F3A2F]">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
