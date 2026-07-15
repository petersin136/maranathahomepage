"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import type { Artist } from "@/lib/artists/types";
import type { ServiceItem } from "@/lib/services/types";

/* ---------- data ---------- */

const SERVICE_TABS = ["Cut", "Perm", "Color", "Clinic"] as const;
type ServiceTab = (typeof SERVICE_TABS)[number];

const TIME_SLOTS = {
  Morning: ["10:00", "10:30", "11:00", "11:30"],
  Afternoon: ["13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]
} as const;

const AVAILABLE_TIMES = new Set(["15:00", "16:00", "17:00", "18:00"]);

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

type Ymd = { year: number; month: number; day: number };

function todayYmd(): Ymd {
  const n = new Date();
  return { year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() };
}

function compareYmd(a: Ymd, b: Ymd) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function formatYmd(d: Ymd) {
  return `${d.year}.${String(d.month).padStart(2, "0")}.${String(d.day).padStart(2, "0")}`;
}

function toIsoDate(d: Ymd) {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

type CalendarCell = { day: number; inMonth: boolean; selectable: boolean; isToday: boolean };

function buildCalendar(year: number, month: number, today: Ymd): CalendarCell[] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevDays = new Date(year, month - 1, 0).getDate();
  // Monday-based leading blanks
  const jsDow = first.getDay(); // 0=Sun
  const lead = (jsDow + 6) % 7;

  const cells: CalendarCell[] = [];
  for (let i = lead - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, inMonth: false, selectable: false, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = { year, month, day: d };
    cells.push({
      day: d,
      inMonth: true,
      selectable: compareYmd(ymd, today) >= 0,
      isToday: compareYmd(ymd, today) === 0
    });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: next++, inMonth: false, selectable: false, isToday: false });
  }
  return cells;
}

function priceLabel(price: number) {
  return (price / 1000).toFixed(1);
}

/** 예약금 = 총액의 10% (천원 단위 반올림) */
function depositFromTotal(total: number) {
  if (total <= 0) return 0;
  return Math.max(1000, Math.round((total * 0.1) / 1000) * 1000);
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `약 ${h}시간 ${m}분`;
  if (h > 0) return `약 ${h}시간`;
  return `약 ${m}분`;
}

/* ---------- icons ---------- */

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "text-[12px] text-hu-muted transition-transform duration-200",
        open && "rotate-180"
      )}
    >
      ∨
    </span>
  );
}

/* ---------- component ---------- */

const STEPS = [
  { id: 1, en: "CHOOSE DATE", kr: "날짜 선택" },
  { id: 2, en: "SELECT ARTIST", kr: "디자이너 선택" },
  { id: 3, en: "HAIR SERVICE", kr: "시술 메뉴 선택" },
  { id: 4, en: "BOOKING TIME", kr: "예약 시간 선택" },
  { id: 5, en: "GUEST DETAILS", kr: "예약자 정보 입력" }
] as const;

