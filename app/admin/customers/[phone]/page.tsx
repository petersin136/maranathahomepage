"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { STATE_META, customerState, type CustomerState, useCustomerFilters } from "@/components/admin/CustomerFilters";
import { avgVisitCycleDays } from "@/lib/admin/customers-data";
import { BOOKING_STATUS_LABEL, cancelReasonLabel } from "@/lib/admin/booking-labels";
import { parseRequestLanguage, resolveCustomerRequestText } from "@/lib/admin/booking-display";
import type { BookingStatus, CustomerGender, PaymentMethod } from "@/lib/bookings/types";

type CustomerBooking = {
  id: string;
  created_at: string;
  status: BookingStatus;
  booking_date: string;
  booking_time: string;
  customer_name: string | null;
  customer_gender: CustomerGender | null;
  artist_id: string | null;
  artist_name: string | null;
  service_names: string[] | null;
  total_amount: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean | null;
  final_amount: number | null;
  payment_method: PaymentMethod | null;
  admin_memo: string | null;
  customer_request: string | null;
  cancel_reason: string | null;
};

type CustomerDetailResponse = {
  ok: boolean;
  error?: string;
  today: string;
  bookings: CustomerBooking[];
  note: { memo: string; updated_at: string } | null;
  noteError: string | null;
};

const STATE_COLOR: Record<CustomerState, string> = {
  churn: "var(--danger)",
  returning: "var(--ink)",
  new: "var(--muted)"
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: "#8A847C",
  confirmed: "#1C1C1C",
  completed: "#1C1C1C",
  cancelled: "#9A948C",
  noshow: "var(--danger)"
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체"
};

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatDate(date: string | null | undefined, withWeekday = true) {
  if (!date) return "—";
  const [y, m, d] = date.slice(0, 10).split("-");
  const head = `${y.slice(2)}. ${m}. ${d}`;
  if (!withWeekday) return head;
  const dow = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay();
  return `${head} (${WEEKDAY_KO[dow]})`;
}

function kstDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(iso));
}

function kstDateTime(iso: string) {
  const time = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));
  return `${formatDate(kstDate(iso), false)} ${time}`;
}

