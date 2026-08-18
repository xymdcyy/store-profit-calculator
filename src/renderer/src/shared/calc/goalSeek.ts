import type { StoreResult } from '../types/scenario'

export interface MultiVarSolution {
  label: string          // "保守方案" / "均衡方案" / "激进方案"
  salesChange: number    // 销售额变化 %
  marginChange: number   // 毛利率变化 pp
  costChange: number     // 费用变化 %
  description: string    // 方案描述
}

export interface GoalSeekResult {
  /** 方案A：提高销售额至目标值 */
  requiredSales: number | null
  salesGap: number | null      // 需增长的销售额
  salesGapRate: number | null  // 增长比例

  /** 方案B：提高毛利率至目标值 */
  requiredGrossMargin: number | null
  grossMarginGap: number | null  // 需提高的毛利率（差值）

  /** 方案C：需压降的费用额 */
  requiredCostReduction: number | null

  /** 目标利润率 */
  targetProfitRate: number | null
  /** 达到目标利润率所需销售额 */
  requiredSalesForRate: number | null

  /** 可行性评分 0-100 */
  feasibilityScore: number

  /** 多变量组合方案 */
  multiVarSolutions: MultiVarSolution[]
}

/**
 * 计算可行性评分
 * 基于销售额差距比例评估目标可达性
 */
function calcFeasibilityScore(gapRate: number | null): number {
  if (gapRate === null || gapRate <= 0) return 95  // 已达标
  const absGap = Math.abs(gapRate)
  if (absGap < 0.10) return 90
  if (absGap < 0.20) return 70
  if (absGap < 0.30) return 50
  if (absGap < 0.50) return 30
  return 20
}

/**
 * 计算多变量组合方案
 * 将利润缺口按不同比例分配到销售、毛利、费用三个维度
 */
function calcMultiVarSolutions(
  result: StoreResult,
  targetProfit: number,
): MultiVarSolution[] {
  const wcmr = result.weightedCMR
  const sales = result.totalSales
  const profitGap = targetProfit - result.profit

  // 加权CMR ≤ 0 或无需增长：无法计算
  if (wcmr <= 0 || sales <= 0 || profitGap <= 0) {
    return []
  }

  // 三种策略：[销售占比, 毛利占比, 费用占比]
  const strategies: [string, [number, number, number]][] = [
    ['保守方案', [0.80, 0.15, 0.05]],
    ['均衡方案', [0.40, 0.30, 0.30]],
    ['激进方案', [0.15, 0.35, 0.50]],
  ]

  return strategies.map(([label, [sRatio, mRatio, cRatio]]) => {
    // 销售额需增加：假设销售额增加后，wcmr 对应贡献增量利润
    // 利润增量 ≈ 销售增量 × wcmr
    const salesProfitPart = profitGap * sRatio
    const salesIncrease = salesProfitPart / wcmr
    const salesChange = sales > 0 ? (salesIncrease / sales) * 100 : 0

    // 毛利率需提升：Δ利润 ≈ 销售额 × Δ毛利率
    const marginProfitPart = profitGap * mRatio
    const marginChange = sales > 0 ? (marginProfitPart / sales) * 100 : 0  // 百分点

    // 费用需压降：Δ利润 = 费用降低额
    const costReduction = profitGap * cRatio
    const costChange = result.totalFixedCost > 0
      ? (costReduction / result.totalFixedCost) * 100
      : 0

    const description = buildDescription(label, salesChange, marginChange, costReduction)

    return { label, salesChange, marginChange, costChange, description }
  })
}

function buildDescription(
  label: string,
  salesChange: number,
  marginChange: number,
  costReduction: number,
): string {
  const parts: string[] = []
  if (salesChange > 0.1) parts.push(`销售额+${salesChange.toFixed(1)}%`)
  if (marginChange > 0.01) parts.push(`毛利率+${marginChange.toFixed(2)}pp`)
  if (costReduction > 0) parts.push(`费用-¥${costReduction.toFixed(0)}`)
  if (parts.length === 0) return '无需调整'
  return parts.join('、')
}

/**
 * 利润目标反推
 * @param result 当前计算结果
 * @param targetProfit 目标利润（元/月）
 */
export function goalSeek(result: StoreResult, targetProfit: number): GoalSeekResult {
  const wcmr = result.weightedCMR
  const subsidy = result.totalSubsidy
  const fc = result.totalFixedCost
  const sales = result.totalSales

  // 加权CMR ≤ 0：无法盈利
  if (wcmr <= 0) {
    return {
      requiredSales: null, salesGap: null, salesGapRate: null,
      requiredGrossMargin: null, grossMarginGap: null,
      requiredCostReduction: null,
      targetProfitRate: null,
      requiredSalesForRate: null,
      feasibilityScore: 0,
      multiVarSolutions: [],
    }
  }

  // A. 所需销售额 = (目标利润 + 固定费用 - 补贴) ÷ 加权CMR
  const requiredSales = (targetProfit + fc - subsidy) / wcmr
  const salesGap = requiredSales - sales
  const salesGapRate = sales > 0 ? salesGap / sales : 0

  // B. 保本毛利率 = 变动费率 + (目标利润 + 固定费用 - 补贴) ÷ 销售额
  const requiredGrossMargin = sales > 0
    ? result.variableCostRate + (targetProfit + fc - subsidy) / sales
    : 0
  const grossMarginGap = requiredGrossMargin - result.grossMarginRate

  // C. 所需压降费用 = 当前利润 - 目标利润（正值=需压降，负值=可放松）
  const requiredCostReduction = result.profit - targetProfit

  // D. 目标利润率 & 达到该利润率所需销售额
  // 分母 wcmr - targetProfitRate ≤ 0 时无解（目标利润率 ≥ 加权 CMR 无法通过扩大销售实现）
  const targetProfitRate = sales > 0 ? targetProfit / sales : null
  const requiredSalesForRate = targetProfitRate !== null && wcmr > 0 && wcmr - targetProfitRate > 0
    ? (fc - subsidy) / (wcmr - targetProfitRate)
    : null

  // E. 可行性评分
  const feasibilityScore = calcFeasibilityScore(salesGapRate)

  // F. 多变量组合方案
  const multiVarSolutions = calcMultiVarSolutions(result, targetProfit)

  return {
    requiredSales, salesGap, salesGapRate,
    requiredGrossMargin, grossMarginGap,
    requiredCostReduction,
    targetProfitRate, requiredSalesForRate,
    feasibilityScore,
    multiVarSolutions,
  }
}
