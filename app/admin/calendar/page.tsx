"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";

type CalBooking = {
  id: string;
  booking_date: string;
  booking_time: string;
  artist_id: string;
  artist_name: string | null;
  customer_name: string;
  status: string;
  service_names: string[] | null;
};

type Artist = { id: string; name_kr: string; name_en: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const PANEL_H = "min-h-[420px] h-[420px]";

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { from: toYmd(start), to: toYmd(end) };
}

function buildMonthCells(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: { date: string | null; day: number | null }[] = [];
  for (let i = 0; i < lead; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d });
  }
  // Always 6 weeks so month navigation never changes panel height
  while (cells.length < 42) cells.push({ date: null, day: null });
  return cells;
}

export default function AdminCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState<"month" | "week">("month");
  const [artistId, setArtistId] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [bookings, setBookings] = useState<CalBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(toYmd(now));
  const [error, setError] = useState<string | null>(null);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const weekStart = useMemo(() => {
    const anchor = selectedDate;
    const idx = anchor ? cells.findIndex((c) => c.date === anchor) : -1;
    if (idx >= 0) return Math.floor(idx / 7) * 7;
    const firstIdx = cells.findIndex((c) => c.date);
    return Math.floor(Math.max(firstIdx, 0) / 7) * 7;
  }, [cells, selectedDate]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalBooking[]>();
    for (const b of bookings) {
      const list = map.get(b.booking_date) || [];
      list.push(b);
      map.set(b.booking_date, list);
    }
    return map;
  }, [bookings]);

  useEffect(() => {
    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setArtists(d.artists);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const { from, to } = monthRange(year, month);
    const qs = new URLSearchParams({ from, to });
    if (artistId) qs.set("artistId", artistId);
    setError(null);
    fetch(`/api/admin/calendar?${qs}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setBookings(data.bookings);
      })
      .catch((e) => setError(e.message));
  }, [year, month, artistId]);

  const selectedList = selectedDate ? byDate.get(selectedDate) || [] : [];

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] tracking-[0.06em]">CALENDAR</h1>
          <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">예약 캘린더</p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
          <button type="button" onClick={() => shiftMonth(-1)} className="px-2 text-hu-muted">
            ‹
          </button>
          <p className="w-[88px] text-center font-serif text-[20px]">
            {year}. {String(month + 1).padStart(2, "0")}
          </p>
          <button type="button" onClick={() => shiftMonth(1)} className="px-2 text-hu-muted">
            ›
          </button>
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="ml-2 w-[148px] border border-hu-black/15 bg-hu-white px-3 py-2 font-sans-kr text-[12px]"
          >
            <option value="">전체 디자이너</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name_kr} {a.name_en}
              </option>
            ))}
          </select>
          <div className="flex border border-hu-black/15">
            <button
              type="button"
              onClick={() => setView("month")}
              className={clsx(
                "w-10 px-0 py-2 font-sans-kr text-[12px]",
                view === "month" ? "bg-hu-black text-white" : "bg-hu-white"
              )}
            >
              월
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              className={clsx(
                "w-10 px-0 py-2 font-sans-kr text-[12px]",
                view === "week" ? "bg-hu-black text-white" : "bg-hu-white"
              )}
            >
              주
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 min-h-[20px] font-sans-kr text-[13px] text-[#9b4a4a]">
        {error || "\u00a0"}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_0.9fr]">
        <div className={clsx("bg-hu-white p-6", PANEL_H)}>
          <div className="grid h-full grid-cols-7 grid-rows-[auto_repeat(6,1fr)] gap-y-1 text-center">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className={clsx(
                  "font-serif text-[12px]",
                  d === "Sun" ? "text-[#9b4a4a]" : "text-hu-body"
                )}
              >
                {d}
              </div>
            ))}
            {cells.map((cell, i) => {
              const count = cell.date ? byDate.get(cell.date)?.length || 0 : 0;
              const selected = cell.date && cell.date === selectedDate;
              const inWeek = i >= weekStart && i < weekStart + 7;
              const dimmed = view === "week" && !inWeek;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!cell.date || dimmed}
                  onClick={() => cell.date && setSelectedDate(cell.date)}
                  className={clsx(
                    "mx-auto flex h-11 w-11 flex-col items-center justify-center font-serif text-[14px] transition-opacity",
                    !cell.date && "invisible",
                    dimmed && "pointer-events-none opacity-20",
                    selected && "bg-hu-black text-white",
                    !selected && count > 0 && "bg-[#ebe4e0]",
                    !selected && !dimmed && "hover:bg-hu-beige"
                  )}
                >
                  <span className="leading-none">{cell.day}</span>
                  <span
                    className={clsx(
                      "mt-0.5 h-[10px] text-[9px] leading-none",
                      selected ? "text-white/70" : "text-hu-muted",
                      count > 0 ? "visible" : "invisible"
                    )}
                  >
                    {count || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={clsx("flex flex-col bg-hu-white p-6", PANEL_H)}>
          <p className="shrink-0 font-serif text-[14px] tracking-[0.08em]">
            {selectedDate || "날짜 선택"}
          </p>
          <ul className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {selectedList.length === 0 ? (
              <li className="font-sans-kr text-[13px] text-hu-muted">예약 없음</li>
            ) : (
              selectedList.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="block border border-hu-black/10 px-4 py-3 transition hover:bg-hu-beige/50"
                  >
                    <p className="font-serif text-[14px]">
                      {b.booking_time} · {b.customer_name}
                    </p>
                    <p className="mt-1 font-sans-kr text-[12px] text-hu-muted">
                      {b.artist_name || "—"} · {(b.service_names || []).join(", ") || "—"} ·{" "}
                      {b.status}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
