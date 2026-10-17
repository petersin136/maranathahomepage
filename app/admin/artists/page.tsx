"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import SettingsNav from "@/components/admin/SettingsNav";
import { AdminBellButton } from "@/components/admin/AdminBellButton";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";

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

const ROLE_OPTIONS = [
  "Owner & Senior Stylist",
  "Senior Stylist",
  "Stylist",
  "Junior Stylist",
  "Assistant"
] as const;

const DAY_OFF_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "없음" },
  { value: 0, label: "일요일" },
  { value: 1, label: "월요일" },
  { value: 2, label: "화요일" },
  { value: 3, label: "수요일" },
  { value: 4, label: "목요일" },
  { value: 5, label: "금요일" },
  { value: 6, label: "토요일" }
];

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

const DAY_OFF_LABEL: Record<number, string> = {
  0: "일",
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: "토"
};

/** DB에 URL이 없어도 /public/artists 시드 파일을 우선 표시 */
function resolveArtistPhoto(id: string, imageUrl: string | null | undefined) {
  if (imageUrl) return imageUrl;
  if (id === "jay") return "/artists/jay.png";
  if (id === "seoa") return "/artists/seoa.jpg";
  if (id === "kai") return "/artists/kai.jpg";
  if (id === "yumi") return "/artists/yumi.jpg";
  return null;
}

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

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
    setFormOpen(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const openEdit = (a: Artist) => {
    setEditingId(a.id);
    setForm({
      id: a.id,
      name_kr: a.name_kr,
      name_en: a.name_en,
      role: a.role,
      image_url: a.image_url || resolveArtistPhoto(a.id, a.image_url) || "",
      instagram_url: a.instagram_url || "",
      sort_order: a.sort_order,
      is_published: a.is_published,
      lunch_start: a.lunch_start ? a.lunch_start.slice(0, 5) : "",
      lunch_minutes: a.lunch_minutes ?? 30,
      day_off: a.day_off ?? null
    });
    setFormOpen(true);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const save = async () => {
    setError(null);
    if (photoUploading || form.image_url.startsWith("blob:")) {
      setError("사진 업로드가 끝날 때까지 기다려 주세요.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      image_url: form.image_url || null,
      instagram_url: form.instagram_url || null,
      sort_order: Number(form.sort_order) || 0,
      lunch_start: form.lunch_start || null,
      lunch_minutes: Number(form.lunch_minutes) || 30,
      day_off: form.day_off
    };

    try {
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
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("이 디자이너를 삭제할까요?")) return;
    const res = await fetch(`/api/admin/artists/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error || "삭제 실패");
      return;
    }
    if (editingId === id) reset();
    load();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden font-sans-kr text-[#1C1C1C]">
      <div className="shrink-0 bg-white pb-6">
        <div className="flex items-start justify-between gap-6 pl-[6px]">
          <AdminPageTitle className="flex items-baseline gap-2">
            디자이너
            <span className="text-[15px] font-normal text-[#8A847C]">총 {artists.length}명</span>
          </AdminPageTitle>
          <div className="mt-[24px]">
            <AdminBellButton />
          </div>
        </div>
        <div className="mt-12">
          <SettingsNav />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {error ? <p className="mt-2 text-[15px] font-medium text-[#E24B4B]">{error}</p> : null}

        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-[15px] font-medium text-[#8A847C]">
            홈페이지에 노출되는 디자이너 프로필입니다. 증명사진처럼 얼굴이 선명한 사진을 등록해 주세요.
          </p>
          <button
            type="button"
            onClick={() => (formOpen && !editingId ? reset() : openCreate())}
            className={clsx(
              "inline-flex h-[36px] shrink-0 items-center gap-2 rounded-[8px] px-4 text-[14px] font-bold",
              formOpen && !editingId
                ? "border-[1.5px] border-[#9A948C] bg-white text-[#1C1C1C]"
                : "bg-[#2F3A2F] text-white"
            )}
          >
            {formOpen && !editingId ? "닫기" : "디자이너 추가"}
            <span className={clsx("text-[12px] leading-none", formOpen && !editingId && "rotate-180")}>▾</span>
          </button>
        </div>

        {formOpen ? (
          <div
            ref={formRef}
            className="mt-4 overflow-hidden rounded-[12px] border border-[#EFEBE6] bg-[#F9F8F4] shadow-[0_8px_24px_rgba(28,28,28,0.06)]"
          >
            <div className="flex items-center justify-between border-b border-[#E6E1DA] px-6 py-4">
              <p className="text-[18px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                {editingId ? "디자이너 수정" : "디자이너 추가"}
              </p>
              <button
                type="button"
                onClick={reset}
                className="text-[14px] font-medium text-[#8A847C] hover:text-[#1C1C1C]"
              >
                닫기
              </button>
            </div>

            <div className="grid gap-8 px-6 py-6 min-[1100px]:grid-cols-[200px_minmax(0,1fr)]">
              <ProfilePhotoField
                artistId={form.id || editingId || "new"}
                nameKr={form.name_kr}
                nameEn={form.name_en}
                imageUrl={form.image_url}
                uploading={photoUploading}
                onUploading={setPhotoUploading}
                onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
                onError={setError}
              />

              <div className="grid gap-4 min-[900px]:grid-cols-2">
                <Field
                  label="ID (영문)"
                  value={form.id}
                  onChange={(v) => setForm((f) => ({ ...f, id: v }))}
                  readOnly={Boolean(editingId)}
                  hint="영문 소문자 · 홈페이지 URL에 쓰입니다"
                />
                <SelectField
                  label="역할"
                  value={form.role}
                  options={[
                    ...ROLE_OPTIONS.map((r) => ({ value: r, label: r })),
                    ...(ROLE_OPTIONS as readonly string[]).includes(form.role)
                      ? []
                      : [{ value: form.role, label: form.role || "직접 입력" }]
                  ]}
                  onChange={(v) => setForm((f) => ({ ...f, role: v }))}
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
                  label="Instagram URL"
                  value={form.instagram_url}
                  onChange={(v) => setForm((f) => ({ ...f, instagram_url: v }))}
                />
                <Field
                  label="정렬"
                  value={String(form.sort_order)}
                  onChange={(v) => setForm((f) => ({ ...f, sort_order: Number(v) || 0 }))}
                  hint="숫자가 작을수록 앞에 표시"
                />
                <Field
                  label="점심 시작"
                  value={form.lunch_start}
                  onChange={(v) => setForm((f) => ({ ...f, lunch_start: v }))}
                  hint="예: 12:00 · 비우면 없음"
                />
                <Field
                  label="점심 시간(분)"
                  value={String(form.lunch_minutes)}
                  onChange={(v) => setForm((f) => ({ ...f, lunch_minutes: Number(v) || 0 }))}
                />
                <SelectField
                  label="정기 휴무"
                  value={form.day_off == null ? "" : String(form.day_off)}
                  options={DAY_OFF_OPTIONS.map((o) => ({
                    value: o.value == null ? "" : String(o.value),
                    label: o.label
                  }))}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, day_off: v === "" ? null : Number(v) }))
                  }
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
            </div>

            <div className="flex items-center gap-2 border-t border-[#E6E1DA] px-6 py-4">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || photoUploading}
                className="inline-flex h-[36px] items-center rounded-[8px] bg-[#2F3A2F] px-5 text-[14px] font-bold text-white disabled:opacity-40"
              >
                {saving ? "저장 중…" : "저장"}
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
          {artists.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#C9C3BB] bg-[#F9F8F4] px-6 py-16 text-center">
              <p className="text-[16px] font-semibold text-[#1C1C1C]">등록된 디자이너가 없습니다.</p>
              <p className="mt-2 text-[14px] text-[#8A847C]">위 버튼으로 첫 디자이너를 추가해 보세요.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1280px]:grid-cols-3">
              {artists.map((a) => {
                const photo = resolveArtistPhoto(a.id, a.image_url);
                return (
                <li
                  key={a.id}
                  className="overflow-hidden rounded-[12px] border border-[#EFEBE6] bg-white"
                >
                  <div className="flex gap-4 p-4">
                    <div className="relative h-[112px] w-[88px] shrink-0 overflow-hidden rounded-[8px] bg-[#F3EFEA]">
                      {photo ? (
                        <img
                          src={photo}
                          alt={`${a.name_kr} ${a.name_en}`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[22px] font-bold text-[#C9C3BB]">
                          {(a.name_kr || a.name_en || "?").slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[17px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                            {a.name_kr}
                            <span className="ml-2 text-[14px] font-medium tracking-[0.04em] text-[#8A847C]">
                              {a.name_en}
                            </span>
                          </p>
                          <p className="mt-2 text-[14px] font-medium text-[#9A948C]">{a.role}</p>
                        </div>
                        <span
                          className={clsx(
                            "shrink-0 rounded-[4px] px-2 py-[3px] text-[12px] font-semibold",
                            a.is_published
                              ? "bg-[#EAF5EF] text-[#1F9D62]"
                              : "bg-[#F3EFEA] text-[#8A847C]"
                          )}
                        >
                          {a.is_published ? "게시" : "숨김"}
                        </span>
                      </div>
                      <p className="mt-3 text-[13px] text-[#8A847C]">
                        정렬 {a.sort_order}
                        {a.day_off != null ? ` · 휴무 ${DAY_OFF_LABEL[a.day_off]}요일` : ""}
                        {a.lunch_start
                          ? ` · 점심 ${a.lunch_start.slice(0, 5)} ${a.lunch_minutes ?? 30}분`
                          : ""}
                      </p>
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="text-[14px] font-medium text-[#8A847C] hover:text-[#1C1C1C]"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(a.id)}
                          className="text-[14px] font-medium text-[#E24B4B]"
                        >
                          삭제
                        </button>
                        {a.instagram_url ? (
                          <a
                            href={a.instagram_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-auto text-[13px] font-medium text-[#9A948C] hover:text-[#1C1C1C]"
                          >
                            Instagram
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </section>

        <section className="mt-10 mb-8 rounded-[12px] border border-[#EFEBE6] bg-[#F9F8F4] px-6 py-6">
          <p className="text-[16px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            디자이너 계약·근무 참고
          </p>
          <p className="mt-3 text-[14px] leading-[22px] text-[#8A847C]">
            매장 운영자가 디자이너를 채용·계약할 때 자주 놓치는 기준입니다. 법률 자문이 아니며, 실제
            계약 전에는 노무사·세무사와 확인하세요.
          </p>
          <div className="mt-5 grid gap-4 min-[1100px]:grid-cols-3">
            <GuideCard
              title="근로계약서 필수"
              body="임금(시급·월급·수수료), 지급일, 근무시간, 휴게·휴일, 업무 내용을 서면으로 명시해야 합니다. 구두 합의만으로는 분쟁 시 증빙이 어렵습니다."
            />
            <GuideCard
              title="근로자 vs 프리랜서"
              body="출퇴근·지시·도구를 매장이 관리하면 근로자로 볼 수 있습니다. 프리랜서 형식이라도 실질이 근로라면 4대보험·퇴직금 의무가 생길 수 있습니다."
            />
            <GuideCard
              title="휴게·휴일"
              body="4시간 근무 시 30분 이상 휴게가 원칙입니다. 정기 휴무·점심 시간을 캘린더에 맞춰 두면 예약 충돌과 초과근무 분쟁을 줄일 수 있습니다."
            />
            <GuideCard
              title="수수료·정산"
              body="시술 수수료율, 제품 판매 분배, 카드 수수료 부담 주체를 계약서에 적어 두세요. 정산 주기와 공제 항목을 매월 동일하게 적용하는 것이 안전합니다."
            />
            <GuideCard
              title="초상권·프로필"
              body="홈페이지·SNS에 디자이너 사진을 올릴 때는 초상권 사용 동의를 받으세요. 퇴사 시 게시 중단 시점도 미리 정해 두면 좋습니다."
            />
            <GuideCard
              title="퇴사·인수인계"
              body="고객 정보·시술 기록은 매장 자산입니다. 퇴사 시 SNS 계정·예약 이관 범위를 계약에 넣고, 개인정보 반출을 금지하는 조항을 권장합니다."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function GuideCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[8px] bg-white px-4 py-4">
      <h3 className="text-[15px] font-bold leading-none text-[#2F3A2F] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        {title}
      </h3>
      <p className="mt-3 text-[13px] leading-[20px] text-[#5C574F]">{body}</p>
    </article>
  );
}

function ProfilePhotoField({
  artistId,
  nameKr,
  nameEn,
  imageUrl,
  uploading,
  onUploading,
  onChange,
  onError
}: {
  artistId: string;
  nameKr: string;
  nameEn: string;
  imageUrl: string;
  uploading: boolean;
  onUploading: (v: boolean) => void;
  onChange: (v: string) => void;
  onError: (v: string | null) => void;
}) {
  const initial = (nameKr || nameEn || "?").slice(0, 1);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    onError(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const local = URL.createObjectURL(file);
    previewRef.current = local;
    onChange(local);
    onUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("artistId", artistId);
      const res = await fetch("/api/admin/artists/photo", { method: "POST", body });
      const json = await res.json();
      if (!res.ok || !json.ok || !json.url) throw new Error(json.error || "사진을 올리지 못했습니다.");
      onChange(json.url);
    } catch (e) {
      onError(e instanceof Error ? e.message : "사진을 올리지 못했습니다.");
    } finally {
      onUploading(false);
    }
  };

  return (
    <div>
      <p className="text-[15px] font-bold leading-none text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        프로필 사진
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 relative mx-auto block aspect-[3/4] w-full max-w-[180px] overflow-hidden rounded-[10px] border border-[#E4E0DA] bg-white text-left shadow-[0_4px_16px_rgba(28,28,28,0.06)]"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F3EFEA] px-4 text-center">
            <span className="text-[36px] font-bold text-[#C9C3BB]">{initial}</span>
            <span className="mt-3 text-[12px] font-medium leading-[18px] text-[#9A948C]">
              증명사진처럼
              <br />
              얼굴이 보이도록
            </span>
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-[#1C1C1C]/55 px-2 py-2 text-center text-[12px] font-bold text-white">
          {uploading ? "올리는 중…" : imageUrl ? "사진 바꾸기" : "사진 올리기"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void pickFile(file);
        }}
      />
      <p className="mt-2 text-[12px] leading-[18px] text-[#8A847C]">
        클릭해서 컴퓨터에 있는 사진을 바로 올리세요. JPG, PNG, WEBP를 쓸 수 있습니다.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  hint
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  hint?: string;
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
          readOnly && "bg-[#F3EFEA] text-[#8A847C]"
        )}
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
