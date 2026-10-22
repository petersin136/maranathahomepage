import {
  BASIC_DEDUCTION,
  LOCAL_INCOME_TAX_RATE,
  calcIncomeTax,
  extractVatIncluded
} from "@/lib/admin/tax-data";

/**
 * 매장 손익 상단 4구 KPI가 사이트 전체의 기준이다.
 *
 * 총 매출액        = 기간 안 완료 결제 final_amount 합 (시술 + 제품, paid_at)
 * 총 지출 및 인센  = 등록 지출 + 판매 제품 매입 원가 + 디자이너 인센티브
 * 예상 제세공과금  = 부가세(예상) + 종합소득세(예상 적립액)
 * 당월 세후 순수익 = 총 매출액 − 총 지출 및 인센 − 예상 제세공과금
 */
export function moneyOut(expenseTotal: number, productCost: number, designerIncentive: number) {
  return expenseTotal + productCost + designerIncentive;
}

export function operatingProfitFrom(
  revenue: number,
  expenseTotal: number,
  productCost: number,
  designerIncentive: number
) {
  return revenue - moneyOut(expenseTotal, productCost, designerIncentive);
}

export function vatFromIncluded(revenue: number, proofExpense: number, productCost: number) {
  const vatOutput = extractVatIncluded(revenue);
  const vatInput = extractVatIncluded(proofExpense + productCost);
  return {
    vatOutput,
    vatInput,
    vatPayable: vatOutput - vatInput
  };
}

export function incomeTaxReserveFromProfit(operatingProfit: number, periodsPerYear: number) {
  const periods = Math.max(1, periodsPerYear);
  const annualizedProfit = operatingProfit * periods;
  const taxableBase = Math.max(0, annualizedProfit - BASIC_DEDUCTION);
  const { incomeTax, bracketRate } = calcIncomeTax(taxableBase);
  const localIncomeTax = Math.floor(incomeTax * LOCAL_INCOME_TAX_RATE);
  const incomeTaxReserve = Math.ceil((incomeTax + localIncomeTax) / periods);
  return {
    annualizedProfit,
    taxableBase,
    incomeTaxAnnual: incomeTax,
    localIncomeTaxAnnual: localIncomeTax,
    bracketRate,
    incomeTaxReserve
  };
}

export function taxSetAsideFrom(vatPayable: number, incomeTaxReserve: number) {
  return vatPayable + incomeTaxReserve;
}

export function ownerRemainFrom(operatingProfit: number, taxSetAside: number) {
  return operatingProfit - taxSetAside;
}
