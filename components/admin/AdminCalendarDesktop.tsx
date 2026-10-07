"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import type { CalendarTone } from "@/lib/admin/calendar-tone";
import { CANDIDATE_TIMES } from "@/lib/booking/slots";
import { BOOKING_STATUS_LABEL } from "@/lib/admin/booking-labels";
import { CLOSING_MINUTES, OPEN_MINUTES } from "@/lib/booking/business-hours";
import {
  BLOCKING_STATUSES,
  filterAvailableTimes,
  parseTimeToMinutes,
  type OccupiedInterval
} from "@/lib/booking/overlap";
import { AdminDatePicker } from "@/components/admin/AdminDatePicker";
import BookingCreateModal from "@/components/admin/BookingCreateModal";
import "./admin-calendar.css";

export type CalTab = "day" | "week" | "month";

export type CalArtist = {
  id: string;
  name_kr: string;
  role: string | null;
  lunch_start: string | null;
  lunch_minutes: number | null;
};

export type CalDayBooking = {
  id: string;
  booking_date: string;
  booking_time: string;
  artist_id: string;
  customer_name: string;
  customer_phone?: string | null;
  status: string;
  service_names: string[] | null;
  duration_minutes: number;
  tone: CalendarTone;
  is_new: boolean;
  memo: string;
};

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 48;
const SLOT_COUNT = (CLOSING_MINUTES - OPEN_MINUTES) / SLOT_MINUTES;
const WEEKDAY_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const TONE_CLASS: Record<CalendarTone, string> = {
  cut: "tone-cut",
  clinic: "tone-clinic",
  consult: "tone-consult",
  perm: "tone-perm",
  color: "tone-color"
};

const TABS: { key: CalTab; label: string }[] = [
  { key: "day", label: "일간" },
  { key: "week", label: "주간" },
  { key: "month", label: "월간" }
];

function CalIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={clsx("cal-icon", className)}
      style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }}
    />
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.05} className={className}>
      <path d="M3 7.5l5 5 5-5" />
    </svg>
  );
}

function formatChipDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${y}. ${String(m).padStart(2, "0")}. ${String(d).padStart(2, "0")}. ${WEEKDAY_EN[dow]}`;
}

function formatSearchWhen(ymd: string, time: string) {
  return `${formatChipDate(ymd)} ${time.slice(0, 5)}`;
}

function minutesLabel(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function hhmm(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function durationLabel(minutes: number) {
  return minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}min`;
}

function avatarInitial(name: string) {
  const chars = Array.from(name.trim());
  return (chars.length >= 3 ? chars[1] : chars[0]) ?? "";
}

function lunchInterval(artist: CalArtist): OccupiedInterval | null {
  if (!artist.lunch_start) return null;
  const start = parseTimeToMinutes(artist.lunch_start.slice(0, 5));
  if (!Number.isFinite(start)) return null;
  return { startMinutes: start, endMinutes: start + (artist.lunch_minutes || 30) };
}

function isBlocking(status: string) {
  return (BLOCKING_STATUSES as readonly string[]).includes(status);
}

export type SearchHit = {
  id: string;
  booking_date: string;
  booking_time: string;
  artist_id: string;
  artist_name: string | null;
  customer_name: string;
  customer_phone: string | null;
  service_names: string[] | null;
  status: string;
};

function searchBlob(hit: SearchHit, artistLabel: string) {
  return [hit.customer_name, hit.customer_phone || "", artistLabel, hit.artist_name || "", ...(hit.service_names || [])]
    .join(" ")
    .toLowerCase();
}

function hitMatches(hit: SearchHit, query: string, artistLabel: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const digits = q.replace(/\D/g, "");
  const phone = (hit.customer_phone || "").replace(/\D/g, "");
  if (searchBlob(hit, artistLabel).includes(q)) return true;
  return digits.length > 0 && phone.includes(digits);
}

