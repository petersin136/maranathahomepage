"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import SettingsNav from "@/components/admin/SettingsNav";

type Artist = {
  id: string;
  name_kr: string;
  name_en: string;
  role: string;
  image_url: string | null;
  instagram_url: string | null;
  sort_order: number;
  is_published: boolean;
  lunch_start: string | null;
  lunch_minutes: number | null;
  day_off: number | null;
};

const emptyForm: {
  id: string;
  name_kr: string;
  name_en: string;
  role: string;
  image_url: string;
  instagram_url: string;
  sort_order: number;
  is_published: boolean;
  lunch_start: string;
  lunch_minutes: number;
  day_off: number | null;
} = {
  id: "",
  name_kr: "",
  name_en: "",
  role: "Stylist",
  image_url: "",
  instagram_url: "",
  sort_order: 0,
  is_published: true,
  lunch_start: "",
  lunch_minutes: 30,
  day_off: null
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
      sort_order: Number(form.sort_order) || 0,
      lunch_start: form.lunch_start || null,
      lunch_minutes: Number(form.lunch_minutes) || 30,
      day_off: form.day_off
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
    <div className="font-sans-kr text-[#1C1C1C]">
      <SettingsNav />
      <h1 className="mt-8 flex items-baseline gap-2 text-[30px] font-bold leading-none tracking-[-0.02em]">
        <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">디자이너</span>
        <span className="text-[15px] font-normal text-[#8A847C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
          총 {artists.length}명
        </span>
      </h1>
      {error ? <p className="mt-6 text-[15px] font-medium text-[#E24B4B]">{error}</p> : null}

      <div className="mt-8 grid items-start gap-8 min-[1440px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]">
                <th className="py-3 pr-4 font-bold">이름</th>
                <th className="py-3 pr-4 font-bold">역할</th>
                <th className="py-3 pr-4 font-bold">게시</th>
                <th className="py-3 pr-4 font-bold">정렬</th>
                <th className="py-3 text-right font-bold">관리</th>
              </tr>
            </thead>
            <tbody className="text-[16px] font-medium">
              {artists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-[16px] text-[#8A847C]">
                    디자이너가 없습니다.
                  </td>
                </tr>
              ) : (
                artists.map((a) => (
                  <tr key={a.id} className="border-b border-[#F3EFEA]">
                    <td className="py-[15px] pr-4">
                      {a.name_kr}
                      <span className="ml-2 text-[15px] font-normal text-[#8A847C]">{a.name_en}</span>
                    </td>
                    <td className="py-[15px] pr-4">{a.role}</td>
                    <td className="py-[15px] pr-4" style={{ color: a.is_published ? "#1F9D62" : "#8A847C" }}>
                      {a.is_published ? "게시" : "숨김"}
                    </td>
                    <td className="py-[15px] pr-4">{a.sort_order}</td>
                    <td className="py-[15px] text-right">
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
                            is_published: a.is_published,
                            lunch_start: a.lunch_start ? a.lunch_start.slice(0, 5) : "",
                            lunch_minutes: a.lunch_minutes ?? 30,
                            day_off: a.day_off ?? null
                          });
                        }}
                        className="text-[16px] font-normal text-[#8A847C]"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(a.id)}
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
            {editingId ? "디자이너 수정" : "디자이너 추가"}
          </p>
          <div className="mt-5 flex flex-col gap-4">
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
            <Field
              label="점심 시작 (예: 12:00, 비우면 없음)"
              value={form.lunch_start}
              onChange={(v) => setForm((f) => ({ ...f, lunch_start: v }))}
            />
            <Field
              label="점심 시간(분)"
              value={String(form.lunch_minutes)}
              onChange={(v) => setForm((f) => ({ ...f, lunch_minutes: Number(v) || 0 }))}
            />
            <label className="block text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
              정기 휴무
              <select
                value={form.day_off == null ? "" : String(form.day_off)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, day_off: e.target.value === "" ? null : Number(e.target.value) }))
                }
                className="mt-2 block h-[36px] w-full rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[15px] font-medium text-[#1C1C1C] outline-none"
              >
                <option value="">없음</option>
                <option value="0">일요일</option>
                <option value="1">월요일</option>
                <option value="2">화요일</option>
                <option value="3">수요일</option>
                <option value="4">목요일</option>
                <option value="5">금요일</option>
                <option value="6">토요일</option>
              </select>
            </label>
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
  readOnly
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="block text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
      {label}
      <input
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
