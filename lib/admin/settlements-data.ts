import type { PaymentMethod } from "@/lib/bookings/types";
import { designerPaySplit } from "@/lib/admin/retail-products";
import {
  isYmd,
  kstDayEndExclusiveIso,
  kstDayStartIso,
  todayKst
} from "@/lib/admin/sales-data";

export type SettlementEmploymentType = string;

export type SettlementBookingRow = {
  id: string;
  bookingDate: string;
  paidAt: string;
  customerName: string;
  serviceNames: string[];
  paymentMethod: PaymentMethod | null;
  paymentMethodLabel: string;
  amount: number;
};

export type SettlementRowStatus = "집계 중" | "정산대기" | "지급 완료";

export type SettlementArtistRow = {
  artistId: string;
  artistName: string;
  employmentType: string | null;
  employmentLabel: string;
  isFreelance: boolean;
  revenue: number;
  serviceRevenue: number;
  productRevenue: number;
  count: number;
  commissionRate: number;
  hasCommission: boolean;
  serviceIncentive: number | null;
  productIncentive: number | null;
  incentive: number | null;
  incomeTax: number | null;
  localIncomeTax: number | null;
  withholding: number | null;
  netPay: number | null;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  bankDisplay: string | null;
  bookings: SettlementBookingRow[];
  status: SettlementRowStatus;
  paidAt: string | null;
};

export type SettlementSummary = {
  totalRevenue: number;
  totalIncentive: number;
  totalWithholding: number;
  totalNetPay: number;
  completedCount: number;
  avgCommissionRate: number | null;
};

export type SettlementDashboard = {
  year: number;
  month: number;
  from: string;
  to: string;
  closed: boolean;
  closedAt: string | null;
  prevMonthPayout: number;
  summary: SettlementSummary;
  artists: SettlementArtistRow[];
};

export type SettlementSnapshot = {
  year: number;
  month: number;
  from: string;
  to: string;
  summary: Pick<SettlementSummary, "totalRevenue" | "totalIncentive" | "totalWithholding" | "totalNetPay">;
  artists: SettlementArtistRow[];
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체"
};

type ArtistRow = {
  id: string;
  name_kr: string | null;
  employment_type: string | null;
  commission_rate: number | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  sort_order?: number | null;
};

type BookingRow = {
  id: string;
  artist_id: string | null;
  booking_date: string;
  paid_at: string;
  customer_name: string;
  service_names: string[] | null;
  payment_method: PaymentMethod | null;
  final_amount: number;
};

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function formatYmd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthEnd(y: number, m: number) {
  return formatYmd(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
}

/** 원 단위 절사(버림) */
export function floorWon(value: number) {
  return Math.floor(value);
}

/** 10원 미만 절사 */
export function floorToTenWon(value: number) {
  return Math.floor(value / 10) * 10;
}

export function employmentLabel(type: string | null | undefined) {
  if (type === "freelance") return "프리랜서";
  if (type === "employee") return "직원";
  return type?.trim() || "—";
}

export function formatBankDisplay(
  bankName: string | null | undefined,
  bankAccount: string | null | undefined,
  bankHolder: string | null | undefined
) {
  const name = (bankName || "").trim();
  const account = (bankAccount || "").trim();
  const holder = (bankHolder || "").trim();
  if (!name && !account) return null;
  const base = [name, account].filter(Boolean).join(" ");
  return holder ? `${base} (${holder})` : base;
}

export function resolveSettlementMonth(
  yearRaw: string | null,
  monthRaw: string | null
): { year: number; month: number; from: string; to: string } | { error: string } {
  const today = todayKst();
  const { y: ty, m: tm } = parseYmd(today);
  let year = ty;
  let month = tm - 1;
  if (month < 1) {
    year -= 1;
    month = 12;
  }

  if (yearRaw != null || monthRaw != null) {
    const y = Number(yearRaw);
    const m = Number(monthRaw);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      return { error: "년/월이 올바르지 않습니다." };
    }
    year = y;
    month = m;
  }

  const from = formatYmd(year, month, 1);
  const to = monthEnd(year, month);
  if (!isYmd(from) || !isYmd(to)) {
    return { error: "정산 기간이 올바르지 않습니다." };
  }
  return { year, month, from, to };
}

export function settlementPaidAtRange(from: string, to: string) {
  return {
    gte: kstDayStartIso(from),
    lt: kstDayEndExclusiveIso(to)
  };
}

export function yearMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftYearMonth(year: number, month: number, delta: number) {
  const dt = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1 };
}

export function isPastKstMonth(year: number, month: number, today = todayKst()) {
  const [ty, tm] = today.split("-").map(Number);
  return year < ty || (year === ty && month < tm);
}

