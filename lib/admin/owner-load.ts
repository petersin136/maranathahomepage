import { fetchMonthExpenses } from "@/lib/admin/expenses-load";
import { buildOwnerPnl, type OwnerPeriodKind, type OwnerPnlDashboard } from "@/lib/admin/owner-pnl";
import { addDays, isYmd, todayKst, weekStartMonday } from "@/lib/admin/sales-data";
import {
  resolveSettlementMonth,
  shiftYearMonth
} from "@/lib/admin/settlements-data";
import {
  loadSettlementsRange,
  loadSettlementsView,
  SettlementsQueryError
} from "@/lib/admin/settlements-load";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class OwnerPnlQueryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type OwnerPeriodQuery = {
  period: OwnerPeriodKind;
  year: number;
  month: number;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
};

function yearMonthOf(ymd: string) {
  return { year: Number(ymd.slice(0, 4)), month: Number(ymd.slice(5, 7)) };
}

export function resolveOwnerPeriod(args: {
  periodRaw?: string | null;
  yearRaw?: string | null;
  monthRaw?: string | null;
  dateRaw?: string | null;
}): OwnerPeriodQuery {
  const period: OwnerPeriodKind =
    args.periodRaw === "week" || args.periodRaw === "day" ? args.periodRaw : "month";

  if (period === "month") {
    const month = resolveSettlementMonth(args.yearRaw ?? null, args.monthRaw ?? null);
    if ("error" in month) throw new OwnerPnlQueryError(month.error, 400);
    const prev = shiftYearMonth(month.year, month.month, -1);
    const prevDays = new Date(Date.UTC(prev.year, prev.month, 0)).getUTCDate();
    return {
      period,
      year: month.year,
      month: month.month,
      from: month.from,
      to: month.to,
      prevFrom: `${prev.year}-${String(prev.month).padStart(2, "0")}-01`,
      prevTo: `${prev.year}-${String(prev.month).padStart(2, "0")}-${String(prevDays).padStart(2, "0")}`
    };
  }

  const date = args.dateRaw && isYmd(args.dateRaw) ? args.dateRaw : todayKst();
  if (period === "day") {
    const prev = addDays(date, -1);
    const { year, month } = yearMonthOf(date);
    return { period, year, month, from: date, to: date, prevFrom: prev, prevTo: prev };
  }

  const from = weekStartMonday(date);
  const to = addDays(from, 6);
  const { year, month } = yearMonthOf(from);
  return {
    period,
    year,
    month,
    from,
    to,
    prevFrom: addDays(from, -7),
    prevTo: addDays(from, -1)
  };
}

async function loadRangePnl(query: OwnerPeriodQuery): Promise<OwnerPnlDashboard> {
  const [settlements, expenses] = await Promise.all([
    query.period === "month"
      ? loadSettlementsView({
          yearRaw: String(query.year),
          monthRaw: String(query.month),
          role: "owner",
          artistId: null
        })
      : loadSettlementsRange(query.from, query.to),
    fetchMonthExpenses(getSupabaseAdmin(), query.from, query.to)
  ]);

  return buildOwnerPnl({
    period: query.period,
    year: query.year,
    month: query.month,
    from: query.from,
    to: query.to,
    settlements,
    expenses,
    prevRemain: 0
  });
}

export async function loadOwnerPnlView(args?: {
  periodRaw?: string | null;
  yearRaw?: string | null;
  monthRaw?: string | null;
  dateRaw?: string | null;
}): Promise<OwnerPnlDashboard> {
  const query = resolveOwnerPeriod(args ?? {});
  const current = await loadRangePnl(query);
  const prevQuery: OwnerPeriodQuery = {
    ...query,
    year: Number(query.prevFrom.slice(0, 4)),
    month: Number(query.prevFrom.slice(5, 7)),
    from: query.prevFrom,
    to: query.prevTo,
    prevFrom: query.prevFrom,
    prevTo: query.prevTo
  };
  try {
    const previous = await loadRangePnl(prevQuery);
    return {
      ...current,
      summary: { ...current.summary, prevOwnerRemain: previous.summary.ownerRemain }
    };
  } catch (e) {
    if (e instanceof SettlementsQueryError || e instanceof OwnerPnlQueryError) {
      return current;
    }
    throw e;
  }
}
