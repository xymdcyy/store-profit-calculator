import type { CategoryData, CVPData, CVPDataPoint } from '../types/scenario'
import { sumVariableCosts } from './calculator'

/** 生成 CVP 量本利分析数据点 */
export function generateCVPData(
  sales: number,
  variableCostRate: number,
  fixedCost: number,
  grossMargin: number,
  points: number = 20,
): CVPData {
  const maxSales = sales * 2
  const step = maxSales / points

  const data: CVPDataPoint[] = []
  for (let i = 0; i <= points; i++) {
    const s = step * i
    const revenue = s
    const variableCost = s * variableCostRate
    const totalCost = variableCost + fixedCost
    const profit = revenue * grossMargin - variableCost - fixedCost

    data.push({ sales: s, revenue, variableCost, fixedCost, totalCost, profit })
  }

  const cmr = grossMargin - variableCostRate
  const breakEvenSales = cmr > 0 ? fixedCost / cmr : 0

  return { data, breakEvenPoint: { sales: breakEvenSales, revenue: breakEvenSales } }
}

/** 生成 X/C/P/S 明细 CVP */
export function generateCategoryLevelCVPData(
  category: CategoryData,
  variableCost: number,
  fixedCost: number,
): Record<string, CVPData> {
  const totalSales = Object.values(category.productStructure).reduce((s, t) => s + t.sales, 0)
  const vcRate = totalSales > 0 ? variableCost / totalSales : 0

  const result: Record<string, CVPData> = {}
  for (const [level, data] of Object.entries(category.productStructure)) {
    result[level] = generateCVPData(data.sales, vcRate, fixedCost, data.grossMargin)
  }
  return result
}

/** 金额转点位 */
export function amountToRate(amount: number, sales: number): number {
  return sales > 0 ? amount / sales : 0
}

/** 点位转金额 */
export function rateToAmount(rate: number, sales: number): number {
  return rate * sales
}
