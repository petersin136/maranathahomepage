"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { avgVisitCycleDays } from "@/lib/admin/customers-data";
import { parseRequestLanguage, resolveCustomerRequestText } from "@/lib/admin/booking-display";
import {
  STATE_META,
  customerProfileHref,
  customerState,
  useCustomerFilters
} from "@/components/admin/CustomerFilters";

type BookingRecord = {
  id: string;
  created_at: string;
  booking_date: string;
  booking_time: string;
  artist_name: string | null;
  service_names: string[] | null;
  status: string;
  final_amount: number | null;
  total_amount: number | null;
  admin_memo: string | null;
  customer_request?: string | null;
  cancel_reason?: string | null;
  customer_name: string | null;
  customer_phone: string | null;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  completed: { label: "완료", className: "is-completed" },
  confirmed: { label: "확정", className: "is-confirmed" },
  pending: { label: "대기", className: "is-pending" },
  cancelled: { label: "취소", className: "is-cancelled" },
  noshow: { label: "노쇼", className: "is-noshow" }
};

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  const [y, m, d] = date.slice(0, 10).split("-");
  return `${y}. ${m}. ${d}`;
}

function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAY_KO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function amountOf(b: BookingRecord) {
  const v = b.final_amount ?? b.total_amount;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

function adminMemoText(memo: string | null) {
  const text = (memo || "").trim();
  if (!text || text.startsWith("[고객요청] ")) return "";
  return text;
}

export default function AdminCustomerProfilePage() {
  return (
    <Suspense fallback={null}>
      <CustomerProfile />
    </Suspense>
  );
}

function CustomerProfile() {
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone")?.trim() ?? "";
  const { rows, loading: rowsLoading } = useCustomerFilters();
  const [bookings, setBookings] = useState<BookingRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!phone) return;
    let alive = true;
    setBookings(null);
    setError(null);
    fetch("/api/admin/bookings?status=all")
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return;
        if (!json?.ok) throw new Error(json?.error || "예약 내역을 불러오지 못했습니다.");
        const list = (json.bookings as BookingRecord[]).filter(
          (b) => (b.customer_phone || "").trim() === phone
        );
        setBookings(list);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "예약 내역을 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, [phone]);

  const row = useMemo(() => rows.find((r) => r.phone === phone) ?? null, [rows, phone]);

  const history = useMemo(
    () =>
      [...(bookings ?? [])].sort((a, b) => {
        const d = b.booking_date.localeCompare(a.booking_date);
        return d !== 0 ? d : String(b.booking_time).localeCompare(String(a.booking_time));
      }),
    [bookings]
  );

  const completed = useMemo(() => history.filter((b) => b.status === "completed"), [history]);

  const firstRegistered = useMemo(() => {
    const dates = history.map((b) => b.created_at).filter(Boolean).sort();
    return dates[0] ?? null;
  }, [history]);

  const firstVisit = completed.length ? completed[completed.length - 1].booking_date : null;
  const cycle = avgVisitCycleDays(completed.map((b) => ({ bookingDate: b.booking_date })));

  const memos = useMemo(() => {
    const list: { id: string; date: string; kind: "memo" | "request"; text: string; lang: string | null }[] = [];
    for (const b of history) {
      const memo = adminMemoText(b.admin_memo);
      if (memo) list.push({ id: `${b.id}-m`, date: b.booking_date, kind: "memo", text: memo, lang: null });
      const request = resolveCustomerRequestText(b.customer_request, b.admin_memo);
      if (request) {
        const parsed = parseRequestLanguage(request);
        list.push({ id: `${b.id}-r`, date: b.booking_date, kind: "request", text: parsed.body, lang: parsed.lang });
      }
    }
    return list;
  }, [history]);

  const topServices = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of completed) {
      for (const name of b.service_names ?? []) {
        const key = String(name || "").trim();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [completed]);

  if (!phone) return <CustomerPicker />;

  const state = row ? customerState(row) : null;
  const name = row?.name || history[0]?.customer_name?.trim() || phone;
  const maxService = topServices[0]?.[1] ?? 1;

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("전화번호 복사에 실패했습니다.");
    }
  };

  return (
    <div className="insight-page font-pc-kr text-text1">
      {error ? <p className="mb-4 text-pc-base text-danger">{error}</p> : null}

      <section className="float-card">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <span className="profile-avatar">{name.slice(0, 1)}</span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-dash-ink">{name}</h1>
                {state ? (
                  <span className={clsx("profile-state", state === "churn" && "is-churn")}>
                    {STATE_META[state].label}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-pc-base text-text2">
                <button type="button" onClick={() => void copyPhone()} className="tabular-nums hover:underline">
                  {copied ? "복사됨" : formatPhone(phone)}
                </button>
                <span className="profile-sep" />
                <span>담당 {row?.artistName || "—"}</span>
                <span className="profile-sep" />
                <span>{firstVisit ? `${formatDate(firstVisit)}부터 방문` : "방문 기록 없음"}</span>
              </p>
            </div>
          </div>
          <Link href="/admin/customers" className="profile-back">
            고객 목록
          </Link>
        </div>

        <dl className="profile-stats">
          <ProfileStat label="첫 예약 등록" value={formatDate(firstRegistered)} />
          <ProfileStat label="첫 방문" value={formatDate(firstVisit)} />
          <ProfileStat
            label="최근 방문"
            value={formatDate(row?.lastVisitDate)}
            hint={row?.daysSince != null ? `${row.daysSince}일 경과` : undefined}
          />
          <ProfileStat label="방문 횟수" value={`${(row?.visitCount ?? completed.length).toLocaleString("ko-KR")}회`} />
          <ProfileStat label="누적 매출" value={won(row?.lifetimeRevenue ?? 0)} />
          <ProfileStat label="평균 방문 주기" value={cycle != null ? `${Math.round(cycle)}일` : "—"} />
        </dl>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 min-[1440px]:grid-cols-[3fr_2fr]">
        <section className="float-card">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-dash-section font-bold text-dash-ink">시술 이력</h2>
            <span className="text-pc-base font-bold text-text1">총 {history.length}건</span>
          </div>
          {bookings == null && !error ? (
            <p className="insight-empty">불러오는 중…</p>
          ) : history.length === 0 ? (
            <p className="insight-empty">예약 내역이 없습니다</p>
          ) : (
            <ol className="profile-timeline">
              {history.map((b) => {
                const meta = STATUS_META[b.status] ?? { label: b.status, className: "" };
                const amount = amountOf(b);
                const services = (b.service_names ?? []).filter(Boolean).join(" / ");
                return (
                  <li key={b.id} className={clsx("profile-timeline__item", meta.className)}>
                    <div className="profile-timeline__date">
                      <span className="tabular-nums">{formatDate(b.booking_date).slice(2)}</span>
                      <span>
                        {weekdayOf(b.booking_date)} · {b.booking_time}
                      </span>
                    </div>
                    <div className="profile-timeline__dot" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-pc-base font-bold text-dash-ink">{services || "시술 정보 없음"}</p>
                        <span className={clsx("profile-status", meta.className)}>{meta.label}</span>
                      </div>
                      <p className="mt-1 text-pc-sm text-text2">
                        {b.artist_name || "디자이너 미정"}
                        {amount != null ? ` · ${won(amount)}` : ""}
                        {b.cancel_reason ? ` · 사유: ${b.cancel_reason}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="float-card">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-dash-section font-bold text-dash-ink">메모</h2>
              <span className="text-pc-base font-bold text-text1">{memos.length}건</span>
            </div>
            {memos.length === 0 ? (
              <p className="insight-empty">남겨진 메모가 없습니다</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {memos.map((m) => (
                  <li key={m.id} className="profile-memo">
                    <div className="flex items-center gap-2 text-pc-sm">
                      <span className={clsx("profile-memo__tag", m.kind === "request" && "is-request")}>
                        {m.kind === "request" ? "고객 요청" : "관리자 메모"}
                      </span>
                      {m.lang ? <span className="font-semibold text-text3">{m.lang}</span> : null}
                      <span className="ml-auto tabular-nums text-text3">{formatDate(m.date)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-pc-base leading-[1.6] text-text1">{m.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="float-card">
            <h2 className="text-dash-section font-bold text-dash-ink">자주 받은 시술</h2>
            {topServices.length === 0 ? (
              <p className="insight-empty">완료된 시술이 없습니다</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-4">
                {topServices.map(([service, count]) => (
                  <li key={service}>
                    <div className="flex items-center justify-between text-pc-base">
                      <span className="font-semibold text-text1">{service}</span>
                      <span className="tabular-nums text-text2">{count}회</span>
                    </div>
                    <div className="profile-bar">
                      <span className="profile-bar__fill" style={{ width: `${(count / maxService) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {rowsLoading ? null : !row ? (
        <p className="mt-4 text-pc-sm text-text3">고객 목록 집계에 없는 번호라 방문 요약은 예약 내역 기준으로 표시합니다.</p>
      ) : null}
    </div>
  );
}

function ProfileStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="profile-stats__item">
      <dt className="text-pc-sm font-semibold text-text3">{label}</dt>
      <dd className="mt-2 text-pc-lg font-bold tabular-nums text-dash-ink">{value}</dd>
      {hint ? <dd className="mt-1 text-pc-sm text-text2">{hint}</dd> : null}
    </div>
  );
}

function CustomerPicker() {
  const router = useRouter();
  const { rows, loading } = useCustomerFilters();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const digits = query.replace(/\D/g, "");
    return [...rows]
      .filter(
        (r) =>
          !query ||
          r.name.toLowerCase().includes(query) ||
          (digits.length > 0 && r.phone.replace(/\D/g, "").includes(digits))
      )
      .sort((a, b) => (b.lastVisitDate || "").localeCompare(a.lastVisitDate || ""));
  }, [rows, q]);

  return (
    <div className="insight-page font-pc-kr text-text1">
      <section className="float-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-dash-section font-bold text-dash-ink">고객을 선택하세요</h2>
            <p className="mt-1 text-pc-base text-text2">고객 목록에서 이름을 누르거나, 여기서 검색해 프로필을 열 수 있습니다.</p>
          </div>
          <label className="member-search__box profile-picker-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="고객명, 연락처 검색"
              aria-label="고객 검색"
              className="member-search__input"
            />
          </label>
        </div>
        {loading ? (
          <p className="insight-empty">불러오는 중…</p>
        ) : list.length === 0 ? (
          <p className="insight-empty">검색 결과가 없습니다</p>
        ) : (
          <ul className="profile-picker">
            {list.map((r) => (
              <li key={r.phone}>
                <button
                  type="button"
                  onClick={() => router.push(customerProfileHref(r.phone))}
                  className="profile-picker__item"
                >
                  <span className="profile-avatar is-sm">{r.name.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-pc-base font-bold text-dash-ink">{r.name}</span>
                    <span className="block text-pc-sm tabular-nums text-text3">{formatPhone(r.phone)}</span>
                  </span>
                  <span className="text-right text-pc-sm text-text2">
                    <span className="block tabular-nums">{formatDate(r.lastVisitDate)}</span>
                    <span className="block">{r.visitCount}회 방문</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
