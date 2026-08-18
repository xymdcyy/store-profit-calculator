import type { PeriodData } from '../../../shared/types/scenario'
import type { StoreResult } from '../../../shared/types/scenario'

const STORAGE_KEY = 'tcl_trend_periods'

function getKey(storeName: string): string {
  return `${STORAGE_KEY}_${storeName || 'default'}`
}

export function loadPeriods(storeName: string): PeriodData[] {
  try {
    const raw = localStorage.getItem(getKey(storeName))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePeriod(storeName: string, label: string, result: StoreResult): PeriodData[] {
  const periods = loadPeriods(storeName)
  const period: PeriodData = {
    label,
    sales: result.totalSales,
    grossProfit: result.totalGrossProfit,
    variableCost: result.totalVariableCost,
    fixedCost: result.totalFixedCost,
    profit: result.profit,
    grossMarginRate: result.grossMarginRate,
    cmr: result.weightedCMR,
    profitRate: result.totalSales > 0 ? result.profit / result.totalSales : 0,
    breakevenSales: result.breakevenSales,
  }
  const existing = periods.findIndex(p => p.label === label)
  if (existing >= 0) periods[existing] = period
  else periods.push(period)
  localStorage.setItem(getKey(storeName), JSON.stringify(periods))
  return periods
}

export function deletePeriod(storeName: string, label: string): PeriodData[] {
  const periods = loadPeriods(storeName).filter(p => p.label !== label)
  localStorage.setItem(getKey(storeName), JSON.stringify(periods))
  return periods
}

export function clearPeriods(storeName: string): void {
  localStorage.removeItem(getKey(storeName))
}
