"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
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
  initialDate?: string;
  initialTime?: string;
  initialArtistId?: string;
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

export default function BookingCreateModal({
  artists,
  initialDate,
  initialTime,
  initialArtistId,
  onClose,
  onCreated
}: Props) {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [date, setDate] = useState(initialDate || todayYmd);
  const [time, setTime] = useState<string>(initialTime || CANDIDATE_TIMES[0] || "10:00");
  const [artistId, setArtistId] = useState(initialArtistId || artists[0]?.id || "");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<null | "date" | "time" | "artist">(null);

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
            <DateField
              value={date}
              open={menu === "date"}
              onToggle={() => setMenu((cur) => (cur === "date" ? null : "date"))}
              onClose={() => setMenu(null)}
              onChange={(ymd) => {
                setDate(ymd);
                setMenu(null);
              }}
            />
          </div>
          <div className="ml-3 flex-1">
            <label className={labelClass}>시간</label>
            <OptionField
              value={time}
              open={menu === "time"}
              onToggle={() => setMenu((cur) => (cur === "time" ? null : "time"))}
              onClose={() => setMenu(null)}
              options={(CANDIDATE_TIMES.includes(time) ? CANDIDATE_TIMES : [...CANDIDATE_TIMES, time].sort()).map(
                (t) => ({ value: t, label: t })
              )}
              onChange={(next) => {
                setTime(next);
                setMenu(null);
              }}
            />
          </div>
        </div>

        <div className="mt-6">
          <label className={labelClass}>담당자</label>
          <OptionField
            value={artistId}
            open={menu === "artist"}
            onToggle={() => setMenu((cur) => (cur === "artist" ? null : "artist"))}
            onClose={() => setMenu(null)}
            options={artists.map((a) => ({ value: a.id, label: a.label }))}
            onChange={(next) => {
              setArtistId(next);
              setMenu(null);
            }}
          />
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

const menuClass =
  "overflow-auto rounded-[12px] border border-[#EFEBE6] bg-white py-1 shadow-[0_8px_24px_rgba(28,28,28,0.08)]";

function maskIcon(src: string) {
  return {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain"
  } as const;
}

function FieldTrigger({
  open,
  display,
  icon,
  onClick,
  buttonRef
}: {
  open: boolean;
  display: string;
  icon: "calendar" | "chevron";
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={clsx(fieldClass, "flex items-center justify-between text-left", open && "border-[#1C1C1C]")}
    >
      <span className="min-w-0 truncate">{display || "선택"}</span>
      {icon === "calendar" ? (
        <span aria-hidden className="ml-2 h-[16px] w-[16px] shrink-0 bg-[#9A948C]" style={maskIcon("/admin-icons/lnb/calendar.png")} />
      ) : (
        <span
          aria-hidden
          className={clsx("ml-2 h-[16px] w-[16px] shrink-0 bg-[#9A948C]", open && "rotate-180")}
          style={maskIcon("/admin-icons/lnb/chevron-down.png")}
        />
      )}
    </button>
  );
}

function useMenuPlace(
  open: boolean,
  anchorRef: RefObject<HTMLButtonElement>,
  popRef: RefObject<HTMLDivElement>,
  onClose: () => void,
  width?: number
) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const w = width ?? rect.width;
      const popH = popRef.current?.offsetHeight ?? 240;
      let top = rect.bottom + 6;
      if (top + popH > window.innerHeight - 8) top = Math.max(8, rect.top - popH - 6);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - w - 8);
      setPos({ top, left, width: w });
    };
    place();
    const frame = window.requestAnimationFrame(place);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, popRef, onClose, width]);

  return pos;
}

