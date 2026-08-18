import type {
  CategoryData, FixedCosts, StoreResult, CategoryResult,
  TierResult, StepSegment, StepChartData, TierData, CostMode,
} from '../types/scenario'
import { CATEGORY_COLORS, normalizeCategoryName } from '../constants/categories'
import { sumVariableCostsByMode } from '../../modes/simple/data/costModeLabels'

/** 变动费用率 = 按核算模式过滤后的字段之和（避免两套费用池重复计入） */
export function sumVariableCosts(vc: Record<string, number> | any, mode?: CostMode): number {
  return sumVariableCostsByMode(vc, mode)
}

/** 系列 CMR = 毛利率 - 变动费率 */
export function calcCMR(gm: number, vr: number): number {
  return gm - vr
}

/** 系列实际边际贡献率：销售额为 0 时无贡献，显示 0 而非负值（修复误报负 CMR） */
export function calcTierCMR(t: TierData, vr: number): number {
  if (t.sales <= 0) return 0
  return calcCMR(t.grossMargin, vr)
}

/** 单品类 — 按系列加权 CMR */
function calcWeightedCMR(tiers: Record<string, TierData>, vr: number): number {
  const total = Object.values(tiers).reduce((s, t) => s + t.sales, 0)
  if (total === 0) return 0
  return Object.values(tiers).reduce((sum, t) => sum + (t.sales / total) * calcCMR(t.grossMargin, vr), 0)
}

/** 单品类计算 */
export function calcCategory(data: CategoryData): {
  result: CategoryResult; tierResults: Record<string, TierResult>
} {
  const tiers = data.productStructure
  const vr = sumVariableCosts(data.variableCosts, data.costMode)
  const totalSales = Object.values(tiers).reduce((s, t) => s + t.sales, 0)
  const totalGP = Object.values(tiers).reduce((s, t) => s + t.sales * t.grossMargin, 0)
  const totalVC = totalSales * vr
  const weightedCMR = calcWeightedCMR(tiers, vr)
  const contribution = totalSales * weightedCMR

  const tierResults: Record<string, TierResult> = {}
  for (const [name, t] of Object.entries(tiers)) {
    const cmr = calcTierCMR(t, vr)
    tierResults[name] = {
      sales: t.sales,
      volume: t.volume,
      ratio: totalSales > 0 ? t.sales / totalSales : 0,
      grossMargin: t.grossMargin,
      cmr,
      contributionAmount: t.sales * cmr,
    }
  }

  const result: CategoryResult = {
    category: normalizeCategoryName(data.category),
    totalSales,
    totalGrossProfit: totalGP,
    totalVariableCost: totalVC,
    variableCostRate: vr,
    weightedCMR,
    contributionAmount: contribution,
    tierResults,
  }

  return { result, tierResults }
}

