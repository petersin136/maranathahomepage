import { todayKst } from "@/lib/admin/sales-data";

const DEFAULT_SINGLE_VISIT_THRESHOLD_DAYS = 60;
const CHURN_MULTIPLIER = 1.5;
const HIGH_VALUE_PERCENTILE = 0.2;
const MIN_ARTIST_SAMPLE = 5;
const DEPOSIT_NOSHOW_GAP_PP = 5;

export type CustomerVisit = {
  id: string;
  bookingDate: string;
  bookingTime: string;
  artistId: string | null;
  artistName: string | null;
  serviceIds: string[];
  serviceNames: string[];
  amount: number;
};

export type ChurnRiskCustomer = {
  phone: string;
  name: string;
  lastVisitDate: string;
  daysSince: number;
  visitCount: number;
  lifetimeRevenue: number;
  primaryArtistName: string;
  lastServiceNames: string[];
  thresholdDays: number;
  highValue: boolean;
  avgTicket: number;
};

export type ArtistRetentionRow = {
  artistId: string;
  artistName: string;
  customerCount: number;
  returningCount: number;
  retentionRate: number | null;
  sampleInsufficient: boolean;
  avgCycleDays: number | null;
};

export type ServiceRetentionRow = {
  serviceName: string;
  treatmentCount: number;
  returnRate: number;
};

export type DepositNoshowInsight = {
  paidTotal: number;
  paidNoshow: number;
  paidNoshowRate: number;
  unpaidTotal: number;
  unpaidNoshow: number;
  unpaidNoshowRate: number;
  gapPp: number;
  suggestExpandDeposit: boolean;
};

export type HeatCell = {
  weekday: number; // 0=월 ... 6=일
  hour: number;
  count: number;
};

export type QuietSlot = {
  weekday: number;
  weekdayLabel: string;
  hour: number;
  count: number;
};

export type CustomersDashboard = {
  today: string;
  excludedNoPhoneCount: number;
  summary: {
    totalCustomers: number;
    returningCustomers: number;
    returningRate: number;
    newCustomersThisMonth: number;
    avgCycleDays: number | null;
  };
  churn: {
    customers: ChurnRiskCustomer[];
    contactCount: number;
    expectedRecoverRevenue: number;
  };
  artists: ArtistRetentionRow[];
  services: ServiceRetentionRow[];
  depositNoshow: DepositNoshowInsight;
  heatmap: {
    cells: HeatCell[];
    maxCount: number;
    quietSlots: QuietSlot[];
  };
};

type BookingRow = {
  id: string;
  status: string;
  booking_date: string;
  booking_time: string;
  customer_name: string | null;
  customer_phone: string | null;
  artist_id: string | null;
  artist_name: string | null;
  service_ids: string[] | null;
  service_names: string[] | null;
  final_amount: number | null;
  deposit_paid: boolean | null;
};

type ServiceRow = {
  id: string;
  name: string;
  revisit_days: number | null;
};

type CustomerProfile = {
  phone: string;
  name: string;
  visits: CustomerVisit[];
  completedVisits: CustomerVisit[];
};

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function daysBetween(fromYmd: string, toYmd: string) {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  const start = Date.UTC(a.y, a.m - 1, a.d);
  const end = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((end - start) / 86_400_000);
}

function normalizePhone(raw: string | null | undefined) {
  return (raw || "").trim();
}