type ViewProps = {
  tab: CalTab;
  onTab: (tab: CalTab) => void;
  date: string;
  onDate: (date: string) => void;
  artists: CalArtist[];
  selectedIds: string[];
  onToggleArtist: (id: string) => void;
  bookings: CalDayBooking[];
  catalog: SearchHit[];
  nowMinutes: number | null;
  query: string;
  onQuery: (q: string) => void;
  onPickSearch: (hit: SearchHit) => void;
  onRefresh: () => void;
  onOpenBooking: (id: string) => void;
  legacy?: ReactNode;
};

export function CalendarDesktopView({
  tab,
  onTab,
  date,
  onDate,
  artists,
  selectedIds,
  onToggleArtist,
  bookings,
  catalog,
  nowMinutes,
  query,
  onQuery,
  onPickSearch,
  onRefresh,
  onOpenBooking,
  legacy
}: ViewProps) {
  const [staffOpen, setStaffOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createSlot, setCreateSlot] = useState<{ time?: string; artistId?: string } | null>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const empty = artists.length === 0;

  useEffect(() => {
    if (!staffOpen) return;
    const close = (e: MouseEvent) => {
      if (!staffRef.current?.contains(e.target as Node)) setStaffOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [staffOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const close = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [searchOpen]);

  const artistLabelOf = (id: string, fallback: string | null) => {
    const artist = artists.find((a) => a.id === id);
    return [artist?.name_kr || fallback, artist?.role].filter(Boolean).join(" ");
  };

  const searchHits = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return catalog
      .filter((hit) => hitMatches(hit, q, artistLabelOf(hit.artist_id, hit.artist_name)))
      .slice(0, 12);
  }, [catalog, query, artists]);

  const columns = artists.filter((a) => selectedIds.includes(a.id));

  return (
    <div className="ADMIN-CALENDAR">
      <div className="cal-head">
        <h1 className="cal-title">캘린더</h1>
        <div ref={searchRef} className="cal-search-wrap">
          <label className="cal-search">
            <CalIcon src="/admin-icons/lnb/search-bold.png" className="cal-search-icon" />
            <input
              value={query}
              onChange={(e) => {
                onQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="고객명, 연락처 검색"
              className="cal-search-input"
            />
          </label>
          {searchOpen && query.trim() ? (
            <div className="cal-search-panel">
              {searchHits.length === 0 ? (
                <p className="cal-search-empty">검색 결과가 없습니다.</p>
              ) : (
                searchHits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    className="cal-search-item"
                    onClick={() => {
                      setSearchOpen(false);
                      onPickSearch(hit);
                    }}
                  >
                    <span className="cal-search-item-top">
                      <span className="cal-search-name">{hit.customer_name}</span>
                      <span className="cal-search-status">{BOOKING_STATUS_LABEL[hit.status] || hit.status}</span>
                    </span>
                    <span className="cal-search-meta">
                      {[hit.customer_phone, artistLabelOf(hit.artist_id, hit.artist_name)].filter(Boolean).join(" · ")}
                    </span>
                    <span className="cal-search-meta">
                      {[formatSearchWhen(hit.booking_date, hit.booking_time), (hit.service_names || []).join(" / ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="cal-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTab(t.key)}
            className={clsx("cal-tab", t.key === tab && "is-active")}
          >
            <span className="cal-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      {tab !== "day" ? (
        <div className="cal-legacy">{legacy}</div>
      ) : (
        <>
          <div className="cal-toolbar">
            <AdminDatePicker
              value={date}
              onChange={onDate}
              display={formatChipDate(date)}
              ariaLabel="날짜"
              className="cal-chip cal-date-chip"
              textClassName="cal-date-text"
              leading={
                <svg viewBox="0 0 16 16" className="cal-date-icon" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" />
                  <path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4" />
                  <path d="M5 9.6h.01M8 9.6h.01M11 9.6h.01" strokeWidth={1.8} />
                </svg>
              }
              trailing={<ChevronDown className="cal-chip-chevron" />}
            />

            <div ref={staffRef} className="cal-staff-wrap">
              <button
                type="button"
                onClick={() => setStaffOpen((v) => !v)}
                className={clsx("cal-chip cal-staff-chip", selectedIds.length > 0 && "is-selected")}
              >
                <CalIcon src="/admin-icons/lnb/filter.png" className="cal-filter-icon" />
                <span className="cal-staff-label">담당자</span>
                <span className="cal-staff-count">
                  <span className="cal-staff-count-num">{selectedIds.length}</span>
                </span>
                <span className="cal-staff-select">선택</span>
                <ChevronDown className={clsx("cal-staff-chevron", staffOpen && "is-open")} />
              </button>
              {staffOpen && artists.length > 0 ? (
                <div className="cal-staff-panel">
                  {artists.map((a) => {
                    const checked = selectedIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onToggleArtist(a.id)}
                        className="cal-staff-option"
                      >
                        <span className={clsx("cal-staff-check", checked && "is-checked")}>
                          {checked ? <CalIcon src="/admin-icons/lnb/check.png" className="cal-staff-check-icon" /> : null}
                        </span>
                        {[a.name_kr, a.role].filter(Boolean).join(" ")}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button type="button" onClick={onRefresh} className="cal-refresh">
              <CalIcon src="/admin-icons/lnb/refresh.png" className="cal-refresh-icon" />
            </button>

            <button
              type="button"
              disabled={empty}
              onClick={() => setCreateSlot({})}
              className={clsx("cal-new", empty && "is-disabled")}
            >
              <CalIcon src="/admin-icons/lnb/plus.png" className="cal-new-icon" />
              <span className="cal-new-label">새 예약</span>
            </button>
          </div>

          {empty ? (
            <div className="cal-empty">
              <p className="cal-empty-title">매장 기본 설정을 먼저 완료해 주세요.</p>
              <p className="cal-empty-desc">
                운영 시간(오픈·마감)과 함께 근무할 디자이너를 등록하시면
                <br />
                캘린더 타임테이블이 자동으로 활성화됩니다.
              </p>
              <Link href="/admin/artists" className="cal-empty-btn">
                <span className="cal-empty-btn-label">매장 설정 바로가기</span>
              </Link>
            </div>
          ) : (
            <DayGrid
              columns={columns}
              bookings={bookings}
              nowMinutes={nowMinutes}
              query={query}
              onOpenBooking={onOpenBooking}
              onCreateAt={(time, artistId) => setCreateSlot({ time, artistId })}
            />
          )}
        </>
      )}
      {createSlot ? (
        <BookingCreateModal
          artists={artists.map((a) => ({ id: a.id, label: [a.name_kr, a.role].filter(Boolean).join(" ") }))}
          initialDate={date}
          initialTime={createSlot.time}
          initialArtistId={createSlot.artistId}
          onClose={() => setCreateSlot(null)}
          onCreated={() => {
            setCreateSlot(null);
            onRefresh();
          }}
        />
      ) : null}
    </div>
  );
}

function DayGrid({
  columns,
  bookings,
  nowMinutes,
  query,
  onOpenBooking,
  onCreateAt
}: {
  columns: CalArtist[];
  bookings: CalDayBooking[];
  nowMinutes: number | null;
  query: string;
  onOpenBooking: (id: string) => void;
  onCreateAt: (time: string, artistId: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const visible = useMemo(
    () =>
      bookings.filter((b) => {
        if (!isBlocking(b.status)) return false;
        if (!q) return true;
        const artist = columns.find((a) => a.id === b.artist_id);
        const text = [b.customer_name, b.customer_phone || "", artist?.name_kr || "", artist?.role || "", ...(b.service_names || [])]
          .join(" ")
          .toLowerCase();
        if (text.includes(q)) return true;
        return qDigits.length > 0 && (b.customer_phone || "").replace(/\D/g, "").includes(qDigits);
      }),
    [bookings, columns, q, qDigits]
  );

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => OPEN_MINUTES + i * SLOT_MINUTES);
  const headTrackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowTop =
    nowMinutes != null && nowMinutes >= OPEN_MINUTES && nowMinutes <= CLOSING_MINUTES
      ? ((nowMinutes - OPEN_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT
      : null;

  const syncHead = (scrollLeft: number) => {
    if (headTrackRef.current) headTrackRef.current.style.transform = `translateX(${-scrollLeft}px)`;
  };

  return (
    <div className="cal-grid" style={{ ["--cal-cols" as string]: columns.length }}>
      <div
        className="cal-grid-head-bar"
        onWheel={(e) => {
          const scroller = scrollRef.current;
          if (!scroller || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
          scroller.scrollLeft += e.deltaX;
        }}
      >
        <div className="cal-time-head" />
        <div className="cal-head-clip">
          <div ref={headTrackRef} className="cal-head-track">
        {columns.map((artist) => {
          const occupied: OccupiedInterval[] = bookings
            .filter((b) => b.artist_id === artist.id && isBlocking(b.status))
            .map((b) => {
              const start = parseTimeToMinutes(b.booking_time.slice(0, 5));
              return { startMinutes: start, endMinutes: start + b.duration_minutes };
            });
          const lunch = lunchInterval(artist);
          if (lunch) occupied.push(lunch);
          const closed = filterAvailableTimes(CANDIDATE_TIMES, SLOT_MINUTES, occupied).length === 0;
          return (
            <div key={artist.id} className="cal-artist-head">
              <span className="cal-avatar">
                <span className="cal-avatar-char">{avatarInitial(artist.name_kr)}</span>
              </span>
              <span className="cal-artist-name">{artist.name_kr}</span>
              {artist.role ? <span className="cal-artist-role">{artist.role}</span> : null}
              {closed ? (
                <span className="cal-closed-badge">
                  <span className="cal-closed-badge-label">마감</span>
                </span>
              ) : null}
            </div>
          );
        })}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="cal-hscroll"
        onScroll={(e) => syncHead(e.currentTarget.scrollLeft)}
      >
      <div className="cal-grid-body" style={{ height: SLOT_COUNT * SLOT_HEIGHT }}>
        {slots.map((m, i) =>
          i === 0 ? null : (
            <div
              key={m}
              className={clsx("cal-slot-line", m % 60 === 0 ? "is-hour" : "is-half")}
              style={{ top: i * SLOT_HEIGHT }}
            />
          )
        )}

        <div className="cal-time-col">
          {slots.map((m, i) =>
            i === 0 ? null : (
              <div
                key={`line-${m}`}
                className={clsx("cal-slot-line", m % 60 === 0 ? "is-hour" : "is-half")}
                style={{ top: i * SLOT_HEIGHT }}
              />
            )
          )}
          {slots
            .filter((m) => m % 60 === 0)
            .map((m) => (
              <span
                key={m}
                className="cal-time-label"
                style={{ top: ((m - OPEN_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT }}
              >
                {minutesLabel(m)}
              </span>
            ))}
        </div>

        {columns.map((artist) => {
          const lunch = lunchInterval(artist);
          const own = visible.filter((b) => b.artist_id === artist.id);
          const taken = (slotStart: number) =>
            own.some((b) => {
              const s = parseTimeToMinutes(b.booking_time.slice(0, 5));
              return slotStart >= s && slotStart < s + b.duration_minutes;
            }) ||
            (lunch != null && slotStart >= lunch.startMinutes && slotStart < lunch.endMinutes);
          return (
            <div key={artist.id} className="cal-col">
              {slots.map((m, i) =>
                taken(m) ? null : (
                  <div
                    key={m}
                    className="cal-cell"
                    style={{ top: i * SLOT_HEIGHT }}
                    onClick={() => onCreateAt(hhmm(m), artist.id)}
                  >
                    <span className="cal-cell-add">
                      <CalIcon src="/admin-icons/lnb/plus.png" className="cal-cell-add-icon" />
                    </span>
                  </div>
                )
              )}

              {lunch && lunch.startMinutes >= OPEN_MINUTES && lunch.startMinutes < CLOSING_MINUTES ? (
                <div
                  className="cal-lunch"
                  style={{
                    top: ((lunch.startMinutes - OPEN_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT,
                    height: ((lunch.endMinutes - lunch.startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT
                  }}
                >
                  <span className="cal-lunch-label">
                    점심시간 ({durationLabel(lunch.endMinutes - lunch.startMinutes)})
                  </span>
                </div>
              ) : null}

              {own.map((b) => {
                const start = parseTimeToMinutes(b.booking_time.slice(0, 5));
                if (!Number.isFinite(start) || start < OPEN_MINUTES) return null;
                const end = start + b.duration_minutes;
                const short = b.duration_minutes <= SLOT_MINUTES;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onOpenBooking(b.id)}
                    className={clsx(
                      "cal-booking",
                      TONE_CLASS[b.tone],
                      short && "is-short",
                      b.status === "pending" && "is-pending"
                    )}
                    style={{
                      top: ((start - OPEN_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT,
                      height: (b.duration_minutes / SLOT_MINUTES) * SLOT_HEIGHT
                    }}
                  >
                    <span className="cal-booking-inner">
                      <span className="cal-booking-head">
                        <span className="cal-booking-name">{b.customer_name}</span>
                        {b.is_new ? <span className="cal-booking-new">NEW</span> : null}
                      </span>
                      <span className="cal-booking-svc">{(b.service_names || []).join(" / ")}</span>
                      {!short ? (
                        <span className="cal-booking-time">
                          {hhmm(start)} - {hhmm(end)} ({durationLabel(b.duration_minutes)})
                        </span>
                      ) : null}
                      {!short && b.memo ? <span className="cal-booking-memo">{b.memo}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {nowTop != null ? (
          <div className="cal-now" style={{ top: nowTop }}>
            <span className="cal-now-dot" />
          </div>
        ) : null}
      </div>
      </div>
    </div>
  );
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function AdminCalendarDesktop({
  legacy,
  tab,
  onTab,
  onOpenBooking,
  reloadKey
}: {
  legacy: ReactNode;
  tab: CalTab;
  onTab: (tab: CalTab) => void;
  onOpenBooking: (id: string) => void;
  reloadKey: number;
}) {
  const [date, setDate] = useState(todayYmd);
  const [artists, setArtists] = useState<CalArtist[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bookings, setBookings] = useState<CalDayBooking[]>([]);
  const [catalog, setCatalog] = useState<SearchHit[]>([]);
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [nowMinutes, setNowMinutes] = useState<number>(currentMinutes);

  useEffect(() => {
    const id = window.setInterval(() => setNowMinutes(currentMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const list = (d.artists as (CalArtist & { is_published: boolean })[]).filter((a) => a.is_published);
        setArtists(list);
        setSelectedIds(list.map((a) => a.id));
      })
      .catch(() => setArtists([]));
  }, [tick]);

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCatalog(d.bookings as SearchHit[]);
      })
      .catch(() => undefined);
  }, [tick, reloadKey]);

  useEffect(() => {
    const qs = new URLSearchParams({ from: date, to: date });
    fetch(`/api/admin/calendar?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setBookings(d.bookings as CalDayBooking[]);
      })
      .catch(() => undefined);
  }, [date, tick, reloadKey]);

  if (artists === null) return <div className="ADMIN-CALENDAR" />;

  return (
    <CalendarDesktopView
      tab={tab}
      onTab={onTab}
      date={date}
      onDate={setDate}
      artists={artists}
      selectedIds={selectedIds}
      onToggleArtist={(id) =>
        setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
      }
      bookings={bookings}
      catalog={catalog}
      nowMinutes={date === todayYmd() ? nowMinutes : null}
      query={query}
      onQuery={setQuery}
      onPickSearch={(hit) => {
        setDate(hit.booking_date);
        if (hit.artist_id) setSelectedIds([hit.artist_id]);
        onTab("day");
        onOpenBooking(hit.id);
      }}
      onRefresh={() => setTick((n) => n + 1)}
      onOpenBooking={onOpenBooking}
      legacy={legacy}
    />
  );
}