/** 多品类计算 */
export function calcMultiCategory(
  categories: Record<string, CategoryData>,
  storeFC: FixedCosts,
): Omit<StoreResult, 'stepChartData'> {
  const catResults: Record<string, CategoryResult> = {}
  let totalSales = 0
  let totalGP = 0
  let totalVC = 0
  let totalCatFC = 0

  for (const [key, cat] of Object.entries(categories)) {
    const { result } = calcCategory(cat)
    catResults[key] = result
    totalSales += result.totalSales
    totalGP += result.totalGrossProfit
    totalVC += result.totalVariableCost
    if (cat.exclusiveFixedCosts) {
      totalCatFC += Object.values(cat.exclusiveFixedCosts).reduce((a, b) => a + b, 0)
    }
  }

  const totalStoreFC = Object.values(storeFC).reduce((a, b) => a + b, 0)
  const totalFixedCost = totalStoreFC + totalCatFC

  let weightedCMR = 0
  if (totalSales > 0) {
    weightedCMR = Object.values(catResults).reduce(
      (sum, cr) => sum + (cr.totalSales / totalSales) * cr.weightedCMR, 0,
    )
  }

  const contribution = totalSales * weightedCMR
  const totalSubsidy = Object.values(categories).reduce(
    (s, cat) => s + Object.values(cat.productStructure).reduce((ss, t) => ss + (t.subsidy || 0), 0), 0)
  const dailyContributionAmount = contribution + totalSubsidy
  const dailyContributionRate = totalSales > 0 ? dailyContributionAmount / totalSales : 0
  const profit = dailyContributionAmount - totalFixedCost
  const grossMarginRate = totalSales > 0 ? totalGP / totalSales : 0
  const variableCostRate = totalSales > 0 ? totalVC / totalSales : 0

  let breakevenSales: number | null = null
  let safetyMarginRate: number | null = null
  let categoryBEP: number | null = null

  if (weightedCMR > 0) {
    // 保本点 = 净固定费用（固定费用 − 总部补贴）÷ 加权 CMR；
    // 补贴 ≥ 固定费用时已保本（BEP=0）
    const netFC = totalFixedCost - totalSubsidy
    breakevenSales = netFC > 0 ? netFC / weightedCMR : 0
    safetyMarginRate = totalSales > 0 ? (totalSales - breakevenSales) / totalSales : 0
    categoryBEP = totalCatFC > 0 ? totalCatFC / weightedCMR : null
  }

  return {
    totalSales, totalGrossProfit: totalGP, totalVariableCost: totalVC,
    totalFixedCost, contributionAmount: contribution,
    totalSubsidy, dailyContributionAmount, dailyContributionRate, profit,
    grossMarginRate, variableCostRate, weightedCMR,
    breakevenSales, safetyMarginRate, categoryBEP,
    categoryResults: catResults,
  }
}

/** 单品类完整计算（含阶梯图数据） */
export function calcSingleStore(
  storeName: string,
  data: CategoryData,
  storeFC: FixedCosts,
): StoreResult {
  const { result } = calcCategory(data)
  const totalStoreFC = Object.values(storeFC).reduce((a, b) => a + b, 0)
  const totalSubsidy = Object.values(data.productStructure).reduce((s, t) => s + (t.subsidy || 0), 0)
  const dailyContributionAmount = result.contributionAmount + totalSubsidy
  const dailyContributionRate = result.totalSales > 0 ? dailyContributionAmount / result.totalSales : 0
  const profit = dailyContributionAmount - totalStoreFC

  let breakevenSales: number | null = null
  let safetyMarginRate: number | null = null
  if (result.weightedCMR > 0) {
    // 保本点 = 净固定费用（固定费用 − 总部补贴）÷ 加权 CMR
    const netFC = totalStoreFC - totalSubsidy
    breakevenSales = netFC > 0 ? netFC / result.weightedCMR : 0
    safetyMarginRate = result.totalSales > 0
      ? (result.totalSales - breakevenSales) / result.totalSales : 0
  }

  const base: Omit<StoreResult, 'stepChartData'> = {
    totalSales: result.totalSales,
    totalGrossProfit: result.totalGrossProfit,
    totalVariableCost: result.totalVariableCost,
    totalFixedCost: totalStoreFC,
    contributionAmount: result.contributionAmount,
    totalSubsidy,
    dailyContributionAmount,
    dailyContributionRate,
    profit,
    grossMarginRate: result.totalSales > 0 ? result.totalGrossProfit / result.totalSales : 0,
    variableCostRate: result.variableCostRate,
    weightedCMR: result.weightedCMR,
    breakevenSales,
    safetyMarginRate,
    categoryResults: { [data.category]: result },
  }

  const stepChartData = buildStepChartData(base, false)
  return { ...base, stepChartData }
}

