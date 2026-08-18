import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useScenario } from '../../../shared/context/ScenarioContext'
import { useFormatMoney } from '../../../shell/UnitContext'
import KpiCards from '../../simple/components/common/KpiCards'
import AnalysisPanel from '../../simple/components/analysis/AnalysisPanel'
import { analyze } from '../../../shared/calc/analyzer'
import { GlowingCard } from '../../../components/aceternity/GlowingCard'

export default function ResultPage() {
  const { state } = useScenario()
  const { formatMoney } = useFormatMoney()
  const result = state.result

  const analysis = useMemo(() => result ? analyze(result) : null, [result])

  if (!result) return <div className="p-6 text-sm text-[var(--muted-foreground)]">请先输入测算数据</div>

  return (
    <div className="p-6 space-y-4">
      <motion.h1
        className="text-lg font-semibold"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        结果展示
      </motion.h1>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <GlowingCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">门店利润</p>
              <p className={`text-3xl font-bold tabular-nums ${result.profit >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                ¥{formatMoney(result.profit)}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-[var(--muted-foreground)]">盈亏平衡点</p>
              <p className="text-lg font-semibold tabular-nums">
                {result.breakevenSales ? `¥${formatMoney(result.breakevenSales)}` : '无法盈利'}
              </p>
              {analysis && (
                <motion.span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium text-white ${analysis.statusColor}`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {analysis.statusLabel}
                </motion.span>
              )}
            </div>
          </div>
        </GlowingCard>
      </motion.div>

      <KpiCards result={result} />

      {/* Fee analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <GlowingCard className="p-4">
          <h3 className="text-sm font-semibold mb-3">费率分析</h3>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <FeeItem
              label="固定费率"
              value={result.totalFixedCost / result.totalSales}
              thresholds={[0.10, 0.13]}
            />
            <FeeItem
              label="变动费率"
              value={result.variableCostRate}
              thresholds={[0.25, 0.30]}
              reverse
            />
            <FeeItem
              label="边际贡献率"
              value={result.dailyContributionRate}
              thresholds={[0.08, 0.15]}
            />
          </div>
        </GlowingCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <AnalysisPanel />
      </motion.div>
    </div>
  )
}

function FeeItem({ label, value, thresholds, reverse }: {
  label: string
  value: number
  thresholds: [number, number]
  reverse?: boolean
}) {
  const pct = (value * 100).toFixed(1)
  let colorClass = 'text-[var(--positive)]'
  if (reverse) {
    if (value > thresholds[1]) colorClass = 'text-[var(--negative)]'
    else if (value > thresholds[0]) colorClass = 'text-[var(--warning)]'
  } else {
    if (value < thresholds[0]) colorClass = 'text-[var(--warning)]'
    if (value < thresholds[0] * 0.5) colorClass = 'text-[var(--negative)]'
  }

  return (
    <div>
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <motion.p
        className={`font-semibold text-lg ${colorClass}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {pct}%
      </motion.p>
    </div>
  )
}
