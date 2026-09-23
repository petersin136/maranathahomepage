import type { PaymentMethod } from "@/lib/bookings/types";

export const SALES_PRESETS = [
  "today",
  "this_week",
  "this_month",
  "last_month",
  "custom"
] as const;

export type SalesPreset = (typeof SALES_PRESETS)[number];

export type SalesPeriod = {
  preset: SalesPreset;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
};

export type SalesDailyPoint = {
  date: string;
  revenue: number;
  count: number;
};

export type SalesMethodRow = {
  method: PaymentMethod;
  label: string;
  amount: number;
  count: number;
  share: number;
};

export type SalesArtistRow = {
  artistId: string | null;
  artistName: string;
  revenue: number;
  count: number;
  avgTicket: number;
  share: number;
  commissionRate: number | null;
  incentive: number | null;
};

export type SalesServiceRow = {
  name: string;
  count: number;
};

export type SalesSummary = {
  totalRevenue: number;
  revenueChangeRate: number | null;
  completedCount: number;
  completedChange: number;
  completedChangeRate: number | null;
  avgTicket: number;
  missingAmountCount: number;
  receiptWarningCount: number;
};

export type SalesAttrition = {
  totalBookings: number;
  cancelledCount: number;
  cancelledRate: number;
  noshowCount: number;
  noshowRate: number;
  noshowHigh: boolean;
};

export type SalesDashboard = {
  period: SalesPeriod;
  summary: SalesSummary;
  daily: SalesDailyPoint[];
  methods: SalesMethodRow[];
  artists: SalesArtistRow[];
  services: SalesServiceRow[];
  attrition: SalesAttrition;
};

const TZ = "Asia/Seoul";
const CASH_RECEIPT_THRESHOLD = 100_000;
const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체"
};

type BookingSaleRow = {
  id: string;
  status: string;
  paid_at: string | null;
  final_amount: number | null;
  payment_method: PaymentMethod | null;
  cash_receipt_issued: boolean | null;
  artist_id: string | null;
  artist_name: string | null;
  service_names: string[] | null;
  booking_date: string;
};

type ArtistRate = {
  id: string;
  name_kr: string | null;
  name_en: string | null;
  commission_rate: number | null;
};