function OptionField({
  value,
  options,
  open,
  onToggle,
  onClose,
  onChange
}: {
  value: string;
  options: { value: string; label: string }[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useMenuPlace(open, buttonRef, popRef, onClose);
  const current = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;
    const selected = popRef.current?.querySelector<HTMLElement>("[data-selected='true']");
    selected?.scrollIntoView({ block: "nearest" });
  }, [open]);

  return (
    <>
      <FieldTrigger
        buttonRef={buttonRef}
        open={open}
        display={current?.label ?? ""}
        icon="chevron"
        onClick={onToggle}
      />
      {open
        ? createPortal(
            <div
              ref={popRef}
              className={clsx(menuClass, "fixed z-[60] max-h-[240px]")}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {options.map((opt) => {
                const on = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-selected={on}
                    onClick={() => onChange(opt.value)}
                    className={clsx(
                      "flex h-[36px] w-full items-center px-3 text-left text-[14px] font-medium text-[#1C1C1C]",
                      on ? "bg-[#F4EFE9] font-bold" : "hover:bg-[#F6F4F0]"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toYmd(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function parseYmd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function formatYmd(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return "";
  return `${y}. ${m}. ${d}.`;
}

function monthCells(year: number, month: number) {
  const start = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const prevCount = new Date(year, month, 0).getDate();
  const cells: { ymd: string; day: number; outside: boolean }[] = [];
  for (let i = 0; i < start; i += 1) {
    const day = prevCount - start + 1 + i;
    cells.push({ ymd: toYmd(new Date(year, month - 1, day)), day, outside: true });
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({ ymd: toYmd(new Date(year, month, day)), day, outside: false });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ ymd: toYmd(new Date(year, month + 1, next)), day: next, outside: true });
    next += 1;
  }
  return cells;
}

function DateField({
  value,
  open,
  onToggle,
  onClose,
  onChange
}: {
  value: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (ymd: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useMenuPlace(open, buttonRef, popRef, onClose, 280);
  const selected = parseYmd(value);
  const [cursor, setCursor] = useState({ y: selected.getFullYear(), m: selected.getMonth() });

  useEffect(() => {
    if (!open) return;
    const current = parseYmd(value);
    setCursor({ y: current.getFullYear(), m: current.getMonth() });
  }, [open, value]);

  const cells = monthCells(cursor.y, cursor.m);
  const today = toYmd(new Date());

  const shift = (delta: number) => {
    const next = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: next.getFullYear(), m: next.getMonth() });
  };

  return (
    <>
      <FieldTrigger
        buttonRef={buttonRef}
        open={open}
        display={formatYmd(value)}
        icon="calendar"
        onClick={onToggle}
      />
      {open
        ? createPortal(
            <div
              ref={popRef}
              className={clsx(menuClass, "fixed z-[60] pt-3")}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <div className="flex items-center justify-between px-4">
                <span className="text-[14px] font-bold text-[#1C1C1C]">
                  {cursor.y}년 {cursor.m + 1}월
                </span>
                <span className="flex">
                  <button type="button" aria-label="이전 달" onClick={() => shift(-1)} className="flex h-[28px] w-[28px] items-center justify-center text-[#1C1C1C]">
                    <span aria-hidden className="h-[14px] w-[14px] rotate-90 bg-current" style={maskIcon("/admin-icons/lnb/chevron-down.png")} />
                  </button>
                  <button type="button" aria-label="다음 달" onClick={() => shift(1)} className="ml-1 flex h-[28px] w-[28px] items-center justify-center text-[#1C1C1C]">
                    <span aria-hidden className="h-[14px] w-[14px] -rotate-90 bg-current" style={maskIcon("/admin-icons/lnb/chevron-down.png")} />
                  </button>
                </span>
              </div>
              <div className="mt-3 grid grid-cols-7 px-3">
                {WEEKDAYS.map((name) => (
                  <span key={name} className="flex h-[28px] items-center justify-center text-[12px] font-medium text-[#8A847C]">
                    {name}
                  </span>
                ))}
                {cells.map((cell) => {
                  const on = cell.ymd === value;
                  return (
                    <button
                      key={cell.ymd}
                      type="button"
                      onClick={() => onChange(cell.ymd)}
                      className={clsx(
                        "mx-auto flex h-[32px] w-[32px] items-center justify-center rounded-full text-[13px] font-medium",
                        on
                          ? "bg-[#2F3A2F] font-bold text-white"
                          : cell.outside
                            ? "text-[#C9C3BB]"
                            : cell.ymd === today
                              ? "font-bold text-[#2F3A2F]"
                              : "text-[#1C1C1C] hover:bg-[#F6F4F0]"
                      )}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => onChange(today)}
                className="mt-2 flex h-[40px] w-full items-center justify-center border-t border-[#F3EFEA] text-[13px] font-bold text-[#2F3A2F]"
              >
                오늘
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