export function remainderPercents(amounts: number[]): number[] {
  const total = amounts.reduce((sum, value) => sum + value, 0);
  if (total === 0) return amounts.map(() => 0);
  const shares = amounts.map((value) => (value / total) * 100);
  const floors = shares.map((share) => Math.floor(share));
  let rest = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = shares
    .map((share, index) => ({
      index,
      frac: share - Math.floor(share),
      amount: amounts[index]
    }))
    .sort((a, b) => b.frac - a.frac || b.amount - a.amount);
  const percents = floors.slice();
  for (const item of order) {
    if (rest <= 0) break;
    percents[item.index] += 1;
    rest -= 1;
  }
  return percents;
}

export function bankAccountDisplay(
  bankName: string | null | undefined,
  bankAccount: string | null | undefined
) {
  const name = (bankName || "").trim();
  const account = (bankAccount || "").trim();
  if (!name && !account) return null;
  return [name, account].filter(Boolean).join(" ");
}

function coreSummary(artists: SettlementArtistRow[]): Pick<
  SettlementSummary,
  "totalRevenue" | "totalIncentive" | "totalWithholding" | "totalNetPay"
> {
  return {
    totalRevenue: artists.reduce((sum, row) => sum + row.revenue, 0),
    totalIncentive: artists.reduce((sum, row) => sum + (row.incentive ?? 0), 0),
    totalWithholding: artists.reduce((sum, row) => sum + (row.withholding ?? 0), 0),
    totalNetPay: artists.reduce((sum, row) => sum + (row.netPay ?? 0), 0)
  };
}

export function expandSettlementSummary(
  artists: SettlementArtistRow[],
  core?: Pick<SettlementSummary, "totalRevenue" | "totalIncentive" | "totalWithholding" | "totalNetPay">
): SettlementSummary {
  const base = core ?? coreSummary(artists);
  return {
    ...base,
    completedCount: artists.reduce((sum, row) => sum + row.count, 0),
    avgCommissionRate: base.totalRevenue > 0 ? (base.totalIncentive / base.totalRevenue) * 100 : null
  };
}

export function toSettlementSnapshot(data: SettlementDashboard): SettlementSnapshot {
  return {
    year: data.year,
    month: data.month,
    from: data.from,
    to: data.to,
    summary: {
      totalRevenue: data.summary.totalRevenue,
      totalIncentive: data.summary.totalIncentive,
      totalWithholding: data.summary.totalWithholding,
      totalNetPay: data.summary.totalNetPay
    },
    artists: data.artists.map((row) => ({
      ...row,
      status: "집계 중" as SettlementRowStatus,
      paidAt: null
    }))
  };
}

export function isSettlementSnapshot(value: unknown): value is SettlementSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as SettlementSnapshot;
  return Array.isArray(row.artists) && row.summary != null && typeof row.summary === "object";
}

export function hydrateSettlementArtist(row: SettlementArtistRow): SettlementArtistRow {
  const serviceRevenue = row.serviceRevenue ?? Math.max(0, row.revenue - (row.productRevenue ?? 0));
  const productRevenue = row.productRevenue ?? Math.max(0, row.revenue - serviceRevenue);
  const serviceIncentive =
    row.serviceIncentive ?? (row.hasCommission ? row.incentive : null);
  const productIncentive = row.productIncentive ?? (row.hasCommission ? 0 : null);
  return {
    ...row,
    serviceRevenue,
    productRevenue,
    serviceIncentive,
    productIncentive
  };
}

export function attachSettlementStatus(
  artists: SettlementArtistRow[],
  closed: boolean,
  payouts: Map<string, string>
): SettlementArtistRow[] {
  return artists.map((row) => {
    const hydrated = hydrateSettlementArtist(row);
    return {
      ...hydrated,
      status: !closed ? "집계 중" : payouts.has(row.artistId) ? "지급 완료" : "정산대기",
      paidAt: closed ? payouts.get(row.artistId) ?? null : null
    };
  });
}

export function scopeSettlementsForDesigner(
  data: SettlementDashboard,
  artistId: string
): SettlementDashboard {
  const artists = data.artists.filter((row) => row.artistId === artistId);
  return {
    ...data,
    artists,
    summary: expandSettlementSummary(artists)
  };
}

function calcWithholding(incentive: number, isFreelance: boolean) {
  if (!isFreelance) {
    return { incomeTax: 0, localIncomeTax: 0, withholding: 0 };
  }
  const incomeTax = floorToTenWon(incentive * 0.03);
  const localIncomeTax = floorToTenWon(incomeTax * 0.1);
  return {
    incomeTax,
    localIncomeTax,
    withholding: incomeTax + localIncomeTax
  };
}

