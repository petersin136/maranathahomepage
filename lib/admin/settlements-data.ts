import type { PaymentMethod } from "@/lib/bookings/types";
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

export type SettlementArtistRow = {
  artistId: string;
  artistName: string;
  employmentType: string | null;
  employmentLabel: string;
  isFreelance: boolean;
  revenue: number;
  count: number;
  commissionRate: number;
  hasCommission: boolean;
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
};

export type SettlementSummary = {
  totalRevenue: number;
  totalIncentive: number;
  totalWithholding: number;
  totalNetPay: number;
};

export type SettlementDashboard = {
  year: number;
  month: number;
  from: string;
  to: string;
  summary: SettlementSummary;
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
}): SettlementDashboard {
  const artistById = new Map(args.artists.map((a) => [a.id, a]));
  const grouped = new Map<
    string,
    { artist: ArtistRow; revenue: number; count: number; bookings: SettlementBookingRow[] }
  >();

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
      const incentive = hasCommission ? floorWon((revenue * commissionRate) / 100) : null;
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
        count,
        commissionRate,
        hasCommission,
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
        bookings
      };
    })
    .sort((a, b) => b.revenue - a.revenue || a.artistName.localeCompare(b.artistName, "ko"));

  const summary: SettlementSummary = {
    totalRevenue: artists.reduce((sum, a) => sum + a.revenue, 0),
    totalIncentive: artists.reduce((sum, a) => sum + (a.incentive ?? 0), 0),
    totalWithholding: artists.reduce((sum, a) => sum + (a.withholding ?? 0), 0),
    totalNetPay: artists.reduce((sum, a) => sum + (a.netPay ?? 0), 0)
  };

  return {
    year: args.year,
    month: args.month,
    from: args.from,
    to: args.to,
    summary,
    artists
  };
}