/** 构建阶梯图段数据 */
export function buildStepChartData(
  base: Omit<StoreResult, 'stepChartData'>,
  isMulti: boolean,
): StepChartData {
  const allSegments: StepSegment[] = []

  if (isMulti) {
    const catEntries = Object.entries(base.categoryResults)
      .sort(([, a], [, b]) => b.weightedCMR - a.weightedCMR)

    for (const [, cr] of catEntries) {
      const catColor = CATEGORY_COLORS[cr.category] || '#6b7280'
      const tierEntries = Object.entries(cr.tierResults)
        .sort(([, a], [, b]) => b.cmr - a.cmr)

      for (const [tierName, tr] of tierEntries) {
        if (tr.sales <= 0) continue
        allSegments.push({
          label: `${cr.category}-${tierName}`,
          category: cr.category,
          sales: tr.sales,
          cumulativeSales: 0,
          cmr: tr.cmr,
          contributionAmount: tr.contributionAmount,
          cumulativeContribution: 0,
          color: catColor,
        })
      }
    }
  } else {
    for (const [, cr] of Object.entries(base.categoryResults)) {
      const catColor = CATEGORY_COLORS[cr.category] || '#6b7280'
      const entries = Object.entries(cr.tierResults)
        .sort(([, a], [, b]) => b.cmr - a.cmr)

      for (const [tierName, tr] of entries) {
        if (tr.sales <= 0) continue
        allSegments.push({
          label: tierName,
          category: cr.category,
          sales: tr.sales,
          cumulativeSales: 0,
          cmr: tr.cmr,
          contributionAmount: tr.contributionAmount,
          cumulativeContribution: 0,
          color: catColor,
        })
      }
    }
  }

  let cumSales = 0
  let cumContribution = 0
  for (const seg of allSegments) {
    cumSales += seg.sales
    cumContribution += seg.contributionAmount
    seg.cumulativeSales = cumSales
    seg.cumulativeContribution = cumContribution
  }

  const totalFC = base.totalFixedCost

  const findBEP = (fc: number): { sales: number; label: string } | null => {
    if (fc <= 0) return { sales: 0, label: '保本点 ¥0' }  // 补贴已覆盖固定费用，起点即保本
    let prevCs = 0, prevCc = 0
    for (const seg of allSegments) {
      if (seg.cumulativeContribution >= fc) {
        const overshoot = fc - prevCc
        const bepSales = seg.cmr > 0 ? prevCs + overshoot / seg.cmr : prevCs
        return { sales: Math.round(bepSales), label: `保本点 ¥${Math.round(bepSales).toLocaleString()}` }
      }
      prevCs = seg.cumulativeSales
      prevCc = seg.cumulativeContribution
    }
    return null
  }

  // 多品类：计算品类共同 FC 和对应 BEP
  let catFC: number | undefined
  let catBEP: { sales: number; label: string } | null | undefined
  if (isMulti && (base as any).categoryBEP && base.weightedCMR > 0) {
    catFC = (base as any).categoryBEP * base.weightedCMR
    catBEP = catFC > 0 ? findBEP(catFC) : undefined
  }

  // 门店保本点按净固定费用（扣除总部补贴）插值，与 KPI 保本点口径一致
  const netFC = totalFC - (base.totalSubsidy ?? 0)

  return {
    segments: allSegments,
    storeFC: totalFC,
    categoryFC: catFC,
    storeBEP: findBEP(netFC),
    categoryBEP: catBEP,
    currentSales: base.totalSales,
  }
}

/** 按品类分组，返回品类级段（用于主视图） */
export function buildCategorySegments(
  base: Omit<StoreResult, 'stepChartData'>,
): StepSegment[] {
  const catSegments: StepSegment[] = []
  const entries = Object.entries(base.categoryResults)
    .sort(([, a], [, b]) => b.weightedCMR - a.weightedCMR)

  let cumSales = 0, cumCont = 0
  for (const [, cr] of entries) {
    cumSales += cr.totalSales
    cumCont += cr.contributionAmount
    catSegments.push({
      label: cr.category,
      category: cr.category,
      sales: cr.totalSales,
      cumulativeSales: cumSales,
      cmr: cr.weightedCMR,
      contributionAmount: cr.contributionAmount,
      cumulativeContribution: cumCont,
      color: CATEGORY_COLORS[cr.category] || '#6b7280',
    })
  }

  return catSegments
}