export function aggregateSettlements(args: {
  year: number;
  month: number;
  from: string;
  to: string;
  artists: ArtistRow[];
  bookings: BookingRow[];
  includeIdleArtists?: boolean;
}): SettlementDashboard {
  const artistById = new Map(args.artists.map((a) => [a.id, a]));
  const grouped = new Map<
    string,
    { artist: ArtistRow; revenue: number; count: number; bookings: SettlementBookingRow[] }
  >();

  if (args.includeIdleArtists) {
    for (const artist of args.artists) {
      if (!artist.id || grouped.has(artist.id)) continue;
      grouped.set(artist.id, { artist, revenue: 0, count: 0, bookings: [] });
    }
  }

  for (const booking of args.bookings) {
    if (!booking.artist_id) continue;
    const artist = artistById.get(booking.artist_id);
    if (!artist) continue;
    if (booking.final_amount == null || Number.isNaN(Number(booking.final_amount))) continue;

    const amount = Number(booking.final_amount);
    const method = booking.payment_method;
    const detail: SettlementBookingRow = {
      id: booking.id,
      bookingDate: booking.booking_date,
      paidAt: booking.paid_at,
      customerName: booking.customer_name,
      serviceNames: Array.isArray(booking.service_names)
        ? booking.service_names.map((n) => String(n || "").trim()).filter(Boolean)
        : [],
      paymentMethod: method,
      paymentMethodLabel: method ? METHOD_LABEL[method] : "—",
      amount
    };

    const cur = grouped.get(artist.id) ?? {
      artist,
      revenue: 0,
      count: 0,
      bookings: [] as SettlementBookingRow[]
    };
    cur.revenue += amount;
    cur.count += 1;
    cur.bookings.push(detail);
    grouped.set(artist.id, cur);
  }

  const artists: SettlementArtistRow[] = [...grouped.values()]
    .map(({ artist, revenue, count, bookings }) => {
      const rateRaw = Number(artist.commission_rate);
      const commissionRate = Number.isFinite(rateRaw) ? rateRaw : 0;
      const hasCommission = commissionRate > 0;
      const isFreelance = artist.employment_type === "freelance";
      let serviceRevenue = 0;
      let productRevenue = 0;
      let serviceIncentive = 0;
      let productIncentive = 0;
      for (const booking of bookings) {
        const split = designerPaySplit({
          totalAmount: booking.amount,
          serviceNames: booking.serviceNames,
          commissionRate,
          hasCommission
        });
        serviceRevenue += split.serviceAmount;
        productRevenue += split.productRetail;
        serviceIncentive += split.serviceIncentive;
        productIncentive += split.productIncentive;
      }
      const incentive = hasCommission ? serviceIncentive + productIncentive : null;
      const tax =
        incentive == null
          ? { incomeTax: null, localIncomeTax: null, withholding: null }
          : (() => {
              const w = calcWithholding(incentive, isFreelance);
              return {
                incomeTax: w.incomeTax,
                localIncomeTax: w.localIncomeTax,
                withholding: w.withholding
              };
            })();
      const netPay =
        incentive == null || tax.withholding == null ? null : incentive - tax.withholding;

      bookings.sort((a, b) => {
        if (a.bookingDate !== b.bookingDate) return a.bookingDate.localeCompare(b.bookingDate);
        return a.paidAt.localeCompare(b.paidAt);
      });

      return {
        artistId: artist.id,
        artistName: (artist.name_kr || "").trim() || artist.id,
        employmentType: artist.employment_type,
        employmentLabel: employmentLabel(artist.employment_type),
        isFreelance,
        revenue,
        serviceRevenue,
        productRevenue,
        count,
        commissionRate,
        hasCommission,
        serviceIncentive: hasCommission ? serviceIncentive : null,
        productIncentive: hasCommission ? productIncentive : null,
        incentive,
        incomeTax: tax.incomeTax,
        localIncomeTax: tax.localIncomeTax,
        withholding: tax.withholding,
        netPay,
        bankName: artist.bank_name,
        bankAccount: artist.bank_account,
        bankHolder: artist.bank_holder,
        bankDisplay: formatBankDisplay(
          artist.bank_name,
          artist.bank_account,
          artist.bank_holder
        ),
        bookings,
        status: "집계 중" as SettlementRowStatus,
        paidAt: null
      };
    })
    .sort((a, b) => {
      const byRevenue = b.revenue - a.revenue;
      if (byRevenue !== 0) return byRevenue;
      const ao = artistById.get(a.artistId)?.sort_order;
      const bo = artistById.get(b.artistId)?.sort_order;
      if (ao != null && bo != null && ao !== bo) return ao - bo;
      return a.artistName.localeCompare(b.artistName, "ko");
    });

  const summary = expandSettlementSummary(artists);

  return {
    year: args.year,
    month: args.month,
    from: args.from,
    to: args.to,
    closed: false,
    closedAt: null,
    prevMonthPayout: 0,
    summary,
    artists
  };
}
