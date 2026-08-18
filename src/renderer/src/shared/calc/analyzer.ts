import type { StoreResult } from '../types/scenario'

export interface Suggestion {
  category: 'product' | 'cost' | 'revenue' | 'structure'
  priority: 'high' | 'medium' | 'low'
  message: string
}

export interface AnalysisResult {
  status: 'healthy' | 'marginal' | 'loss' | 'critical'
  statusLabel: string
  statusColor: string
  suggestions: Suggestion[]
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  healthy:  { label: '健康', color: 'bg-emerald-500' },
  marginal: { label: '微利', color: 'bg-amber-500' },
  loss:     { label: '亏损', color: 'bg-red-500' },
  critical: { label: '严重', color: 'bg-red-700' },
}

export function analyze(r: StoreResult): AnalysisResult {
  const suggestions: Suggestion[] = []

  // ── 盈利状态判断 ──
  let status: AnalysisResult['status']
  if (r.breakevenSales && r.breakevenSales > r.totalSales * 3) {
    status = 'critical'
    suggestions.push({
      category: 'structure',
      priority: 'high',
      message: `保本销售额（¥${Math.round(r.breakevenSales).toLocaleString()}）远超实际销售额（¥${Math.round(r.totalSales).toLocaleString()}），需结构级改革。`,
    })
  } else if (r.profit > 0 && (r.safetyMarginRate ?? 0) > 0.1) {
    status = 'healthy'
  } else if (r.profit > 0) {
    status = 'marginal'
  } else if (r.weightedCMR > 0) {
    status = 'loss'
  } else {
    status = 'critical'
  }

  // 低安全边际独立警告
  if (r.safetyMarginRate !== null && r.safetyMarginRate < 0.1 && r.safetyMarginRate > 0) {
    suggestions.push({
      category: 'structure',
      priority: 'medium',
      message: `安全边际率仅${(r.safetyMarginRate * 100).toFixed(1)}%，经营风险较高，微小的销售额波动即可能导致亏损。`,
    })
  }

  // ── 产品结构诊断 ──
  const catCount = Object.keys(r.categoryResults).length
  for (const [catKey, cr] of Object.entries(r.categoryResults)) {
    const prefix = catCount > 1 ? `${catKey}：` : ''

    // 找到最后一个系列（通常是低端系列）检查占比
    const tierEntries = Object.entries(cr.tierResults)
    const lastTier = tierEntries[tierEntries.length - 1]
    if (lastTier && lastTier[1].ratio > 0.30) {
      suggestions.push({
        category: 'product',
        priority: 'high',
        message: `${prefix}${lastTier[0]}系列低毛利产品占比过高（${(lastTier[1].ratio * 100).toFixed(0)}%），建议优化产品结构，提升高毛利系列占比。`,
      })
    }

    if (cr.weightedCMR < 0.05) {
      suggestions.push({
        category: 'product',
        priority: 'medium',
        message: `${prefix}边际贡献率偏低（${(cr.weightedCMR * 100).toFixed(1)}%），建议调整型号结构或评估该品类必要性。`,
      })
    }

    for (const [tierName, tr] of Object.entries(cr.tierResults)) {
      if (tr.cmr < 0) {
        suggestions.push({
          category: 'product',
          priority: 'high',
          message: `${prefix}${tierName}系列边际贡献率为负，销售该系列反而亏损，需重点关注。`,
        })
      }
    }

    // 综合毛利率 vs 保本毛利率（固定费用扣除总部补贴）
    const breakevenGM = r.totalSales > 0 ? r.variableCostRate + ((r.totalFixedCost - r.totalSubsidy) / r.totalSales) : 0
    if (cr.totalSales > 0 && cr.totalGrossProfit / cr.totalSales < breakevenGM) {
      suggestions.push({
        category: 'product',
        priority: 'high',
        message: `${prefix}综合毛利率（${((cr.totalGrossProfit / cr.totalSales) * 100).toFixed(1)}%）低于保本要求（${(breakevenGM * 100).toFixed(1)}%），需提升毛利率或降低费用。`,
      })
    }
  }

  // ── 费用诊断 ──
  if (r.variableCostRate > 0.25) {
    suggestions.push({
      category: 'cost',
      priority: 'high',
      message: `变动费用率（${(r.variableCostRate * 100).toFixed(1)}%）偏高，建议重点压缩可控费用项（渠道激励、促销推广、储运物流）。`,
    })
  }

  if (r.totalSales > 0 && r.totalFixedCost / r.totalSales > 0.10) {
    suggestions.push({
      category: 'cost',
      priority: 'medium',
      message: `固定费用占比（${((r.totalFixedCost / r.totalSales) * 100).toFixed(1)}%）过高，建议控制场地费、人力成本等刚性支出。`,
    })
  }

  if (r.totalSales < (r.breakevenSales ?? Infinity) && r.weightedCMR > 0) {
    const gap = (r.breakevenSales ?? 0) - r.totalSales
    suggestions.push({
      category: 'revenue',
      priority: 'high',
      message: `当前销售额低于保本点¥${Math.round(gap).toLocaleString()}，需提升¥${Math.round(gap).toLocaleString()}元销售额或压降¥${Math.round(gap * r.weightedCMR).toLocaleString()}元费用。`,
    })
  }

  // ── 阶梯图专项诊断 ──
  const segments = r.stepChartData?.segments ?? []
  if (segments.length >= 2 && segments[1].cumulativeContribution >= r.totalFixedCost) {
    suggestions.push({
      category: 'structure',
      priority: 'low',
      message: '高CMR系列贡献充足，门店盈利基础稳固。但风险点：过度依赖少数高端系列。',
    })
  }

  if (segments.length > 0 && segments[segments.length - 1].cumulativeContribution < r.totalFixedCost && r.weightedCMR > 0) {
    suggestions.push({
      category: 'revenue',
      priority: 'high',
      message: '整体销量不足，即使所有系列按当前结构销售，仍无法覆盖固定成本。需做大总量。',
    })
  }

  // 去重 + 按优先级排序
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return {
    status,
    statusLabel: STATUS_MAP[status].label,
    statusColor: STATUS_MAP[status].color,
    suggestions: suggestions.slice(0, 6),
  }
}
