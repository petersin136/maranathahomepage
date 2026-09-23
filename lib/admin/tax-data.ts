import { todayKst } from "@/lib/admin/sales-data";

export type TaxType = "general" | "simplified";

export type ShopSettings = {
  id?: string;
  business_name: string | null;
  business_number: string | null;
  tax_type: TaxType | null;
  vat_rate: number | null;
};

/** 2026년 종합소득세 과세표준 구간 (원) — 누진공제액 포함 */
export const INCOME_TAX_BRACKETS_2026 = [
  { upTo: 14_000_000, rate: 0.06, deduction: 0 },
  { upTo: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { upTo: 500_000_000, rate: 0.4, deduction: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { upTo: Infinity, rate: 0.45, deduction: 65_940_000 }
] as const;

export const BASIC_DEDUCTION = 1_500_000;
export const LOCAL_INCOME_TAX_RATE = 0.1;
export const SIMPLIFIED_VALUE_RATE = 0.3; // 미용업(기타 서비스) 부가가치율 30%
export const SIMPLIFIED_INPUT_CREDIT_RATE = 0.005; // 매입세액 공제 0.5%
export const SIMPLIFIED_EXEMPT_ANNUAL_REVENUE = 48_000_000;
export const CASH_RECEIPT_PENALTY_RATE = 0.2;
export const CASH_RECEIPT_THRESHOLD = 100_000;
export const UNPROVEN_EXPENSE_WARN_RATIO = 0.3;

export type VatPeriodKind = "h1" | "h2" | "annual";

export type TaxDeadline = {
  key: string;
  label: string;
  date: string;
  dDay: number;
  kind: "vat" | "income" | "withholding";
};

export type VatEstimate = {
  taxType: TaxType;
  periodKind: VatPeriodKind;
  periodLabel: string;
  from: string;
  to: string;
  revenue: number;
  proofExpense: number;
  outputVat: number;
  inputVat: number;
  payable: number;
  /** 간이만: 연 매출 4,800만 미만 추정 면제 */
  simplifiedExempt: boolean;
  /** 간이만: 면제 안내 문구 (연말 전 누적 기준 명시) */
  simplifiedExemptNote: string | null;
  nextDeadlines: TaxDeadline[];
};

export type IncomeTaxEstimate = {
  from: string;
  to: string;
  revenue: number;
  expenseTotal: number;
  expenseUnproven: number;
  income: number;
  taxableBase: number;
  incomeTax: number;
  localIncomeTax: number;
  totalTax: number;
  bracketRate: number | null;
  filingDeadline: TaxDeadline;
};

export type MonthlyTaxRow = {
  year: number;
  month: number;
  label: string;
  revenue: number;
  expense: number;
  income: number;
  cumulativeIncome: number;
};

export type TaxWarnings = {
  cashReceiptCount: number;
  cashReceiptAmount: number;
  cashReceiptPenalty: number;
  unprovenExpenseRatio: number;
  unprovenExpenseHigh: boolean;
};

export type TaxDashboard = {
  today: string;
  settingsConfigured: boolean;
  settings: ShopSettings | null;
  vat: VatEstimate | null;
  income: IncomeTaxEstimate | null;
  monthly: MonthlyTaxRow[];
  recommendedMonthlyReserve: number;
  schedule: TaxDeadline[];
  warnings: TaxWarnings;
};

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function formatYmd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function monthEnd(y: number, m: number) {
  return formatYmd(y, m, daysInMonth(y, m));
}

/** 포함 일수 기준 D-day (오늘=0, 과거는 음수) */
export function dDay(fromYmd: string, toYmd: string) {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  const start = Date.UTC(a.y, a.m - 1, a.d);
  const end = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((end - start) / 86_400_000);
}

export function resolveVatPeriod(
  taxType: TaxType,
  today = todayKst()
): {
  kind: VatPeriodKind;
  label: string;
  year: number;
  from: string;
  to: string;
  filingDeadline: string;
} {
  const { y, m } = parseYmd(today);

  if (taxType === "simplified") {
    return {
      kind: "annual",
      label: `${y}년`,
      year: y,
      from: formatYmd(y, 1, 1),
      to: formatYmd(y, 12, 31),
      filingDeadline: formatYmd(y + 1, 1, 25)
    };
  }

  if (m <= 6) {
    return {
      kind: "h1",
      label: `${y}년 1기 (1~6월)`,
      year: y,
      from: formatYmd(y, 1, 1),
      to: formatYmd(y, 6, 30),
      filingDeadline: formatYmd(y, 7, 25)
    };
  }
  return {
    kind: "h2",
    label: `${y}년 2기 (7~12월)`,
    year: y,
    from: formatYmd(y, 7, 1),
    to: formatYmd(y, 12, 31),
    filingDeadline: formatYmd(y + 1, 1, 25)
  };
}

/**
 * 부가세 신고 일정
 * - 일반: 1/25, 4/25, 7/25, 10/25
 * - 간이: 1/25 연 1회. 직전연도 매출 4,800만 이상이면 7/25 예정부과 포함
 */
export function vatDeadlinesFor(
  taxType: TaxType,
  today: string,
  previousYearRevenue = 0
): TaxDeadline[] {
  const { y, m, d } = parseYmd(today);
  const items: Omit<TaxDeadline, "dDay">[] = [];

  if (taxType === "general") {
    // 올해·내년 사이클의 주요 기한
    const pushYear = (year: number) => {
      items.push(
        { key: `vat-${year}-01-25`, label: "부가세 2기 확정신고", date: formatYmd(year, 1, 25), kind: "vat" },
        { key: `vat-${year}-04-25`, label: "부가세 1기 예정신고", date: formatYmd(year, 4, 25), kind: "vat" },
        { key: `vat-${year}-07-25`, label: "부가세 1기 확정신고", date: formatYmd(year, 7, 25), kind: "vat" },
        { key: `vat-${year}-10-25`, label: "부가세 2기 예정신고", date: formatYmd(year, 10, 25), kind: "vat" }
      );
    };
    pushYear(y);
    pushYear(y + 1);
  } else {
    const nextJan = m > 1 || d > 25 ? y + 1 : y;
    items.push({
      key: `vat-simplified-${nextJan}-01-25`,
      label: "부가세 확정신고(간이)",
      date: formatYmd(nextJan, 1, 25),
      kind: "vat"
    });
    // 직전연도 매출 4,800만 이상 → 예정부과(7/25)
    if (previousYearRevenue >= SIMPLIFIED_EXEMPT_ANNUAL_REVENUE) {
      const julYear = m > 7 || (m === 7 && d > 25) ? y + 1 : y;
      items.push({
        key: `vat-simplified-provisional-${julYear}-07-25`,
        label: "부가세 예정부과(간이)",
        date: formatYmd(julYear, 7, 25),
        kind: "vat"
      });
    }
  }

  const seen = new Set<string>();
  return items
    .map((i) => ({ ...i, dDay: dDay(today, i.date) }))
    .filter((i) => i.dDay >= 0)
    .filter((i) => {
      const key = `${i.date}|${i.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.dDay - b.dDay || a.date.localeCompare(b.date));
}

function simplifiedExemptNote(args: {
  today: string;
  yearRevenue: number;
  exempt: boolean;
}): string {
  const { y, m, d } = parseYmd(args.today);
  const yearEnded = m === 12 && d >= 31;
  const cumulative = args.yearRevenue.toLocaleString("ko-KR");
  if (yearEnded) {
    return args.exempt
      ? `연 매출 ${cumulative}원 · 4,800만원 미만으로 납부의무 면제(추정)`
      : `연 매출 ${cumulative}원 · 4,800만원 이상으로 납부의무 있음(추정)`;
  }
  if (args.exempt) {
    return `현재 누적 ${cumulative}원 · 연말까지 4,800만원 미만이면 납부의무 면제`;
  }
  return `현재 누적 ${cumulative}원 · 이미 4,800만원 이상으로 납부의무 있음(추정)`;
}

function incomeFilingDeadline(today: string): TaxDeadline {
  const { y, m } = parseYmd(today);
  const date = m > 5 ? formatYmd(y + 1, 5, 31) : formatYmd(y, 5, 31);
  return {
    key: "income-annual",
    label: "종합소득세 확정신고",
    date,
    dDay: dDay(today, date),
    kind: "income"
  };
}

function nextWithholdingDeadlines(today: string, include: boolean): TaxDeadline[] {
  if (!include) return [];
  const { y, m, d } = parseYmd(today);
  const out: TaxDeadline[] = [];
  for (let i = 0; i < 3; i += 1) {
    const dt = new Date(Date.UTC(y, m - 1 + i, 10));
    const date = formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 10);
    // skip if this month's 10th already passed
    if (i === 0 && d > 10) continue;
    out.push({
      key: `withholding-${date}`,
      label: "원천세 신고·납부",
      date,
      dDay: dDay(today, date),
      kind: "withholding"
    });
  }
  return out.filter((x) => x.dDay >= 0).slice(0, 2);
}

/** 부가세 포함 금액 → 세액 (원 미만 버림, 과대 추정 위해 매출세액은 ceil 가능하나 스펙은 *10/110) */
export function extractVatIncluded(amount: number) {
  return Math.floor((amount * 10) / 110);
}

export function calcIncomeTax(taxableBase: number) {
  if (taxableBase <= 0) {
    return { incomeTax: 0, bracketRate: null as number | null };
  }
  for (const b of INCOME_TAX_BRACKETS_2026) {
    if (taxableBase <= b.upTo) {
      return {
        incomeTax: Math.max(0, Math.floor(taxableBase * b.rate - b.deduction)),
        bracketRate: b.rate
      };
    }
  }
  const last = INCOME_TAX_BRACKETS_2026[INCOME_TAX_BRACKETS_2026.length - 1];
  return {
    incomeTax: Math.max(0, Math.floor(taxableBase * last.rate - last.deduction)),
    bracketRate: last.rate
  };
}

export function isShopSettingsConfigured(settings: ShopSettings | null | undefined) {
  if (!settings) return false;
  const name = (settings.business_name || "").trim();
  const number = (settings.business_number || "").trim();
  const type = settings.tax_type;
  return Boolean(name && number && (type === "general" || type === "simplified"));
}

type MonthAmount = { year: number; month: number; amount: number };

export function aggregateTaxDashboard(args: {
  settings: ShopSettings | null;
  today?: string;
  /** paid_at 기준 완료 매출 (월별) */
  monthlyRevenue: MonthAmount[];
  /** expense_date 기준 지출 (월별) */
  monthlyExpense: MonthAmount[];
  monthlyProofExpense: MonthAmount[];
  monthlyUnprovenExpense: MonthAmount[];
  yearRevenue: number;
  /** 직전 연도 매출 (간이 예정부과 판정용) */
  previousYearRevenue: number;
  vatPeriodRevenue: number;
  vatPeriodProofExpense: number;
  ytdRevenue: number;
  ytdExpense: number;
  ytdUnprovenExpense: number;
  cashReceiptCount: number;
  cashReceiptAmount: number;
  hasFreelancePayouts: boolean;
}): TaxDashboard {
  const today = args.today ?? todayKst();
  const { y: year, m: currentMonth } = parseYmd(today);
  const configured = isShopSettingsConfigured(args.settings);
  const taxType = args.settings?.tax_type ?? null;

  let vat: VatEstimate | null = null;
  let income: IncomeTaxEstimate | null = null;

  if (configured && taxType) {
    const vatPeriod = resolveVatPeriod(taxType, today);
    const deadlines = vatDeadlinesFor(taxType, today, args.previousYearRevenue);

    if (taxType === "general") {
      const outputVat = extractVatIncluded(args.vatPeriodRevenue);
      const inputVat = extractVatIncluded(args.vatPeriodProofExpense);
      vat = {
        taxType,
        periodKind: vatPeriod.kind,
        periodLabel: vatPeriod.label,
        from: vatPeriod.from,
        to: vatPeriod.to,
        revenue: args.vatPeriodRevenue,
        proofExpense: args.vatPeriodProofExpense,
        outputVat,
        inputVat,
        payable: outputVat - inputVat,
        simplifiedExempt: false,
        simplifiedExemptNote: null,
        nextDeadlines: deadlines
      };
    } else {
      const outputVat = Math.floor(args.vatPeriodRevenue * SIMPLIFIED_VALUE_RATE * 0.1);
      const inputVat = Math.floor(args.vatPeriodProofExpense * SIMPLIFIED_INPUT_CREDIT_RATE);
      const exempt = args.yearRevenue < SIMPLIFIED_EXEMPT_ANNUAL_REVENUE;
      vat = {
        taxType,
        periodKind: vatPeriod.kind,
        periodLabel: vatPeriod.label,
        from: vatPeriod.from,
        to: vatPeriod.to,
        revenue: args.vatPeriodRevenue,
        proofExpense: args.vatPeriodProofExpense,
        outputVat,
        inputVat,
        payable: exempt ? 0 : outputVat - inputVat,
        simplifiedExempt: exempt,
        simplifiedExemptNote: simplifiedExemptNote({
          today,
          yearRevenue: args.yearRevenue,
          exempt
        }),
        nextDeadlines: deadlines
      };
    }

    const incomeAmount = args.ytdRevenue - args.ytdExpense;
    const taxableBase = Math.max(0, incomeAmount - BASIC_DEDUCTION);
    const { incomeTax, bracketRate } = calcIncomeTax(taxableBase);
    const localIncomeTax = Math.floor(incomeTax * LOCAL_INCOME_TAX_RATE);
    income = {
      from: formatYmd(year, 1, 1),
      to: today,
      revenue: args.ytdRevenue,
      expenseTotal: args.ytdExpense,
      expenseUnproven: args.ytdUnprovenExpense,
      income: incomeAmount,
      taxableBase,
      incomeTax,
      localIncomeTax,
      totalTax: incomeTax + localIncomeTax,
      bracketRate,
      filingDeadline: incomeFilingDeadline(today)
    };
  }

  const monthly: MonthlyTaxRow[] = [];
  let cumulative = 0;
  for (let m = 1; m <= 12; m += 1) {
    if (m > currentMonth) break;
    const revenue =
      args.monthlyRevenue.find((r) => r.year === year && r.month === m)?.amount ?? 0;
    const expense =
      args.monthlyExpense.find((r) => r.year === year && r.month === m)?.amount ?? 0;
    const monthIncome = revenue - expense;
    cumulative += monthIncome;
    monthly.push({
      year,
      month: m,
      label: `${m}월`,
      revenue,
      expense,
      income: monthIncome,
      cumulativeIncome: cumulative
    });
  }

  const monthsElapsed = Math.max(1, currentMonth);
  const projectedAnnualIncomeTax = income
    ? Math.ceil((income.totalTax * 12) / monthsElapsed)
    : 0;
  const vatReserve = vat ? Math.max(0, vat.payable) : 0;
  const recommendedMonthlyReserve = Math.ceil(
    (projectedAnnualIncomeTax + vatReserve) / Math.max(1, 12 - currentMonth + 1)
  );

  const schedule = [
    ...(vat ? vat.nextDeadlines : []),
    ...(income ? [income.filingDeadline] : []),
    ...nextWithholdingDeadlines(today, args.hasFreelancePayouts)
  ]
    .filter((d) => d.dDay >= 0)
    .sort((a, b) => a.dDay - b.dDay || a.date.localeCompare(b.date));

  const unprovenRatio =
    args.ytdExpense > 0 ? args.ytdUnprovenExpense / args.ytdExpense : 0;

  return {
    today,
    settingsConfigured: configured,
    settings: args.settings,
    vat,
    income,
    monthly,
    recommendedMonthlyReserve: configured ? recommendedMonthlyReserve : 0,
    schedule,
    warnings: {
      cashReceiptCount: args.cashReceiptCount,
      cashReceiptAmount: args.cashReceiptAmount,
      cashReceiptPenalty: Math.floor(args.cashReceiptAmount * CASH_RECEIPT_PENALTY_RATE),
      unprovenExpenseRatio: unprovenRatio,
      unprovenExpenseHigh: unprovenRatio > UNPROVEN_EXPENSE_WARN_RATIO
    }
  };
}

export function paidAtToKstYearMonth(iso: string) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(iso));
  const { y, m } = parseYmd(ymd);
  return { year: y, month: m, ymd };
}

export { formatYmd, monthEnd, parseYmd };
