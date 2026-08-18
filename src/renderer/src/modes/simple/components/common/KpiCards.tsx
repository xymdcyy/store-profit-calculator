import { memo } from 'react'
import { motion } from 'framer-motion'
import type { StoreResult } from '../../../../shared/types/scenario'
import { useFormatMoney } from '../../../../shell/UnitContext'
import { GlowingCard } from '../../../../components/aceternity/GlowingCard'

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

function FmtNum(n: number): string {
  return Math.round(n).toLocaleString()
}

interface KpiCardProps {
  title: string
  value: string
  subLabel: string
  formula: string
  description: string
  valueClassName?: string
  index: number
}

function KpiCard({ title, value, subLabel, formula, description, valueClassName, index }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <GlowingCard className="p-4 group cursor-help h-full">
        <div className="flex flex-col gap-1">
          {/* 悬浮 tooltip */}
          <div className="absolute left-0 right-0 top-full mt-1 px-3 py-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none">
            <div className="font-semibold text-[10px] text-red-300 uppercase tracking-wider mb-1.5">计算公式</div>
            <div className="font-mono text-xs mb-2 leading-relaxed whitespace-pre-line">{formula}</div>
            <div className="text-[10px] text-gray-400 leading-relaxed">{description}</div>
          </div>

          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            {title}
          </span>
          <span className={`text-2xl font-bold tracking-tight tabular-nums ${valueClassName || 'text-[var(--text-primary)]'}`}>
            {value}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
            {subLabel}
          </span>
        </div>
      </GlowingCard>
    </motion.div>
  )
}

const KpiCards = memo(function KpiCards({ result }: { result: StoreResult }) {
  const { formatMoney } = useFormatMoney()

  const breakevenGM = result.totalSales > 0
    ? result.variableCostRate + (result.totalFixedCost / result.totalSales)
    : 0

  const profitTone = result.profit > 0 ? 'text-emerald-600' : result.profit < 0 ? 'text-red-500' : 'text-slate-700'
  const bepValue = result.breakevenSales !== null ? `¥${formatMoney(result.breakevenSales)}` : '无法盈利'

  const fwCMR = pct(result.weightedCMR)
  const fc = FmtNum(result.totalFixedCost)
  const currentSales = FmtNum(result.totalSales)
  const vcRate = pct(result.variableCostRate)
  const fcRate = pct(result.totalSales > 0 ? result.totalFixedCost / result.totalSales : 0)
  const marginContribution = FmtNum(result.contributionAmount)
  const subsidy = FmtNum(result.totalSubsidy)

  return (
    <div className="relative z-30 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 pb-2">
      {/* 1. 销售额保本点 */}
      <KpiCard
        title="销售额保本点"
        value={bepValue}
        subLabel={`加权 CMR ${fwCMR}`}
        formula={`固定费用 ÷ 加权 CMR\n= ¥${fc} ÷ ${fwCMR}`}
        description="刚好覆盖所有成本（变动+固定）所需的月销售额。低于此值 → 亏损，高于此值 → 盈利。"
        index={0}
      />

      {/* 2. 保本毛利率 */}
      <KpiCard
        title="保本毛利率"
        value={pct(breakevenGM)}
        subLabel={`实际毛利率 ${pct(result.grossMarginRate)}`}
        formula={`变动费率 + 固定费率\n= ${vcRate} + ${fcRate}`}
        description="不亏损所需的最低综合毛利率。实际毛利率 ≥ 保本毛利率 方可盈利。"
        valueClassName={result.grossMarginRate >= breakevenGM ? 'text-emerald-600' : 'text-amber-600'}
        index={1}
      />

      {/* 3. 门店利润 */}
      <KpiCard
        title="门店利润"
        value={`¥${formatMoney(result.profit)}`}
        subLabel={`利润率 ${pct(result.totalSales > 0 ? result.profit / result.totalSales : 0)}`}
        formula={`（销售额 × 加权CMR）+ 补贴 − 固定费用\n= (¥${currentSales} × ${fwCMR}) + ¥${subsidy} − ¥${fc}`}
        description="当月净利润。已包含总部补贴和全部费用。正值=盈利，负值=亏损。"
        valueClassName={profitTone}
        index={2}
      />

      {/* 4. 日常边际贡献 */}
      <KpiCard
        title="日常边际贡献"
        value={`¥${formatMoney(result.dailyContributionAmount)}`}
        subLabel={`贡献率 ${pct(result.dailyContributionRate)}`}
        formula={`边际贡献额 + 总部补贴\n= ¥${marginContribution} + ¥${subsidy}`}
        description="扣除固定费用前的利润贡献。该值必须 ≥ 固定费用方可保本。"
        valueClassName={result.dailyContributionAmount >= 0 ? 'text-emerald-600' : 'text-red-500'}
        index={3}
      />
    </div>
  )
})

export default KpiCards
