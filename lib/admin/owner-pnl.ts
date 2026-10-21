import {
  expenseCategoryLabel,
  expenseNatureKey,
  EXPENSE_NATURES,
  type ExpenseCategory
} from "@/lib/admin/expense-categories";
import { periodsPerYear as periodsInYear } from "@/lib/admin/briefing-period";
import type { ExpenseRow } from "@/lib/admin/expenses-data";
import {
  designerPaySplit,
  productEconomicsFromNames,
  retailLinesFromNames,
  PRODUCT_DESIGNER_RATE
} from "@/lib/admin/retail-products";
import {
  floorToTenWon,
  hydrateSettlementArtist,
  type SettlementArtistRow,
  type SettlementDashboard
} from "@/lib/admin/settlements-data";
import {
  BASIC_DEDUCTION,
  INCOME_TAX_BRACKETS_2026,
  LOCAL_INCOME_TAX_RATE,
  calcIncomeTax,
  extractVatIncluded
} from "@/lib/admin/tax-data";

export type OwnerProductRow = {
  id: string;
  name: string;
  qty: number;
  unitRetail: number;
  unitCost: number;
  retail: number;
  cost: number;
  margin: number;
  marginRate: number;
  designerIncentive: number;
  shopKeep: number;
};

export type OwnerArtistRow = {
  artistId: string;
  artistName: string;
  hasCommission: boolean;
  serviceRevenue: number;
  productRevenue: number;
  serviceIncentive: number;
  productIncentive: number;
  incentive: number;
  withholding: number;
  netPay: number | null;
};

export type OwnerNatureRow = {
  key: string;
  label: string;
  amount: number;
  share: number;
};

export type OwnerMaterialRow = {
  id: string;
  date: string;
  vendor: string;
  memo: string;
  amount: number;
};

export type OwnerPnlSummary = {
  revenue: number;
  serviceRevenue: number;
  productRevenue: number;
  productCost: number;
  productMargin: number;
  productDesignerIncentive: number;
  productShopKeep: number;
  expenseTotal: number;
  materialAmount: number;
  occupancyAmount: number;
  fixedAmount: number;
  operatingAmount: number;
  ownerServiceRevenue: number;
  designerServiceRevenue: number;
  ownerProductRevenue: number;
  designerProductRevenue: number;
  designerServiceIncentive: number;
  designerProductIncentive: number;
  shopKeepDesignerService: number;
  designerIncentive: number;
  designerNetPay: number;
  withholding: number;
  vatOutput: number;
  vatInput: number;
  vatPayable: number;
  incomeTaxPeriods: number;
  annualizedProfit: number;
  taxableBase: number;
  incomeTaxAnnual: number;
  localIncomeTaxAnnual: number;
  incomeTaxBracketRate: number | null;
  incomeTaxProgressiveDeduction: number;
  incomeTaxBracketLabel: string;
  incomeTaxReserve: number;
  taxSetAside: number;
  operatingProfit: number;
  ownerRemain: number;
  prevOwnerRemain: number;
  productDesignerRate: number;
};

export type OwnerPeriodKind = import("@/lib/admin/briefing-period").BriefingKind;

export type OwnerPnlDashboard = {
  period: OwnerPeriodKind;
  year: number;
  month: number;
  from: string;
  to: string;
  summary: OwnerPnlSummary;
  products: OwnerProductRow[];
  artists: OwnerArtistRow[];
  natures: OwnerNatureRow[];
  materials: OwnerMaterialRow[];
  expenses: { category: ExpenseCategory | string; label: string; amount: number; count: number }[];
};

function natureAmount(expenses: ExpenseRow[], key: (typeof EXPENSE_NATURES)[number]["key"]) {
  return expenses
    .filter((row) => expenseNatureKey(String(row.category)) === key)
    .reduce((sum, row) => sum + row.amount, 0);
}

export function buildProductRows(artists: SettlementArtistRow[]): OwnerProductRow[] {
  const grouped = new Map<
    string,
    { id: string; name: string; qty: number; unitRetail: number; unitCost: number }
  >();
  for (const artist of artists) {
    for (const booking of artist.bookings) {
      for (const line of retailLinesFromNames(booking.serviceNames)) {
        const cur = grouped.get(line.id) ?? {
          id: line.id,
          name: line.name,
          qty: 0,
          unitRetail: line.price,
          unitCost: line.cost
        };
        cur.qty += 1;
        grouped.set(line.id, cur);
      }
    }
  }
  return [...grouped.values()]
    .map((row) => {
      const retail = row.unitRetail * row.qty;
      const cost = row.unitCost * row.qty;
      const designerIncentive = Math.floor((retail * PRODUCT_DESIGNER_RATE) / 100);
      const margin = retail - cost;
      return {
        id: row.id,
        name: row.name,
        qty: row.qty,
        unitRetail: row.unitRetail,
        unitCost: row.unitCost,
        retail,
        cost,
        margin,
        marginRate: retail > 0 ? (margin / retail) * 100 : 0,
        designerIncentive,
        shopKeep: margin - designerIncentive
      };
    })
    .sort((a, b) => b.retail - a.retail);
}

