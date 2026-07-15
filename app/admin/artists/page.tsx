"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

type Artist = {
  id: string;
  name_kr: string;
  name_en: string;
  role: string;
  image_url: string | null;
  instagram_url: string | null;
  sort_order: number;
  is_published: boolean;
};

const emptyForm = {
  id: "",
  name_kr: "",
  name_en: "",
  role: "Stylist",
  image_url: "",
  instagram_url: "",
  sort_order: 0,
  is_published: true
};

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/admin/artists")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setArtists(data.artists);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async () => {
    setError(null);
    const payload = {
      ...form,
      image_url: form.image_url || null,
      instagram_url: form.instagram_url || null,
      sort_order: Number(form.sort_order) || 0
    };

    const res = await fetch(
      editingId ? `/api/admin/artists/${editingId}` : "/api/admin/artists",
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
    if (!confirm("이 디자이너를 삭제할까요?")) return;
    const res = await fetch(`/api/admin/artists/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error || "삭제 실패");
      return;
    }
    load();
  };

  return (
    <div>
      <h1 className="font-serif text-[32px] tracking-[0.06em]">ARTISTS</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">디자이너 관리</p>
      <p className="mt-4 min-h-[20px] font-sans-kr text-[13px] text-[#9b4a4a]">
        {error || "\u00a0"}
      </p>

      <div className="mt-4 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_0.9fr]">
        <ul className="min-h-[520px] divide-y divide-hu-black/10 bg-hu-white">
          {artists.length === 0 ? (
            <li className="px-5 py-8 font-sans-kr text-[13px] text-hu-muted">
              디자이너가 없습니다.
            </li>
          ) : (
            artists.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-serif text-[15px]">
                    {a.name_kr} {a.name_en}
                  </p>
                  <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
                    {a.role} · {a.is_published ? "게시" : "숨김"} · #{a.sort_order}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(a.id);
                      setForm({
                        id: a.id,
                        name_kr: a.name_kr,
                        name_en: a.name_en,
                        role: a.role,
                        image_url: a.image_url || "",
                        instagram_url: a.instagram_url || "",
                        sort_order: a.sort_order,
                        is_published: a.is_published
                      });
                    }}
                    className="px-3 py-1 font-sans-kr text-[12px] text-hu-body underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    className="px-3 py-1 font-sans-kr text-[12px] text-[#9b4a4a]"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>

        <div className="min-h-[520px] bg-hu-white p-6 lg:sticky lg:top-6">
          <p className="font-serif text-[14px] tracking-[0.08em]">
            {editingId ? "EDIT ARTIST" : "NEW ARTIST"}
          </p>
          <div className="mt-4 space-y-4">
            <Field
              label="ID (영문)"
              value={form.id}
              onChange={(v) => setForm((f) => ({ ...f, id: v }))}
              readOnly={Boolean(editingId)}
            />
            <Field
              label="한글명"
              value={form.name_kr}
              onChange={(v) => setForm((f) => ({ ...f, name_kr: v }))}
            />
            <Field
              label="영문명"
              value={form.name_en}
              onChange={(v) => setForm((f) => ({ ...f, name_en: v }))}
            />
            <Field
              label="역할"
              value={form.role}
              onChange={(v) => setForm((f) => ({ ...f, role: v }))}
            />
            <Field
              label="이미지 URL"
              value={form.image_url}
              onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
            />
            <Field
              label="Instagram URL"
              value={form.instagram_url}
              onChange={(v) => setForm((f) => ({ ...f, instagram_url: v }))}
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