export function todayKst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function formatYmd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addDays(ymd: string, delta: number) {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function weekStartMonday(ymd: string) {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(ymd, -back);
}

function monthStart(ymd: string) {
  const { y, m } = parseYmd(ymd);
  return formatYmd(y, m, 1);
}

function monthEnd(ymd: string) {
  const { y, m } = parseYmd(ymd);
  return formatYmd(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
}

function shiftMonth(ymd: string, delta: number) {
  const { y, m } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1);
}

function daysInclusive(from: string, to: string) {
  const a = parseYmd(from);
  const b = parseYmd(to);
  const start = Date.UTC(a.y, a.m - 1, a.d);
  const end = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((end - start) / 86_400_000) + 1;
}

function eachYmd(from: string, to: string) {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** KST calendar day → timestamptz bound (paid_at 비교용). */
export function kstDayStartIso(ymd: string) {
  return `${ymd}T00:00:00+09:00`;
}

export function kstDayEndExclusiveIso(ymd: string) {
  return `${addDays(ymd, 1)}T00:00:00+09:00`;
}

function paidAtToKstYmd(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(iso));
}

export function resolveSalesPeriod(
  presetRaw: string | null,
  fromRaw: string | null,
  toRaw: string | null
): SalesPeriod | { error: string } {
  const today = todayKst();
  const preset = (SALES_PRESETS as readonly string[]).includes(presetRaw || "")
    ? (presetRaw as SalesPreset)
    : fromRaw && toRaw
      ? "custom"
      : "this_month";

  let from = today;
  let to = today;

  if (preset === "today") {
    from = today;
    to = today;
  } else if (preset === "this_week") {
    from = weekStartMonday(today);
    to = addDays(from, 6);
  } else if (preset === "this_month") {
    from = monthStart(today);
    to = monthEnd(today);
  } else if (preset === "last_month") {
    const start = shiftMonth(today, -1);
    from = start;
    to = monthEnd(start);
  } else {
    if (!fromRaw || !toRaw || !isYmd(fromRaw) || !isYmd(toRaw)) {
      return { error: "직접 선택 기간의 날짜가 올바르지 않습니다." };
    }
    from = fromRaw;
    to = toRaw;
  }

  if (from > to) return { error: "시작일이 종료일보다 늦을 수 없습니다." };
  if (daysInclusive(from, to) > 366) {
    return { error: "조회 기간은 최대 366일입니다." };
  }

  let prevFrom: string;
  let prevTo: string;
  if (preset === "this_month") {
    const start = shiftMonth(from, -1);
    prevFrom = start;
    prevTo = monthEnd(start);
  } else if (preset === "last_month") {
    const start = shiftMonth(from, -1);
    prevFrom = start;
    prevTo = monthEnd(start);
  } else {
    const length = daysInclusive(from, to);
    prevTo = addDays(from, -1);
    prevFrom = addDays(prevTo, -(length - 1));
  }

  return { preset, from, to, prevFrom, prevTo };
}

function changeRate(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function isRevenueRow(row: BookingSaleRow) {
  return row.status === "completed" && row.final_amount != null && !Number.isNaN(Number(row.final_amount));
}

function isReceiptWarning(row: BookingSaleRow) {
  if (!isRevenueRow(row) || row.payment_method === "card") return false;
  return Number(row.final_amount) >= CASH_RECEIPT_THRESHOLD && !row.cash_receipt_issued;
}

function summarizeCompleted(rows: BookingSaleRow[]) {
  const missingAmountCount = rows.filter(
    (r) => r.status === "completed" && r.final_amount == null
  ).length;
  const revenueRows = rows.filter(isRevenueRow);
  const totalRevenue = revenueRows.reduce((sum, r) => sum + Number(r.final_amount), 0);
  const completedCount = revenueRows.length;
  return {
    totalRevenue,
    completedCount,
    missingAmountCount,
    receiptWarningCount: revenueRows.filter(isReceiptWarning).length,
    revenueRows
  };
}

function buildDaily(from: string, to: string, revenueRows: BookingSaleRow[]): SalesDailyPoint[] {
  const byDate = new Map<string, { revenue: number; count: number }>();
  for (const row of revenueRows) {
    if (!row.paid_at) continue;
    const date = paidAtToKstYmd(row.paid_at);
    const cur = byDate.get(date) ?? { revenue: 0, count: 0 };
    cur.revenue += Number(row.final_amount);
    cur.count += 1;
    byDate.set(date, cur);
  }
  return eachYmd(from, to).map((date) => {
    const cur = byDate.get(date) ?? { revenue: 0, count: 0 };
    return { date, revenue: cur.revenue, count: cur.count };
  });
}

function buildMethods(revenueRows: BookingSaleRow[], totalRevenue: number): SalesMethodRow[] {
  const methods: PaymentMethod[] = ["card", "cash", "transfer"];
  return methods.map((method) => {
    const rows = revenueRows.filter((r) => r.payment_method === method);
    const amount = rows.reduce((sum, r) => sum + Number(r.final_amount), 0);
    return {
      method,
      label: METHOD_LABEL[method],
      amount,
      count: rows.length,
      share: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
    };
  });
}

function resolveCommissionRate(raw: number | null | undefined) {
  if (raw == null || Number.isNaN(Number(raw)) || Number(raw) <= 0) return null;
  return Number(raw);
}

function buildArtists(
  revenueRows: BookingSaleRow[],
  totalRevenue: number,
  artists: ArtistRate[]
): SalesArtistRow[] {
  const rateById = new Map(artists.map((a) => [a.id, resolveCommissionRate(a.commission_rate)]));
  const grouped = new Map<
    string,
    { artistId: string | null; artistName: string; revenue: number; count: number }
  >();

  for (const row of revenueRows) {
    const artistId = row.artist_id || null;
    const key = artistId || row.artist_name || "unknown";
    const artistName = row.artist_name || artistId || "미지정";
    const cur = grouped.get(key) ?? { artistId, artistName, revenue: 0, count: 0 };
    cur.revenue += Number(row.final_amount);
    cur.count += 1;
    if (!cur.artistName && artistName) cur.artistName = artistName;
    grouped.set(key, cur);
  }

  return [...grouped.values()]
    .map((row) => {
      const rate = row.artistId ? rateById.get(row.artistId) ?? null : null;
      return {
        artistId: row.artistId,
        artistName: row.artistName,
        revenue: row.revenue,
        count: row.count,
        avgTicket: row.count > 0 ? Math.round(row.revenue / row.count) : 0,
        share: totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0,
        commissionRate: rate,
        incentive: rate != null ? Math.round((row.revenue * rate) / 100) : null
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function buildServices(revenueRows: BookingSaleRow[]): SalesServiceRow[] {
  const counts = new Map<string, number>();
  for (const row of revenueRows) {
    const names = Array.isArray(row.service_names) ? row.service_names : [];
    for (const raw of names) {
      const name = String(raw || "").trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function buildAttrition(rows: { status: string }[]): SalesAttrition {
  const totalBookings = rows.length;
  const cancelledCount = rows.filter((r) => r.status === "cancelled").length;
  const noshowCount = rows.filter((r) => r.status === "noshow").length;
  const cancelledRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;
  const noshowRate = totalBookings > 0 ? (noshowCount / totalBookings) * 100 : 0;
  return {
    totalBookings,
    cancelledCount,
    cancelledRate,
    noshowCount,
    noshowRate,
    noshowHigh: noshowRate > 10
  };
}

export function aggregateSales(args: {
  period: SalesPeriod;
  currentCompleted: BookingSaleRow[];
  previousCompleted: BookingSaleRow[];
  periodBookings: { status: string }[];
  artists: ArtistRate[];
}): SalesDashboard {
  const current = summarizeCompleted(args.currentCompleted);
  const previous = summarizeCompleted(args.previousCompleted);

  return {
    period: args.period,
    summary: {
      totalRevenue: current.totalRevenue,
      revenueChangeRate: changeRate(current.totalRevenue, previous.totalRevenue),
      completedCount: current.completedCount,
      completedChange: current.completedCount - previous.completedCount,
      completedChangeRate: changeRate(current.completedCount, previous.completedCount),
      avgTicket:
        current.completedCount > 0
          ? Math.round(current.totalRevenue / current.completedCount)
          : 0,
      missingAmountCount: current.missingAmountCount,
      receiptWarningCount: current.receiptWarningCount
    },
    daily: buildDaily(args.period.from, args.period.to, current.revenueRows),
    methods: buildMethods(current.revenueRows, current.totalRevenue),
    artists: buildArtists(current.revenueRows, current.totalRevenue, args.artists),
    services: buildServices(current.revenueRows),
    attrition: buildAttrition(args.periodBookings)
  };
}
