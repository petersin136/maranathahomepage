import type { SupabaseClient } from "@supabase/supabase-js";

export const SETTLEMENT_LOCK_ERROR = "마감된 달의 예약은 수정할 수 없습니다.";

const CLOSED_SAFE_KEYS = new Set(["admin_memo", "customer_request"]);

export function isClosedMonthSafePatch(body: Record<string, unknown>) {
  const keys = Object.keys(body).filter((key) => body[key] !== undefined);
  return keys.length > 0 && keys.every((key) => CLOSED_SAFE_KEYS.has(key));
}

export function kstYearMonthFromIso(iso: string) {
  if (!iso) return null;
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(iso));
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd.slice(0, 7) : null;
}

export function ymdYearMonth(ymd: string) {
  const day = String(ymd || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.slice(0, 7) : null;
}

export function bookingLockYearMonths(row: {
  booking_date?: string | null;
  paid_at?: string | null;
}) {
  const months = new Set<string>();
  const bookingYm = ymdYearMonth(String(row.booking_date ?? ""));
  if (bookingYm) months.add(bookingYm);
  if (row.paid_at) {
    const paidYm = kstYearMonthFromIso(String(row.paid_at));
    if (paidYm) months.add(paidYm);
  }
  return [...months];
}

export async function findClosedYearMonths(admin: SupabaseClient, yearMonths: string[]) {
  const unique = [...new Set(yearMonths.filter(Boolean))];
  if (unique.length === 0) return { closed: [] as string[], error: null };
  const { data, error } = await admin
    .from("settlement_closes")
    .select("year_month")
    .in("year_month", unique);
  if (error) return { closed: [] as string[], error };
  const closed = (data ?? [])
    .map((row) => String(row.year_month || ""))
    .filter(Boolean);
  return { closed, error: null };
}