function daysBetween(fromYmd: string, toYmd: string) {
  const [ay, am, ad] = fromYmd.split("-").map(Number);
  const [by, bm, bd] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

function dDay(date: string, today: string) {
  const diff = daysBetween(today, date);
  if (diff === 0) return "D-day";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

function won(value: number | null | undefined) {
  return value != null ? `${value.toLocaleString("ko-KR")}원` : "—";
}

function services(b: CustomerBooking) {
  return (b.service_names ?? []).filter(Boolean).join(" / ") || "—";
}

function adminMemoText(memo: string | null) {
  const text = (memo || "").trim();
  if (!text || text.startsWith("[고객요청] ")) return "";
  return text;
}

function isUpcoming(b: CustomerBooking, today: string) {
  return (b.status === "pending" || b.status === "confirmed") && b.booking_date >= today;
}

function byDateAsc(a: CustomerBooking, b: CustomerBooking) {
  return a.booking_date.localeCompare(b.booking_date) || String(a.booking_time).localeCompare(String(b.booking_time));
}

export default function AdminCustomerDetailPage() {
  const params = useParams<{ phone: string }>();
  const phone = useMemo(() => {
    try {
      return decodeURIComponent(params.phone).trim();
    } catch {
      return params.phone.trim();
    }
  }, [params.phone]);
  const { rows } = useCustomerFilters();

  const [data, setData] = useState<CustomerDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [savedMemo, setSavedMemo] = useState("");
  const [memoUpdatedAt, setMemoUpdatedAt] = useState<string | null>(null);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(phone)}`);
      const json = (await res.json()) as CustomerDetailResponse;
      if (!res.ok || !json.ok) throw new Error(json.error || "고객 정보를 불러오지 못했습니다.");
      setData(json);
      setMemo(json.note?.memo ?? "");
      setSavedMemo(json.note?.memo ?? "");
      setMemoUpdatedAt(json.note?.updated_at ?? null);
      setMemoError(json.noteError);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "고객 정보를 불러오지 못했습니다.");
    }
  }, [phone]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMemo = async () => {
    setSaving(true);
    setMemoError(null);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(phone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "메모 저장에 실패했습니다.");
      setSavedMemo(json.note.memo);
      setMemo(json.note.memo);
      setMemoUpdatedAt(json.note.updated_at);
    } catch (e) {
      setMemoError(e instanceof Error ? e.message : "메모 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const today = data?.today ?? "";
  const bookings = useMemo(() => data?.bookings ?? [], [data]);

  const upcoming = useMemo(
    () => bookings.filter((b) => isUpcoming(b, today)).sort(byDateAsc),
    [bookings, today]
  );
  const history = useMemo(
    () => bookings.filter((b) => !isUpcoming(b, today)).sort((a, b) => byDateAsc(b, a)),
    [bookings, today]
  );
  const completed = useMemo(() => history.filter((b) => b.status === "completed").sort(byDateAsc), [history]);

  const summary = useMemo(() => {
    const first = completed[0] ?? null;
    const last = completed[completed.length - 1] ?? null;
    const registered = bookings.map((b) => b.created_at).filter(Boolean).sort()[0] ?? null;
    const revenue = completed.reduce((sum, b) => sum + (b.final_amount ?? b.total_amount ?? 0), 0);
    const cycle = avgVisitCycleDays(completed.map((b) => ({ bookingDate: b.booking_date })));

    const artistCounts = new Map<string, number>();
    const serviceCounts = new Map<string, number>();
    for (const b of completed) {
      const artist = b.artist_name || b.artist_id;
      if (artist) artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
      for (const name of b.service_names ?? []) {
        if (name) serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
      }
    }
    const top = <T,>(map: Map<T, number>) => [...map.entries()].sort((a, b) => b[1] - a[1]);

    const latestNamed = [...bookings].sort((a, b) => byDateAsc(b, a)).find((b) => b.customer_name?.trim());
    const latestGender = [...bookings].sort((a, b) => byDateAsc(b, a)).find((b) => b.customer_gender);

    return {
      first,
      last,
      registered,
      revenue,
      cycle,
      artist: top(artistCounts)[0]?.[0] ?? null,
      topServices: top(serviceCounts).slice(0, 3),
      name: latestNamed?.customer_name?.trim() || null,
      gender: latestGender?.customer_gender ?? null,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
      noshow: bookings.filter((b) => b.status === "noshow").length
    };
  }, [bookings, completed]);

  const bookingMemos = useMemo(() => {
    const list: { id: string; date: string; kind: "memo" | "request"; text: string; lang: string | null }[] = [];
    for (const b of [...bookings].sort((a, z) => byDateAsc(z, a))) {
      const adminMemo = adminMemoText(b.admin_memo);
      if (adminMemo) list.push({ id: `${b.id}-m`, date: b.booking_date, kind: "memo", text: adminMemo, lang: null });
      const request = resolveCustomerRequestText(b.customer_request, b.admin_memo);
      if (request) {
        const parsed = parseRequestLanguage(request);
        list.push({ id: `${b.id}-r`, date: b.booking_date, kind: "request", text: parsed.body, lang: parsed.lang });
      }
    }
    return list;
  }, [bookings]);

  const row = rows.find((r) => r.phone === phone) ?? null;
  const state = row ? customerState(row) : null;
  const name = row?.name || summary.name || phone;
  const next = upcoming[0] ?? null;
  const memoDirty = memo !== savedMemo;

  if (!data && !loadError) {
    return <p className="pt-6 font-sans-kr text-[13px] text-[#8A847C]">불러오는 중…</p>;
  }

  if (!data) {
    return (
      <div className="pt-6 font-sans-kr">
        <Link href="/admin/customers" className="text-[15px] text-[#8A847C]">
          ← 목록
        </Link>
        <p className="mt-6 text-[13px] text-[#9b4a4a]">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="pb-16 font-sans-kr text-[#1C1C1C]">
      <Link href="/admin/customers" className="text-[15px] text-[#8A847C] hover:text-[#1C1C1C]">
        ← 목록
      </Link>

      <div className="mt-6 flex items-baseline gap-3">
        <h1 className="text-[30px] font-bold leading-none tracking-[-0.02em]">{name}</h1>
        {state ? (
          <span
            className="inline-flex items-center gap-[6px] text-[15px] font-medium"
            style={{ color: STATE_COLOR[state] }}
          >
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
            {STATE_META[state].label}
          </span>
        ) : null}
        <span className="text-[15px] font-normal text-[#8A847C]">{formatPhone(phone)}</span>
      </div>

      {loadError ? <p className="mt-4 text-[13px] text-[#9b4a4a]">{loadError}</p> : null}

      <dl className="mt-10 grid grid-cols-6 border-y-[1.5px] border-[#C9C3BB]">
        <Stat
          label="첫 방문"
          value={summary.first ? formatDate(summary.first.booking_date, false) : "—"}
          hint={summary.first ? `${summary.first.booking_time} · ${services(summary.first)}` : "방문 기록 없음"}
        />
        <Stat
          label="최근 방문"
          value={summary.last ? formatDate(summary.last.booking_date, false) : "—"}
          hint={summary.last ? `${daysBetween(summary.last.booking_date, today)}일 경과` : undefined}
        />
        <Stat
          label="다음 예약"
          value={next ? formatDate(next.booking_date, false) : "—"}
          hint={next ? `${next.booking_time} · ${dDay(next.booking_date, today)}` : "예정된 예약 없음"}
        />
        <Stat label="방문 횟수" value={`${completed.length.toLocaleString("ko-KR")}회`} />
        <Stat label="누적 결제" value={won(summary.revenue)} />
        <Stat label="평균 방문 주기" value={summary.cycle != null ? `${Math.round(summary.cycle)}일` : "—"} />
      </dl>

      <div className="mt-12 grid grid-cols-2 gap-12">
        <section>
          <h2 className="text-[18px] font-bold">기본 정보</h2>
          <dl className="mt-4 border-t-[1.5px] border-[#C9C3BB]">
            <Field label="연락처" value={formatPhone(phone)} />
            <Field label="성별" value={summary.gender === "W" ? "여" : summary.gender === "M" ? "남" : "—"} />
            <Field label="주 담당" value={summary.artist || row?.artistName || "—"} />
            <Field
              label="자주 받은 시술"
              value={summary.topServices.map(([s, count]) => `${s} ${count}회`).join(", ") || "—"}
            />
            <Field label="첫 예약 등록" value={formatDate(kstDate(summary.registered))} />
            <Field label="취소 · 노쇼" value={`${summary.cancelled}회 · ${summary.noshow}회`} />
          </dl>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-bold">고객 메모</h2>
            {memoUpdatedAt ? (
              <span className="text-[13px] text-[#8A847C]">마지막 저장 {kstDateTime(memoUpdatedAt)}</span>
            ) : null}
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={7}
            placeholder="모발 상태, 선호 스타일, 알레르기, 응대 시 참고할 내용 등을 적어두세요."
            className="mt-4 w-full resize-y rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 py-2 text-[15px] leading-[24px] outline-none placeholder:text-[#B5AFA7] focus:border-[#81786d]"
          />
          {memoError ? <p className="mt-2 text-[13px] text-[#9b4a4a]">{memoError}</p> : null}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={saving || !memoDirty}
              onClick={() => void saveMemo()}
              className="inline-flex h-[40px] items-center rounded-[8px] bg-[#2F3A2F] px-4 text-[14px] font-bold text-white disabled:opacity-40"
            >
              {saving ? "저장 중..." : "메모 저장"}
            </button>
          </div>

          {bookingMemos.length > 0 ? (
            <div className="mt-6">
              <p className="text-[15px] font-bold text-[#9A948C]">예약별 메모</p>
              <ul className="mt-2">
                {bookingMemos.map((m) => (
                  <li key={m.id} className="border-b border-[#F3EFEA] py-3">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="rounded-[4px] bg-[#F3EFEA] px-[6px] py-[2px] font-semibold text-[#8A847C]">
                        {m.kind === "request" ? "고객 요청" : "예약 메모"}
                      </span>
                      {m.lang ? <span className="font-semibold text-[#9A948C]">{m.lang}</span> : null}
                      <span className="ml-auto text-[#8A847C]">{formatDate(m.date)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[24px]">{m.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <BookingTable
        title="예정된 예약"
        rows={upcoming}
        today={today}
        kind="upcoming"
        empty="예정된 예약이 없습니다."
      />
      <BookingTable
        title="시술 이력"
        rows={history}
        today={today}
        kind="history"
        empty="지난 예약 내역이 없습니다."
      />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 border-l border-[#F3EFEA] px-5 py-5 first:border-l-0 first:pl-1">
      <dt className="text-[15px] font-bold text-[#9A948C]">{label}</dt>
      <dd className="mt-3 truncate text-[20px] font-bold leading-[24px]">{value}</dd>
      {hint ? <dd className="mt-1 truncate text-[13px] text-[#8A847C]">{hint}</dd> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-8 border-b border-[#F3EFEA] py-[15px]">
      <dt className="w-[120px] shrink-0 text-[15px] font-bold text-[#9A948C]">{label}</dt>
      <dd className="min-w-0 text-[16px] font-medium">{value}</dd>
    </div>
  );
}

function BookingTable({
  title,
  rows,
  today,
  kind,
  empty
}: {
  title: string;
  rows: CustomerBooking[];
  today: string;
  kind: "upcoming" | "history";
  empty: string;
}) {
  const upcoming = kind === "upcoming";
  return (
    <section className="mt-14">
      <h2 className="flex items-baseline gap-2 text-[18px] font-bold">
        {title}
        <span className="text-[15px] font-normal text-[#8A847C]">{rows.length}건</span>
      </h2>
      <table className="mt-4 w-full table-fixed text-left text-[16px] font-medium leading-[20px]">
        <colgroup>
          <col className="w-[15%]" />
          <col className="w-[7%]" />
          <col className="w-[11%]" />
          <col className="w-[25%]" />
          <col className="w-[11%]" />
          <col className="w-[13%]" />
          <col className="w-[9%]" />
          <col className="w-[9%]" />
        </colgroup>
        <thead>
          <tr className="border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]">
            <th className="py-3 pl-1 font-bold">{upcoming ? "예약일" : "시술일"}</th>
            <th className="py-3 font-bold">시간</th>
            <th className="py-3 font-bold">담당자</th>
            <th className="py-3 font-bold">시술</th>
            <th className="py-3 font-bold">{upcoming ? "예상 금액" : "결제 금액"}</th>
            <th className="py-3 font-bold">{upcoming ? "예약금" : "결제 수단"}</th>
            <th className="py-3 font-bold">상태</th>
            <th className="py-3 text-right font-bold">관리</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const done = b.status === "completed";
            const voided = b.status === "cancelled" || b.status === "noshow";
            const amount = done ? b.final_amount ?? b.total_amount : voided ? null : b.total_amount;
            const reason = b.status === "cancelled" ? cancelReasonLabel(b.cancel_reason) : null;
            return (
              <tr key={b.id} className={clsx("border-b border-[#F3EFEA]", voided && "text-[#9A948C]")}>
                <td className="truncate py-[15px] pl-1 pr-3">
                  {formatDate(b.booking_date)}
                  {upcoming ? (
                    <span className="ml-2 text-[14px] font-normal text-[#8A847C]">{dDay(b.booking_date, today)}</span>
                  ) : null}
                </td>
                <td className="truncate py-[15px] pr-3">{b.booking_time}</td>
                <td className="truncate py-[15px] pr-3">{b.artist_name || b.artist_id || "—"}</td>
                <td className="truncate py-[15px] pr-3" title={services(b)}>
                  {services(b)}
                </td>
                <td className={clsx("truncate py-[15px] pr-3", !done && !voided && "text-[#8A847C]")}>
                  {won(amount)}
                </td>
                <td className="truncate py-[15px] pr-3">
                  {upcoming ? (
                    b.deposit_amount ? (
                      <>
                        {won(b.deposit_amount)}
                        <span className="ml-[6px] text-[14px] font-normal text-[#8A847C]">
                          {b.deposit_paid ? "입금" : "미입금"}
                        </span>
                      </>
                    ) : (
                      "—"
                    )
                  ) : b.payment_method
                      ? PAYMENT_METHOD_LABEL[b.payment_method]
                      : "—"}
                </td>
                <td className="truncate py-[15px] pr-3" title={reason ?? undefined}>
                  <span
                    className="inline-flex items-center gap-[6px]"
                    style={{ color: STATUS_COLOR[b.status] ?? "#1C1C1C" }}
                  >
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
                    {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </td>
                <td className="py-[15px] text-right font-normal text-[#8A847C]">
                  <Link href={`/admin/bookings/${b.id}` as Route} className="hover:text-[#1C1C1C]">
                    상세보기
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="py-10 text-center text-[13px] text-[#8A847C]">{empty}</p> : null}
    </section>
  );
}