function manWon(amount: number) {
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000);
    const rest = Math.round((amount % 100_000_000) / 10_000);
    return rest > 0 ? `${eok}억 ${rest.toLocaleString("ko-KR")}만 원` : `${eok}억 원`;
  }
  return `${Math.round(amount / 10_000).toLocaleString("ko-KR")}만 원`;
}

function incomeBracketMeta(taxableBase: number) {
  let prev = 0;
  for (const row of INCOME_TAX_BRACKETS_2026) {
    if (taxableBase <= row.upTo) {
      const label =
        prev === 0
          ? `${manWon(row.upTo)} 이하`
          : !Number.isFinite(row.upTo)
            ? `${manWon(prev)} 초과`
            : `${manWon(prev)} 초과 ${manWon(row.upTo)} 이하`;
      return { rate: row.rate, deduction: row.deduction, label };
    }
    prev = row.upTo;
  }
  const last = INCOME_TAX_BRACKETS_2026[INCOME_TAX_BRACKETS_2026.length - 1];
  return { rate: last.rate, deduction: last.deduction, label: `${manWon(prev)} 초과` };
}

export function buildOwnerPnl(args: {
  period?: OwnerPeriodKind;
  year: number;
  month: number;
  from: string;
  to: string;
  settlements: SettlementDashboard;
  expenses: ExpenseRow[];
  prevRemain: number;
}): OwnerPnlDashboard {
  const artists = args.settlements.artists.map(hydrateSettlementArtist);
  const products = buildProductRows(artists);

  let serviceRevenue = 0;
  let productRevenue = 0;
  let productCost = 0;
  let productDesignerIncentive = 0;
  let designerIncentive = 0;
  let withholding = 0;
  const artistRows: OwnerArtistRow[] = artists.map((artist) => {
    let computedProduct = 0;
    let computedService = 0;
    let computedProductCost = 0;
    let serviceIncentive = 0;
    let productIncentive = 0;
    for (const booking of artist.bookings) {
      const eco = productEconomicsFromNames(booking.serviceNames, booking.amount);
      const split = designerPaySplit({
        totalAmount: booking.amount,
        serviceNames: booking.serviceNames,
        commissionRate: artist.commissionRate,
        hasCommission: artist.hasCommission
      });
      computedProduct += eco.retail;
      computedService += Math.max(0, booking.amount - eco.retail);
      computedProductCost += eco.cost;
      serviceIncentive += split.serviceIncentive;
      productIncentive += split.productIncentive;
    }
    const incentive = serviceIncentive + productIncentive;
    const incomeTax = artist.isFreelance && incentive > 0 ? floorToTenWon(incentive * 0.03) : 0;
    const localIncomeTax = artist.isFreelance && incentive > 0 ? floorToTenWon(incomeTax * 0.1) : 0;
    const artistWithholding = incomeTax + localIncomeTax;
    serviceRevenue += computedService;
    productRevenue += computedProduct;
    productCost += computedProductCost;
    productDesignerIncentive += productIncentive;
    designerIncentive += incentive;
    withholding += artistWithholding;
    return {
      artistId: artist.artistId,
      artistName: artist.artistName,
      hasCommission: artist.hasCommission,
      serviceRevenue: computedService,
      productRevenue: computedProduct,
      serviceIncentive,
      productIncentive,
      incentive,
      withholding: artistWithholding,
      netPay: artist.hasCommission ? incentive - artistWithholding : null
    };
  });

  const revenue = args.settlements.summary.totalRevenue;
  const designerNetPay = artistRows.reduce((sum, row) => sum + (row.netPay ?? 0), 0);
  const expenseTotal = args.expenses.reduce((sum, row) => sum + row.amount, 0);
  const materialAmount = natureAmount(args.expenses, "material");
  const occupancyAmount = args.expenses
    .filter((row) => String(row.category) === "occupancy")
    .reduce((sum, row) => sum + row.amount, 0);
  const proofExpense = args.expenses
    .filter((row) => row.has_tax_invoice)
    .reduce((sum, row) => sum + row.amount, 0);

  const productMargin = productRevenue - productCost;
  const productShopKeep = productMargin - productDesignerIncentive;
  const ownerServiceRevenue = artistRows
    .filter((row) => !row.hasCommission)
    .reduce((sum, row) => sum + row.serviceRevenue, 0);
  const designerServiceRevenue = artistRows
    .filter((row) => row.hasCommission)
    .reduce((sum, row) => sum + row.serviceRevenue, 0);
  const ownerProductRevenue = artistRows
    .filter((row) => !row.hasCommission)
    .reduce((sum, row) => sum + row.productRevenue, 0);
  const designerProductRevenue = artistRows
    .filter((row) => row.hasCommission)
    .reduce((sum, row) => sum + row.productRevenue, 0);
  const designerServiceIncentive = artistRows.reduce((sum, row) => sum + row.serviceIncentive, 0);
  const designerProductIncentive = artistRows.reduce((sum, row) => sum + row.productIncentive, 0);
  const shopKeepDesignerService = Math.max(0, designerServiceRevenue - designerServiceIncentive);
  const fixedAmount = natureAmount(args.expenses, "fixed");
  const operatingAmount = natureAmount(args.expenses, "operating");
  const operatingProfit = revenue - expenseTotal - productCost - designerIncentive;

  const vatOutput = extractVatIncluded(revenue);
  const vatInput = extractVatIncluded(proofExpense + productCost);
  const vatPayable = vatOutput - vatInput;

  const periodsPerYear = periodsInYear(args.period ?? "month");
  const annualizedProfit = operatingProfit * periodsPerYear;
  const taxableBase = Math.max(0, annualizedProfit - BASIC_DEDUCTION);
  const { incomeTax, bracketRate } = calcIncomeTax(taxableBase);
  const bracket = incomeBracketMeta(taxableBase);
  const localIncomeTax = Math.floor(incomeTax * LOCAL_INCOME_TAX_RATE);
  const incomeTaxReserve = Math.ceil((incomeTax + localIncomeTax) / periodsPerYear);
  const taxSetAside = vatPayable + incomeTaxReserve;
  const ownerRemain = operatingProfit - taxSetAside;

  const natures: OwnerNatureRow[] = EXPENSE_NATURES.map((item) => {
    const amount = natureAmount(args.expenses, item.key);
    return {
      key: item.key,
      label: item.label,
      amount,
      share: expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0
    };
  });

  const expenseGroups = new Map<string, { category: string; label: string; amount: number; count: number }>();
  for (const row of args.expenses) {
    const category = String(row.category);
    const cur = expenseGroups.get(category) ?? {
      category,
      label: expenseCategoryLabel(category),
      amount: 0,
      count: 0
    };
    cur.amount += row.amount;
    cur.count += 1;
    expenseGroups.set(category, cur);
  }

  const materials: OwnerMaterialRow[] = args.expenses
    .filter((row) => expenseNatureKey(String(row.category)) === "material")
    .map((row) => ({
      id: row.id,
      date: row.expense_date,
      vendor: row.vendor?.trim() || "—",
      memo: row.memo?.trim() || "—",
      amount: row.amount
    }));

  return {
    period: args.period ?? "month",
    year: args.year,
    month: args.month,
    from: args.from,
    to: args.to,
    summary: {
      revenue,
      serviceRevenue,
      productRevenue,
      productCost,
      productMargin,
      productDesignerIncentive,
      productShopKeep,
      expenseTotal,
      materialAmount,
      occupancyAmount,
      fixedAmount,
      operatingAmount,
      ownerServiceRevenue,
      designerServiceRevenue,
      ownerProductRevenue,
      designerProductRevenue,
      designerServiceIncentive,
      designerProductIncentive,
      shopKeepDesignerService,
      designerIncentive,
      designerNetPay,
      withholding,
      vatOutput,
      vatInput,
      vatPayable,
      incomeTaxPeriods: periodsPerYear,
      annualizedProfit,
      taxableBase,
      incomeTaxAnnual: incomeTax,
      localIncomeTaxAnnual: localIncomeTax,
      incomeTaxBracketRate: bracketRate,
      incomeTaxProgressiveDeduction: bracket.deduction,
      incomeTaxBracketLabel: bracket.label,
      incomeTaxReserve,
      taxSetAside,
      operatingProfit,
      ownerRemain,
      prevOwnerRemain: args.prevRemain,
      productDesignerRate: PRODUCT_DESIGNER_RATE
    },
    products,
    artists: artistRows.sort((a, b) => b.incentive - a.incentive),
    natures,
    materials,
    expenses: [...expenseGroups.values()].sort((a, b) => b.amount - a.amount)
  };
}
