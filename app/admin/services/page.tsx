"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";

type Service = {
  id: string;
  category: string;
  name: string;
  price: number;
  duration_minutes: number;
  deposit_amount: number | null;
  sort_order: number;
  is_published: boolean;
};

const CATEGORIES = ["Cut", "Perm", "Color", "Clinic"] as const;

const emptyForm = {
  id: "",
  category: "Cut",
  name: "",
  price: 0,
  duration_minutes: 60,
  deposit_amount: 0,
  sort_order: 0,
  is_published: true
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/admin/services")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setServices(data.services);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? services : services.filter((s) => s.category === filter)),
    [services, filter]
  );

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async () => {
    setError(null);
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      duration_minutes: Number(form.duration_minutes) || 60,
      deposit_amount:
        form.deposit_amount === null || form.deposit_amount === ("" as unknown as number)
          ? null
          : Number(form.deposit_amount),
      sort_order: Number(form.sort_order) || 0
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
    <div>
      <h1 className="font-serif text-[32px] tracking-[0.06em]">SERVICES</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">시술 메뉴 관리</p>
      <p className="mt-4 min-h-[20px] font-sans-kr text-[13px] text-[#9b4a4a]">
        {error || "\u00a0"}
      </p>

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={clsx(
            "px-3 py-1 font-serif text-[12px]",
            filter === "all" ? "bg-hu-black text-white" : "bg-hu-beige"
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={clsx(
              "px-3 py-1 font-serif text-[12px]",
              filter === c ? "bg-hu-black text-white" : "bg-hu-beige"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.2fr_0.9fr]">
        <ul className="min-h-[560px] divide-y divide-hu-black/10 bg-hu-white">
          {filtered.length === 0 ? (
            <li className="px-5 py-8 font-sans-kr text-[13px] text-hu-muted">시술이 없습니다.</li>
          ) : (
            filtered.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-serif text-[14px] text-hu-accent">{s.category}</p>
                  <p className="mt-1 truncate font-sans-kr text-[14px]">{s.name}</p>
                  <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
                    {s.price.toLocaleString("ko-KR")}원 · {s.duration_minutes}분 · 예약금{" "}
                    {s.deposit_amount != null
                      ? `${s.deposit_amount.toLocaleString("ko-KR")}원`
                      : "—"}{" "}
                    · {s.is_published ? "게시" : "숨김"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
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
                        is_published: s.is_published
                      });
                    }}
                    className="px-3 py-1 font-sans-kr text-[12px] underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="px-3 py-1 font-sans-kr text-[12px] text-[#9b4a4a]"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>

        <div className="min-h-[560px] bg-hu-white p-6 lg:sticky lg:top-6">
          <p className="font-serif text-[14px] tracking-[0.08em]">
            {editingId ? "EDIT SERVICE" : "NEW SERVICE"}
          </p>
          <div className="mt-4 space-y-4">
            <Field
              label="ID"
              value={form.id}
              onChange={(v) => setForm((f) => ({ ...f, id: v }))}
              readOnly={Boolean(editingId)}
            />
            <div>
              <label className="font-sans-kr text-[11px] text-hu-muted">카테고리</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 w-full border-b border-hu-black/30 bg-transparent py-1.5 font-sans-kr text-[14px] outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="시술명"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <Field
              label="가격"
              value={String(form.price)}
              onChange={(v) => setForm((f) => ({ ...f, price: Number(v) || 0 }))}
            />
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
            <label className="flex items-center gap-2 font-sans-kr text-[13px]">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
              />
              게시
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={save}
                className="bg-hu-black px-5 py-2 font-sans-kr text-[13px] text-white"
              >
                저장
              </button>
              <button
                type="button"
                onClick={reset}
                className={clsx(
                  "px-5 py-2 font-sans-kr text-[13px] text-hu-muted",
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
  readOnly
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="font-sans-kr text-[11px] text-hu-muted">{label}</label>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "mt-1 w-full border-b border-hu-black/30 bg-transparent py-1.5 font-sans-kr text-[14px] outline-none",
          readOnly && "text-hu-muted"
        )}
      />
    </div>
  );
}