function parseHour(bookingTime: string) {
  const match = String(bookingTime || "").match(/^(\d{1,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  return hour;
}

/** JS getUTCDay: 0=Sun → 월=0 ... 일=6 */
function weekdayIndex(ymd: string) {
  const { y, m, d } = parseYmd(ymd);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 ? 6 : dow - 1;
}

function average(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/** 방문일 정렬된 completed visits의 간격 평균 (일) */
export function avgVisitCycleDays(visits: { bookingDate: string }[]) {
  if (visits.length < 2) return null;
  const sorted = [...visits].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = daysBetween(sorted[i - 1].bookingDate, sorted[i].bookingDate);
    if (gap > 0) gaps.push(gap);
  }
  return average(gaps);
}

function maxRevisitDaysForServices(
  serviceIds: string[],
  serviceNames: string[],
  byId: Map<string, ServiceRow>,
  byName: Map<string, ServiceRow>
) {
  const days: number[] = [];
  for (const id of serviceIds) {
    const s = byId.get(id);
    if (s?.revisit_days != null && s.revisit_days > 0) days.push(s.revisit_days);
  }
  if (!days.length) {
    for (const name of serviceNames) {
      const s = byName.get(name);
      if (s?.revisit_days != null && s.revisit_days > 0) days.push(s.revisit_days);
    }
  }
  if (!days.length) return DEFAULT_SINGLE_VISIT_THRESHOLD_DAYS;
  return Math.max(...days);
}

function buildProfiles(bookings: BookingRow[]): {
  profiles: CustomerProfile[];
  excludedNoPhoneCount: number;
} {
  let excludedNoPhoneCount = 0;
  const map = new Map<string, CustomerProfile>();

  const sorted = [...bookings].sort((a, b) => {
    const d = a.booking_date.localeCompare(b.booking_date);
    if (d !== 0) return d;
    return String(a.booking_time).localeCompare(String(b.booking_time));
  });

  for (const b of sorted) {
    const phone = normalizePhone(b.customer_phone);
    if (!phone) {
      excludedNoPhoneCount += 1;
      continue;
    }

    const visit: CustomerVisit = {
      id: b.id,
      bookingDate: b.booking_date,
      bookingTime: b.booking_time,
      artistId: b.artist_id,
      artistName: b.artist_name,
      serviceIds: Array.isArray(b.service_ids) ? b.service_ids.map(String) : [],
      serviceNames: Array.isArray(b.service_names)
        ? b.service_names.map((n) => String(n || "").trim()).filter(Boolean)
        : [],
      amount: b.final_amount != null && Number.isFinite(Number(b.final_amount))
        ? Number(b.final_amount)
        : 0
    };

    const cur = map.get(phone) ?? {
      phone,
      name: (b.customer_name || "").trim() || phone,
      visits: [] as CustomerVisit[],
      completedVisits: [] as CustomerVisit[]
    };

    cur.visits.push(visit);
    if (b.status === "completed") {
      cur.completedVisits.push(visit);
      const name = (b.customer_name || "").trim();
      if (name) cur.name = name;
    }
    map.set(phone, cur);
  }

  return { profiles: [...map.values()], excludedNoPhoneCount };
}

function buildChurn(args: {
  profiles: CustomerProfile[];
  today: string;
  services: ServiceRow[];
}): CustomersDashboard["churn"] {
  const byId = new Map(args.services.map((s) => [s.id, s]));
  const byName = new Map(args.services.map((s) => [s.name, s]));
  const risks: ChurnRiskCustomer[] = [];

  for (const p of args.profiles) {
    const completed = p.completedVisits;
    if (!completed.length) continue;

    const last = completed[completed.length - 1];
    const daysSince = daysBetween(last.bookingDate, args.today);
    const cycle = avgVisitCycleDays(completed);
    const thresholdBase =
      cycle != null
        ? cycle
        : maxRevisitDaysForServices(
            last.serviceIds,
            last.serviceNames,
            byId,
            byName
          );
    const thresholdDays = thresholdBase * CHURN_MULTIPLIER;
    if (daysSince <= thresholdDays) continue;

    const artistCounts = new Map<string, { name: string; count: number }>();
    for (const v of completed) {
      const key = v.artistId || v.artistName || "unknown";
      const name = v.artistName || v.artistId || "미지정";
      const cur = artistCounts.get(key) ?? { name, count: 0 };
      cur.count += 1;
      artistCounts.set(key, cur);
    }
    const primary =
      [...artistCounts.values()].sort((a, b) => b.count - a.count)[0]?.name || "—";

    const lifetimeRevenue = completed.reduce((s, v) => s + v.amount, 0);
    risks.push({
      phone: p.phone,
      name: p.name,
      lastVisitDate: last.bookingDate,
      daysSince,
      visitCount: completed.length,
      lifetimeRevenue,
      primaryArtistName: primary,
      lastServiceNames: last.serviceNames,
      thresholdDays: Math.round(thresholdDays),
      highValue: false,
      avgTicket: completed.length ? lifetimeRevenue / completed.length : 0
    });
  }

  risks.sort((a, b) => b.daysSince - a.daysSince || b.lifetimeRevenue - a.lifetimeRevenue);

  if (risks.length) {
    const revenues = [...risks.map((r) => r.lifetimeRevenue)].sort((a, b) => b - a);
    const topN = Math.max(1, Math.ceil(revenues.length * HIGH_VALUE_PERCENTILE));
    const cutoff = revenues[topN - 1] ?? 0;
    for (const r of risks) {
      r.highValue = r.lifetimeRevenue >= cutoff && cutoff > 0;
    }
  }

  const expectedRecoverRevenue = Math.round(
    risks.reduce((s, r) => s + r.avgTicket, 0)
  );

  return {
    customers: risks,
    contactCount: risks.length,
    expectedRecoverRevenue
  };
}

function buildArtistRetention(profiles: CustomerProfile[]): ArtistRetentionRow[] {
  type Acc = {
    artistId: string;
    artistName: string;
    customers: Set<string>;
    returning: Set<string>;
    cycles: number[];
  };
  const map = new Map<string, Acc>();

  for (const p of profiles) {
    const byArtist = new Map<string, CustomerVisit[]>();
    for (const v of p.completedVisits) {
      const key = v.artistId || v.artistName || "unknown";
      const list = byArtist.get(key) ?? [];
      list.push(v);
      byArtist.set(key, list);
    }
    for (const [key, visits] of byArtist) {
      const artistName = visits[0]?.artistName || visits[0]?.artistId || "미지정";
      const artistId = visits[0]?.artistId || key;
      const acc = map.get(key) ?? {
        artistId,
        artistName,
        customers: new Set<string>(),
        returning: new Set<string>(),
        cycles: [] as number[]
      };
      acc.customers.add(p.phone);
      if (visits.length >= 2) {
        acc.returning.add(p.phone);
        const cycle = avgVisitCycleDays(visits);
        if (cycle != null) acc.cycles.push(cycle);
      }
      map.set(key, acc);
    }
  }

  return [...map.values()]
    .map((a) => {
      const customerCount = a.customers.size;
      const returningCount = a.returning.size;
      const sampleInsufficient = customerCount < MIN_ARTIST_SAMPLE;
      return {
        artistId: a.artistId,
        artistName: a.artistName,
        customerCount,
        returningCount,
        retentionRate: sampleInsufficient
          ? null
          : customerCount > 0
            ? (returningCount / customerCount) * 100
            : 0,
        sampleInsufficient,
        avgCycleDays: average(a.cycles)
      };
    })
    .sort((a, b) => {
      const ar = a.retentionRate ?? -1;
      const br = b.retentionRate ?? -1;
      return br - ar || b.customerCount - a.customerCount;
    });
}

function buildServiceRetention(profiles: CustomerProfile[]): ServiceRetentionRow[] {
  type Acc = { treatmentCount: number; phones: Set<string>; returned: Set<string> };
  const map = new Map<string, Acc>();

  for (const p of profiles) {
    const completed = p.completedVisits;
    for (let i = 0; i < completed.length; i += 1) {
      const visit = completed[i];
      const hasLater = i < completed.length - 1;
      for (const name of visit.serviceNames) {
        const acc = map.get(name) ?? {
          treatmentCount: 0,
          phones: new Set<string>(),
          returned: new Set<string>()
        };
        acc.treatmentCount += 1;
        acc.phones.add(p.phone);
        if (hasLater) acc.returned.add(p.phone);
        map.set(name, acc);
      }
    }
  }

  return [...map.entries()]
    .map(([serviceName, acc]) => ({
      serviceName,
      treatmentCount: acc.treatmentCount,
      returnRate: acc.phones.size > 0 ? (acc.returned.size / acc.phones.size) * 100 : 0
    }))
    .sort((a, b) => b.returnRate - a.returnRate || b.treatmentCount - a.treatmentCount);
}

function buildDepositNoshow(bookings: BookingRow[]): DepositNoshowInsight {
  let paidTotal = 0;
  let paidNoshow = 0;
  let unpaidTotal = 0;
  let unpaidNoshow = 0;

  for (const b of bookings) {
    const phone = normalizePhone(b.customer_phone);
    if (!phone) continue;
    // pending 제외 — 확정·완료·취소·노쇼 등 종료/진행 예약을 분모로
    if (b.status === "pending") continue;

    if (b.deposit_paid) {
      paidTotal += 1;
      if (b.status === "noshow") paidNoshow += 1;
    } else {
      unpaidTotal += 1;
      if (b.status === "noshow") unpaidNoshow += 1;
    }
  }

  const paidNoshowRate = paidTotal > 0 ? (paidNoshow / paidTotal) * 100 : 0;
  const unpaidNoshowRate = unpaidTotal > 0 ? (unpaidNoshow / unpaidTotal) * 100 : 0;
  const gapPp = unpaidNoshowRate - paidNoshowRate;

  return {
    paidTotal,
    paidNoshow,
    paidNoshowRate,
    unpaidTotal,
    unpaidNoshow,
    unpaidNoshowRate,
    gapPp,
    suggestExpandDeposit: gapPp >= DEPOSIT_NOSHOW_GAP_PP
  };
}

function buildHeatmap(bookings: BookingRow[]): CustomersDashboard["heatmap"] {
  const counts = new Map<string, number>();
  let maxCount = 0;

  for (const b of bookings) {
    if (b.status === "cancelled" || b.status === "noshow") continue;
    const hour = parseHour(b.booking_time);
    if (hour == null) continue;
    const weekday = weekdayIndex(b.booking_date);
    const key = `${weekday}-${hour}`;
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    if (next > maxCount) maxCount = next;
  }

  const cells: HeatCell[] = [];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (let hour = 9; hour <= 21; hour += 1) {
      cells.push({
        weekday,
        hour,
        count: counts.get(`${weekday}-${hour}`) ?? 0
      });
    }
  }

  const quietSlots = [...cells]
    .sort((a, b) => a.count - b.count || a.weekday - b.weekday || a.hour - b.hour)
    .slice(0, 3)
    .map((c) => ({
      weekday: c.weekday,
      weekdayLabel: WEEKDAY_LABELS[c.weekday],
      hour: c.hour,
      count: c.count
    }));

  return { cells, maxCount, quietSlots };
}

export function aggregateCustomersDashboard(args: {
  bookings: BookingRow[];
  services: ServiceRow[];
  today?: string;
}): CustomersDashboard {
  const today = args.today ?? todayKst();
  const { y, m } = parseYmd(today);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;

  const { profiles, excludedNoPhoneCount } = buildProfiles(args.bookings);
  const withCompleted = profiles.filter((p) => p.completedVisits.length > 0);

  const returningCustomers = withCompleted.filter((p) => p.completedVisits.length >= 2).length;
  const totalCustomers = withCompleted.length;

  let newCustomersThisMonth = 0;
  const returningCycles: number[] = [];
  for (const p of withCompleted) {
    const first = p.completedVisits[0].bookingDate;
    if (first >= monthStart && first <= today) newCustomersThisMonth += 1;
    if (p.completedVisits.length >= 2) {
      const cycle = avgVisitCycleDays(p.completedVisits);
      if (cycle != null) returningCycles.push(cycle);
    }
  }

  const churn = buildChurn({
    profiles: withCompleted,
    today,
    services: args.services
  });

  return {
    today,
    excludedNoPhoneCount,
    summary: {
      totalCustomers,
      returningCustomers,
      returningRate: totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0,
      newCustomersThisMonth,
      avgCycleDays: average(returningCycles)
    },
    churn,
    artists: buildArtistRetention(withCompleted),
    services: buildServiceRetention(withCompleted),
    depositNoshow: buildDepositNoshow(args.bookings),
    heatmap: buildHeatmap(args.bookings)
  };
}

export { WEEKDAY_LABELS, DEFAULT_SINGLE_VISIT_THRESHOLD_DAYS };
