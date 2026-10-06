"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { CANDIDATE_TIMES } from "@/lib/booking/slots";

export type CreateModalArtist = { id: string; label: string };

type ServiceOption = {
  id: string;
  category: string;
  name: string;
  price: number;
  artist_prices: Record<string, number>;
};

type Props = {
  artists: CreateModalArtist[];
  onClose: () => void;
  onCreated: () => void;
};

const fieldClass =
  "h-[40px] w-full rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[15px] font-medium text-[#1C1C1C] outline-none focus:border-[#1C1C1C]";
const labelClass =
  "mb-2 block text-[14px] font-bold text-[#8A847C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";

function todayYmd() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function BookingCreateModal({ artists, onClose, onCreated }: Props) {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [date, setDate] = useState(todayYmd);
  const [time, setTime] = useState<string>(CANDIDATE_TIMES[0] ?? "10:00");
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId && artists[0]) setArtistId(artists[0].id);
  }, [artists, artistId]);

  useEffect(() => {
    fetch("/api/admin/services")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.services)) setServices(d.services);
      })
      .catch(() => undefined);
  }, []);

  const total = useMemo(
    () =>
      serviceIds.reduce((sum, id) => {
        const s = services.find((x) => x.id === id);
        if (!s) return sum;
        return sum + (s.artist_prices?.[artistId] ?? s.price ?? 0);
      }, 0),
    [serviceIds, services, artistId]
  );

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingDate: date,
          bookingTime: time,
          artistId,
          serviceIds,
          customerName: name,
          customerPhone: phone,
          customerRequest: memo
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "예약 등록에 실패했습니다.");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "예약 등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 font-sans-kr text-[#1C1C1C]"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="max-h-[90dvh] w-full max-w-[560px] overflow-auto rounded-[12px] bg-white p-8 shadow-[0_8px_24px_rgba(28,28,28,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[22px] font-bold tracking-[-0.02em] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
          새 예약
        </h2>

        <div className="mt-8 flex">
          <div className="flex-1">
            <label className={labelClass}>예약 날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
          </div>
          <div className="ml-3 flex-1">
            <label className={labelClass}>시간</label>
            <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass}>
              {CANDIDATE_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className={labelClass}>담당자</label>
          <select value={artistId} onChange={(e) => setArtistId(e.target.value)} className={fieldClass}>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          <label className={labelClass}>예약 시술</label>
          <div className="flex flex-wrap">
            {services.map((s) => {
              const on = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setServiceIds((cur) => (on ? cur.filter((x) => x !== s.id) : [...cur, s.id]))
                  }
                  className={clsx(
                    "mb-2 mr-2 inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold",
                    on ? "border-[#2F3A2F] bg-[#2F3A2F] text-white" : "border-[#9A948C] bg-white text-[#1C1C1C]"
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[14px] text-[#8A847C]">합계 {total.toLocaleString("ko-KR")}원</p>
        </div>

        <div className="mt-6 flex">
          <div className="flex-1">
            <label className={labelClass}>고객명</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          </div>
          <div className="ml-3 flex-1">
            <label className={labelClass}>연락처</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="mt-6">
          <label className={labelClass}>요청사항</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 py-2 text-[15px] font-medium text-[#1C1C1C] outline-none focus:border-[#1C1C1C]"
          />
        </div>

        {error ? <p className="mt-4 text-[13px] text-[#E24B4B]">{error}</p> : null}

        <div className="mt-8 flex items-center justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-[40px] rounded-[8px] px-4 text-[14px] font-bold text-[#8A847C] disabled:opacity-40"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={busy || !artistId || serviceIds.length === 0 || !name.trim() || !phone.trim()}
            onClick={() => void submit()}
            className="ml-2 h-[40px] rounded-[8px] bg-[#2F3A2F] px-5 text-[14px] font-bold text-white disabled:opacity-40"
          >
            {busy ? "등록 중…" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
