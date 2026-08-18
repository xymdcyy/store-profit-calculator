import type { StoreResult } from '../types/scenario'

/** 单个敏感性格子 */
export interface SensitivityCell {
  profit: number
  profitRate: number
  status: 'profit' | 'loss' | 'breakeven'
}

/** 敏感性分析矩阵 */
export interface SensitivityMatrix {
  salesChanges: number[]
  cmrChanges: number[]
  cells: SensitivityCell[][]        // [salesIdx][cmrIdx]
  baseProfit: number
  baseProfitRate: number
}

const BREAKEVEN_THRESHOLD = 500 // 利润绝对值<500视为盈亏平衡

/**
 * 构建敏感性分析矩阵
 *
 * @param result  当前门店测算结果
 * @param salesSteps  销售额变动百分比步长，默认 [-20,-10,0,10,20]
 * @param cmrSteps    综合扣率变动百分点步长，默认 [-3,-1,0,1,3]
 */
export function buildSensitivityMatrix(
  result: StoreResult,
  salesSteps: number[] = [-20, -10, 0, 10, 20],
  cmrSteps: number[] = [-3, -1, 0, 1, 3],
): SensitivityMatrix {
  const { totalSales, weightedCMR, totalFixedCost, totalSubsidy } = result

  const cells: SensitivityCell[][] = salesSteps.map(sChange => {
    const adjSales = totalSales * (1 + sChange / 100)
    return cmrSteps.map(cChange => {
      const adjCMR = weightedCMR + cChange / 100
      const profit = adjSales * adjCMR - totalFixedCost + totalSubsidy
      const profitRate = adjSales !== 0 ? profit / adjSales : 0

      let status: SensitivityCell['status'] = 'profit'
      if (Math.abs(profit) < BREAKEVEN_THRESHOLD) status = 'breakeven'
      else if (profit < 0) status = 'loss'

      return { profit, profitRate, status }
    })
  })

  // 基准点
  const baseProfit = totalSales * weightedCMR - totalFixedCost + totalSubsidy
  const baseProfitRate = totalSales !== 0 ? baseProfit / totalSales : 0

  return { salesChanges: salesSteps, cmrChanges: cmrSteps, cells, baseProfit, baseProfitRate }
}