export default function Booking({
  artists,
  services
}: {
  artists: Artist[];
  services: ServiceItem[];
}) {
  const ALL_SERVICES = services;
  const servicesByTab = useMemo(() => {
    const map: Record<ServiceTab, ServiceItem[]> = {
      Cut: [],
      Perm: [],
      Color: [],
      Clinic: []
    };
    for (const s of services) {
      if (s.category in map) map[s.category as ServiceTab].push(s);
    }
    return map;
  }, [services]);

  const [openStep, setOpenStep] = useState<number>(1);

  const today = useMemo(todayYmd, []);
  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);
  const [selectedDate, setSelectedDate] = useState<Ymd | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [serviceTab, setServiceTab] = useState<ServiceTab>("Perm");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<"W" | "M" | null>(null);
  const [phone, setPhone] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [agree, setAgree] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const calendar = useMemo(
    () => buildCalendar(viewYear, viewMonth, today),
    [viewYear, viewMonth, today]
  );

  const canGoPrevMonth =
    viewYear > today.year || (viewYear === today.year && viewMonth > today.month);

  const shiftMonth = (delta: number) => {
    if (delta < 0 && !canGoPrevMonth) return;
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  };

  const chips = selectedServices
    .map((id) => ALL_SERVICES.find((s) => s.id === id))
    .filter((s): s is (typeof ALL_SERVICES)[number] => Boolean(s));

  const selectedArtistLabel = artists.find((a) => a.id === selectedArtist);

  const totalDurationMinutes = chips.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const durationLabel = formatDuration(totalDurationMinutes);

  const receiptLine = {
    date: selectedDate ? formatYmd(selectedDate) : null,
    artist: selectedArtistLabel
      ? `${selectedArtistLabel.nameKr} ${selectedArtistLabel.nameEn}`.trim()
      : null,
    services: chips.map((c) => ({
      name: c.name,
      price: c.price
    })),
    time: selectedTime,
    durationLabel
  };
  const hasReceipt =
    Boolean(receiptLine.date || receiptLine.artist || receiptLine.time) ||
    receiptLine.services.length > 0;

  const toggleStep = (id: number) => setOpenStep((cur) => (cur === id ? -1 : id));

  const toggleService = (id: string) =>
    setSelectedServices((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!selectedDate) {
      setSubmitError("예약 날짜를 선택해 주세요.");
      setOpenStep(1);
      return;
    }
    if (!selectedArtist) {
      setSubmitError("디자이너를 선택해 주세요.");
      setOpenStep(2);
      return;
    }
    if (selectedServices.length < 1) {
      setSubmitError("시술을 한 개 이상 선택해 주세요.");
      setOpenStep(3);
      return;
    }
    if (!selectedTime) {
      setSubmitError("예약 시간을 선택해 주세요.");
      setOpenStep(4);
      return;
    }
    if (!name.trim() || !phone.trim() || !agree) {
      setSubmitError("예약자 정보와 개인정보 동의를 확인해 주세요.");
      setOpenStep(5);
      return;
    }

    const artist = artists.find((a) => a.id === selectedArtist);
    const services = chips;
    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);
    const depositAmount = depositFromTotal(totalAmount);
    const bookingDate = toIsoDate(selectedDate);

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingDate,
          bookingTime: selectedTime,
          artistId: selectedArtist,
          artistName: artist ? `${artist.nameKr} ${artist.nameEn}` : null,
          serviceIds: services.map((s) => s.id),
          serviceNames: services.map((s) => s.name),
          customerName: name.trim(),
          customerGender: gender,
          customerPhone: phone.trim(),
          customerRequest: requestNote.trim() || null,
          privacyAgreed: true,
          totalAmount,
          depositAmount: depositAmount || null
        })
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; booking?: { id: string } };

      if (!res.ok || !data.ok) {
        setSubmitError(data.error || "예약 저장에 실패했습니다.");
        return;
      }

      setSubmitSuccess(
        "예약이 접수되었습니다. 예약금(약 10%) 계좌 입금 안내를 곧 보내드릴게요."
      );
    } catch {
      setSubmitError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="booking"
      className="bg-hu-white px-side py-[100px]"
      aria-labelledby="booking-heading"
    >
      <div className="mx-auto grid max-w-content grid-cols-1 gap-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 xl:gap-20">
        {/* Left */}
        <div>
          <h2
            id="booking-heading"
            className="font-serif text-[42px] font-medium tracking-[0.04em] text-hu-black lg:text-[48px]"
          >
            BOOKING
          </h2>
          <p className="mt-4 font-sans-kr text-[15px] font-medium text-hu-accent">실시간 예약</p>
          <div className="mt-8 font-sans-kr text-[13px] leading-[1.8] text-hu-black">
            <p>
              신중한 예약과 고객님의 소중한 시간 가치를 위해
              <br />
              노쇼 방지를 위한 예약금(시술 금액의 약 10%)을 계좌로 받고 있습니다.
            </p>
            <ul className="mt-4 space-y-1">
              <li>• 예약 접수 후 입금 계좌를 안내해 드립니다.</li>
              <li>• 예약금은 시술 완료 후 최종 금액에서 차감됩니다.</li>
              <li>• 직급 및 모량에 따라 수수료가 적용될 수 있습니다.</li>
            </ul>
          </div>
        </div>

        {/* Right — accordion */}
        <div className="flex flex-col gap-3">
          {STEPS.map((step) => {
            const open = openStep === step.id;
            return (
              <div key={step.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleStep(step.id)}
                  className="flex h-[70px] w-full items-center justify-between bg-hu-beige px-7 text-left transition-colors duration-200 hover:bg-hu-beige-hover"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-serif text-[15px] font-medium tracking-[0.06em] text-hu-black">
                      {String(step.id).padStart(2, "0")}. {step.en}
                    </span>
                    <span className="font-sans-kr text-[12px] text-hu-body">{step.kr}</span>
                  </span>
                  <Chevron open={open} />
                </button>

                {open && (
                  <div className="px-7 pb-10 pt-8">
                    {step.id === 1 && (
                      <StepDate
                        calendar={calendar}
                        viewYear={viewYear}
                        viewMonth={viewMonth}
                        selectedDate={selectedDate}
                        canGoPrev={canGoPrevMonth}
                        onSelect={setSelectedDate}
                        onPrevMonth={() => shiftMonth(-1)}
                        onNextMonth={() => shiftMonth(1)}
                      />
                    )}
                    {step.id === 2 && (
                      <StepArtist
                        artists={artists}
                        selected={selectedArtist}
                        onSelect={setSelectedArtist}
                      />
                    )}
                    {step.id === 3 && (
                      <StepService
                        tab={serviceTab}
                        onTab={setServiceTab}
                        chips={chips}
                        selected={selectedServices}
                        onToggle={toggleService}
                        servicesByTab={servicesByTab}
                      />
                    )}
                    {step.id === 4 && (
                      <StepTime selected={selectedTime} onSelect={setSelectedTime} />
                    )}
                    {step.id === 5 && (
                      <StepGuest
                        name={name}
                        setName={setName}
                        gender={gender}
                        setGender={setGender}
                        phone={phone}
                        setPhone={setPhone}
                        requestNote={requestNote}
                        setRequestNote={setRequestNote}
                        agree={agree}
                        setAgree={setAgree}
                        receipt={receiptLine}
                        hasReceipt={hasReceipt}
                        totalAmount={chips.reduce((sum, s) => sum + s.price, 0)}
                        depositAmount={depositFromTotal(
                          chips.reduce((sum, s) => sum + s.price, 0)
                        )}
                        privacyAgreed={agree}
                        submitting={submitting}
                        submitError={submitError}
                        submitSuccess={submitSuccess}
                        onSubmit={handleSubmit}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Step 01: Date ---------- */

function StepDate({
  calendar,
  viewYear,
  viewMonth,
  selectedDate,
  canGoPrev,
  onSelect,
  onPrevMonth,
  onNextMonth
}: {
  calendar: CalendarCell[];
  viewYear: number;
  viewMonth: number;
  selectedDate: Ymd | null;
  canGoPrev: boolean;
  onSelect: (d: Ymd) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={!canGoPrev}
          aria-label="이전 달"
          className={clsx(
            "flex h-9 w-9 items-center justify-center font-serif text-[18px] transition-colors",
            canGoPrev
              ? "text-hu-black hover:bg-hu-beige"
              : "cursor-default text-[#cfcfcf]"
          )}
        >
          ‹
        </button>
        <p className="font-serif text-[20px] font-medium text-hu-black">
          {MONTH_NAMES[viewMonth - 1]} {viewYear}
        </p>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="다음 달"
          className="flex h-9 w-9 items-center justify-center font-serif text-[18px] text-hu-black transition-colors hover:bg-hu-beige"
        >
          ›
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-y-4 text-center">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className={clsx(
              "font-serif text-[13px]",
              d === "Sun" ? "text-[#9b4a4a]" : "text-hu-body"
            )}
          >
            {d}
          </div>
        ))}

        {calendar.map((cell, i) => {
          const isSelected =
            cell.inMonth &&
            selectedDate != null &&
            selectedDate.year === viewYear &&
            selectedDate.month === viewMonth &&
            selectedDate.day === cell.day;
          return (
            <div key={i} className="flex justify-center">
              <button
                type="button"
                disabled={!cell.selectable}
                onClick={() => onSelect({ year: viewYear, month: viewMonth, day: cell.day })}
                className={clsx(
                  "flex h-9 w-9 items-center justify-center font-serif text-[15px] transition-colors",
                  !cell.inMonth || !cell.selectable
                    ? "cursor-default text-[#cfcfcf]"
                    : "text-hu-black hover:bg-hu-beige",
                  cell.isToday &&
                    !isSelected &&
                    "bg-[#d8cfc8] font-medium text-hu-black ring-1 ring-inset ring-hu-black/35",
                  isSelected && "bg-hu-black font-medium text-hu-white hover:bg-hu-black"
                )}
              >
                {cell.day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Step 02: Artist ---------- */

function StepArtist({
  artists,
  selected,
  onSelect
}: {
  artists: Artist[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
      {artists.map((artist) => {
        const active = selected === artist.id;
        return (
          <button
            key={artist.id}
            type="button"
            onClick={() => onSelect(artist.id)}
            className="flex flex-col items-center text-center"
          >
            <span
              className={clsx(
                "flex aspect-square w-[84px] items-center justify-center rounded-full bg-hu-black transition-all",
                active
                  ? "ring-2 ring-hu-accent ring-offset-4 ring-offset-hu-white"
                  : "ring-0"
              )}
            />
            <span className="mt-4 font-serif text-[15px] text-hu-black">
              {artist.nameKr} {artist.nameEn}
            </span>
            <span className="mt-1 font-sans-kr text-[12px] text-hu-accent">{artist.role}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Step 03: Service ---------- */

function StepService({
  tab,
  onTab,
  chips,
  selected,
  onToggle,
  servicesByTab
}: {
  tab: ServiceTab;
  onTab: (t: ServiceTab) => void;
  chips: { id: string; name: string; price: number; depositAmount?: number | null }[];
  selected: string[];
  onToggle: (id: string) => void;
  servicesByTab: Record<ServiceTab, ServiceItem[]>;
}) {
  return (
    <div>
      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggle(c.id)}
              className="bg-[#ebe4e0] px-4 py-2 font-sans-kr text-[13px] text-hu-black transition-colors hover:bg-hu-beige-hover"
            >
              {c.name}({priceLabel(c.price)})
            </button>
          ))}
        </div>
      )}

      <div className="border-b border-hu-leader pb-5">
        <div className="flex items-center gap-4 font-serif text-[16px]">
          {SERVICE_TABS.map((t, idx) => (
            <span key={t} className="flex items-center gap-4">
              {idx > 0 && <span className="text-hu-leader">|</span>}
              <button
                type="button"
                onClick={() => onTab(t)}
                className={clsx(
                  "transition-colors",
                  tab === t ? "font-medium text-hu-black" : "text-hu-muted hover:text-hu-body"
                )}
              >
                {t}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
        {(servicesByTab[tab] || []).map((s) => {
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className={clsx(
                "font-sans-kr text-[14px] transition-colors",
                active ? "text-hu-black" : "text-hu-muted hover:text-hu-body"
              )}
            >
              {s.name}({priceLabel(s.price)})
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Step 04: Time ---------- */

function StepTime({
  selected,
  onSelect
}: {
  selected: string | null;
  onSelect: (t: string) => void;
}) {
  return (
    <div className="space-y-8">
      {(Object.keys(TIME_SLOTS) as (keyof typeof TIME_SLOTS)[]).map((period) => (
        <div key={period}>
          <p className="font-serif text-[16px] text-hu-black">{period}</p>
          <div className="mt-4 grid grid-cols-4 gap-x-8 gap-y-3">
            {TIME_SLOTS[period].map((time) => {
              const available = AVAILABLE_TIMES.has(time);
              const active = selected === time;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={!available}
                  onClick={() => onSelect(time)}
                  className={clsx(
                    "py-1 font-serif text-[15px] transition-colors",
                    !available && "cursor-default text-[#cfcfcf]",
                    available && !active && "text-hu-black hover:bg-hu-beige",
                    active && "bg-[#ebe4e0] text-hu-black"
                  )}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Step 05: Guest ---------- */

/* ---------- Step 05: Guest ---------- */

function StepGuest({
  name,
  setName,
  gender,
  setGender,
  phone,
  setPhone,
  requestNote,
  setRequestNote,
  agree,
  setAgree,
  receipt,
  hasReceipt,
  totalAmount,
  depositAmount,
  privacyAgreed,
  submitting,
  submitError,
  submitSuccess,
  onSubmit
}: {
  name: string;
  setName: (v: string) => void;
  gender: "W" | "M" | null;
  setGender: (v: "W" | "M") => void;
  phone: string;
  setPhone: (v: string) => void;
  requestNote: string;
  setRequestNote: (v: string) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  receipt: {
    date: string | null;
    artist: string | null;
    services: { name: string; price: number }[];
    time: string | null;
    durationLabel: string | null;
  };
  hasReceipt: boolean;
  totalAmount: number;
  depositAmount: number;
  privacyAgreed: boolean;
  submitting: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  onSubmit: () => void;
}) {
  const requestRef = useRef<HTMLTextAreaElement>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    const el = requestRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [requestNote]);

  return (
    <div className="max-w-[420px]">
      <div className="flex items-center justify-between border-b border-hu-black/60 pb-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="w-full bg-transparent font-sans-kr text-[15px] text-hu-black outline-none placeholder:text-hu-muted"
        />
        <div className="flex shrink-0 items-center gap-2 font-serif text-[14px]">
          <button
            type="button"
            onClick={() => setGender("W")}
            className={clsx(gender === "W" ? "text-hu-black" : "text-hu-muted")}
          >
            W
          </button>
          <span className="text-hu-leader">/</span>
          <button
            type="button"
            onClick={() => setGender("M")}
            className={clsx(gender === "M" ? "text-hu-black" : "text-hu-muted")}
          >
            M
          </button>
        </div>
      </div>

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="전화번호"
        inputMode="tel"
        className="mt-7 w-full border-b border-hu-black/60 bg-transparent pb-2 font-sans-kr text-[15px] text-hu-black outline-none placeholder:text-hu-muted"
      />

      <textarea
        ref={requestRef}
        value={requestNote}
        onChange={(e) => setRequestNote(e.target.value.slice(0, 500))}
        placeholder="디자이너님에게 하고싶은 말 (요청사항)"
        rows={1}
        className="mt-7 max-h-[160px] min-h-[28px] w-full resize-none overflow-y-auto border-b border-hu-black/60 bg-transparent pb-2 font-sans-kr text-[15px] leading-relaxed text-hu-black outline-none placeholder:text-hu-muted [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      />

      <div className="mt-7">
        <div className="flex items-center gap-2 font-sans-kr text-[13px] text-hu-body">
          <input
            id="privacy-agree"
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-hu-black"
          />
          <button
            type="button"
            onClick={() => setPrivacyOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
            aria-expanded={privacyOpen}
          >
            <span>
              개인정보 수집 및 이용 동의{" "}
              <span className="text-hu-muted">(필수)</span>
              <span className="ml-1 text-[11px] text-hu-muted underline underline-offset-2">
                내용 보기
              </span>
            </span>
            <span
              aria-hidden
              className={clsx(
                "shrink-0 text-[11px] text-hu-muted transition-transform",
                privacyOpen && "rotate-180"
              )}
            >
              ∨
            </span>
          </button>
        </div>

        {privacyOpen ? (
          <div className="mt-3 max-h-[180px] overflow-y-auto bg-hu-beige/60 px-4 py-3 font-sans-kr text-[12px] leading-[1.7] text-hu-body">
            <p className="font-medium text-hu-black">개인정보 수집 및 이용 안내</p>
            <ul className="mt-2 space-y-1.5">
              <li>1. 수집 항목: 이름, 연락처, 성별(선택), 예약 요청사항</li>
              <li>2. 수집 목적: 예약 확인, 일정 안내, 고객 응대</li>
              <li>3. 보유 기간: 예약 완료 후 1년 (관련 법령에 따라 보관이 필요한 경우 해당 기간)</li>
              <li>4. 동의 거부 권리: 동의를 거부하실 수 있으나, 이 경우 예약 접수가 제한됩니다.</li>
            </ul>
          </div>
        ) : null}
      </div>

      {submitError ? (
        <p className="mt-4 font-sans-kr text-[13px] text-[#9b4a4a]" role="alert">
          {submitError}
        </p>
      ) : null}
      {submitSuccess ? (
        <p className="mt-4 font-sans-kr text-[13px] text-hu-black" role="status">
          {submitSuccess}
        </p>
      ) : null}

      {hasReceipt ? (
        <div className="mt-8 border-t border-dashed border-hu-black/20 pt-4">
          <p className="font-serif text-[14px] font-medium tracking-[0.1em] text-hu-black">
            예약현황
          </p>
          <div className="mt-2 font-sans-kr text-[12px] leading-relaxed text-hu-body">
            <ReceiptText receipt={receipt} />
          </div>
          {totalAmount > 0 || receipt.durationLabel ? (
            <p className="mt-3 font-sans-kr text-[12px] text-hu-muted">
              {[
                totalAmount > 0
                  ? `총 ${totalAmount.toLocaleString("ko-KR")}원 · 예약금(10%) ${depositAmount.toLocaleString("ko-KR")}원 · 계좌 입금`
                  : null,
                receipt.durationLabel ? `소요시간 ${receipt.durationLabel}` : null
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        disabled={!privacyAgreed || submitting || Boolean(submitSuccess)}
        onClick={onSubmit}
        className={clsx(
          "mt-3 flex min-h-[56px] w-full items-center justify-between gap-3 px-6 py-2 font-sans-kr text-hu-white transition-colors",
          !hasReceipt && "mt-8",
          privacyAgreed && !submitting && !submitSuccess
            ? "bg-hu-cta hover:bg-[#222222]"
            : "cursor-not-allowed bg-[#bcbcbc]"
        )}
      >
        {depositAmount > 0 ? (
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="text-[16px] font-medium tracking-[0.02em]">
              예약금 {depositAmount.toLocaleString("ko-KR")}원
            </span>
            <span className="text-[11px] font-normal text-white/65">
              총 {totalAmount.toLocaleString("ko-KR")}원
            </span>
          </span>
        ) : (
          <span />
        )}
        <span className="flex min-w-0 items-center gap-3">
          <span className="truncate text-[13px] font-medium">
            {submitting ? "예약 접수 중..." : "예약하기"}
          </span>
          <span aria-hidden className="shrink-0 text-[16px] leading-none">
            ›
          </span>
        </span>
      </button>
    </div>
  );
}

function ReceiptText({
  receipt
}: {
  receipt: {
    date: string | null;
    artist: string | null;
    services: { name: string; price: number }[];
    time: string | null;
    durationLabel?: string | null;
  };
}) {
  const serviceRows: { name: string; price: number }[][] = [];
  for (let i = 0; i < receipt.services.length; i += 2) {
    serviceRows.push(receipt.services.slice(i, i + 2));
  }

  const dateTime =
    receipt.date && receipt.time
      ? `${receipt.date}  ·  ${receipt.time}`
      : receipt.date || receipt.time;

  return (
    <div className="space-y-1">
      {dateTime || receipt.artist ? (
        <p className="flex items-baseline justify-between gap-3">
          <span>{dateTime}</span>
          {receipt.artist ? (
            <span className="shrink-0 text-[calc(14px*1.3)] font-semibold text-hu-black">
              {receipt.artist}
            </span>
          ) : null}
        </p>
      ) : null}
      {serviceRows.map((row, rowIdx) => (
        <p key={`svc-row-${rowIdx}`}>
          {row.map((s, i) => (
            <span key={`${s.name}-${i}`} className="whitespace-nowrap">
              {i > 0 ? <span className="text-hu-muted"> · </span> : null}
              {s.name}
              <span className="text-[11px] text-hu-muted">
                ({s.price.toLocaleString("ko-KR")}원)
              </span>
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
