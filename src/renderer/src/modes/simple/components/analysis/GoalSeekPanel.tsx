import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useScenario } from '../../../../shared/context/ScenarioContext'
import { goalSeek } from '../../../../shared/calc/goalSeek'
import type { MultiVarSolution } from '../../../../shared/calc/goalSeek'
import { useFormatMoney } from '../../../../shell/UnitContext'
import NumberInput from '../../../../components/NumberInput'
import type { StoreResult } from '../../../../shared/types/scenario'

/* ── 可行性评分圆环 ── */
function FeasibilityRing({ score }: { score: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88" className="block">
        <circle cx="44" cy="44" r={radius}
          fill="none" stroke="var(--border)" strokeWidth="6" />
        <motion.circle
          cx="44" cy="44" r={radius}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          transform="rotate(-90 44 44)" />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="central"
          className="text-lg font-bold tabular-nums" fill={color}>
          {score}
        </text>
      </svg>
      <span className="text-[10px] text-[var(--text-muted)]">可行性评分</span>
    </div>
  )
}

/* ── 多变量方案卡片 ── */
function SolutionCard({ s, delay }: { s: MultiVarSolution; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="bg-[var(--bg)] rounded-lg p-3 flex-1 min-w-0"
    >
      <div className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2">{s.label}</div>
      <div className="grid grid-cols-3 gap-0.5 mb-1.5">
        <div className="text-center">
          <div className="text-[9px] text-[var(--text-muted)]">销售额</div>
          <div className="text-[10px] font-bold tabular-nums text-[var(--accent)]">
            +{s.salesChange.toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-[var(--text-muted)]">毛利率</div>
          <div className="text-[10px] font-bold tabular-nums text-[var(--accent)]">
            +{s.marginChange.toFixed(2)}pp
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-[var(--text-muted)]">费用</div>
          <div className="text-[10px] font-bold tabular-nums text-[var(--accent)]">
            -{s.costChange.toFixed(1)}%
          </div>
        </div>
      </div>
      <div className="text-[9px] text-[var(--text-muted)] truncate">{s.description}</div>
    </motion.div>
  )
}

interface Props {
  /** 多品类时传入计算好的结果，否则取 context 中的 state.result */
  result?: StoreResult | null
}

type InputMode = 'amount' | 'rate'

export default function GoalSeekPanel({ result: propResult }: Props) {
  const { state } = useScenario()
  const { formatMoney } = useFormatMoney()
  const [targetProfit, setTargetProfit] = useState<number>(0)
  const [targetRate, setTargetRate] = useState<number>(0)
  const [dirty, setDirty] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('amount')
  const result = propResult ?? state.result
  const isMulti = !!propResult && Object.keys(result?.categoryResults ?? {}).length > 1

  // 数据被清空时重置内部状态
  useEffect(() => {
    if (result && result.totalSales === 0) {
      setDirty(false)
      setTargetProfit(0)
      setTargetRate(0)
    }
  }, [result?.totalSales])

  // 利润率 → 利润额同步
  const handleRateChange = useCallback((rate: number) => {
    setDirty(true)
    setTargetRate(rate)
    setInputMode('rate')
    if (result && result.totalSales > 0) {
      setTargetProfit(Math.round(result.totalSales * (rate / 100)))
    }
  }, [result])

  // 利润额 → 利润率同步
  const handleProfitChange = useCallback((profit: number) => {
    setDirty(true)
    setTargetProfit(profit)
    setInputMode('amount')
    if (result && result.totalSales > 0) {
      setTargetRate(+(profit / result.totalSales * 100).toFixed(2))
    }
  }, [result])

  const gs = useMemo(() => {
    if (!result || !dirty || targetProfit < 0) return null
    return goalSeek(result, targetProfit)
  }, [result, dirty, targetProfit])

  if (!result) return null

  // 多品类时计算各品类需增长的销售额（按当前销售占比分配）
  const catGaps = useMemo(() => {
    if (!isMulti || !gs?.salesGap || gs.salesGap <= 0) return null
    return Object.entries(result.categoryResults)
      .map(([name, cr]) => ({
        name,
        gap: gs.salesGap! * (cr.totalSales / result.totalSales),
        currentSales: cr.totalSales,
        targetSales: cr.totalSales + gs.salesGap! * (cr.totalSales / result.totalSales),
      }))
      .filter(c => c.gap > 0)
  }, [isMulti, gs, result])

  return (
    <div className="surface p-4 mt-3">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">目标利润反推</h3>

      {/* 双输入：目标利润额 + 目标利润率 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">目标利润</span>
          <NumberInput min={0} step={1000}
            value={dirty ? targetProfit : undefined}
            onChange={handleProfitChange}
            placeholder="元/月"
            className="flex-1 border border-[var(--border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)] tabular-nums" />
          <span className="text-[11px] text-[var(--text-muted)]">元</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">目标利润率</span>
          <NumberInput min={0} max={100} step={0.5}
            value={dirty ? targetRate : undefined}
            onChange={handleRateChange}
            placeholder="%"
            className="flex-1 border border-[var(--border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)] tabular-nums" />
          <span className="text-[11px] text-[var(--text-muted)]">%</span>
        </div>
      </div>

      {gs ? (
        gs.requiredSales === null ? (
          <p className="text-[11px] text-red-500">当前条件下加权 CMR ≤ 0，无法实现盈利目标</p>
        ) : (
          <>
            {/* 可行性评分 + 基本信息 */}
            <div className="flex items-start gap-4 mb-3">
              <FeasibilityRing score={gs.feasibilityScore} />
              <div className="flex-1 space-y-1.5 text-[11px] min-w-0">
                {gs.targetProfitRate !== null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)] whitespace-nowrap">目标利润率</span>
                    <span className="font-medium tabular-nums shrink-0">{(gs.targetProfitRate * 100).toFixed(1)}%</span>
                  </div>
                )}
                {gs.requiredSalesForRate !== null && gs.requiredSalesForRate > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)] truncate">利润率达标所需销售额</span>
                    <span className="font-medium tabular-nums shrink-0">¥{formatMoney(gs.requiredSalesForRate)}</span>
                  </div>
                )}
                {gs.targetProfitRate !== null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)] whitespace-nowrap">当前利润率</span>
                    <span className="font-medium tabular-nums shrink-0">{(result.profit / result.totalSales * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 text-[10px]">
              {/* 方案A：提高销售额 */}
              <div className="bg-[var(--bg)] rounded-lg p-3">
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-[var(--text-muted)] whitespace-nowrap">方案A：提高销售额至</span>
                  <span className="font-bold text-[var(--accent)] shrink-0">¥{formatMoney(gs.requiredSales!)}</span>
                </div>
                <span className="text-[9px] text-[var(--text-muted)]">
                  需增长 ¥{formatMoney(Math.abs(gs.salesGap!))}（{(gs.salesGapRate! * 100).toFixed(1)}%）
                </span>
                {catGaps && catGaps.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-light)] space-y-1">
                    {catGaps.map(c => (
                      <div key={c.name} className="flex justify-between text-[10px]">
                        <span className="text-[var(--text-muted)]">{c.name}</span>
                        <span className="tabular-nums">+¥{formatMoney(c.gap)} → ¥{formatMoney(c.targetSales)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* 方案B：提高毛利率 */}
              <div className="bg-[var(--bg)] rounded-lg p-3">
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-[var(--text-muted)] whitespace-nowrap">方案B：提高毛利率至</span>
                  <span className="font-bold text-[var(--accent)] shrink-0">{(gs.requiredGrossMargin! * 100).toFixed(1)}%</span>
                </div>
                <span className="text-[9px] text-[var(--text-muted)]">
                  需提升 {gs.grossMarginGap! > 0 ? '+' : ''}{(gs.grossMarginGap! * 100).toFixed(1)} 个百分点
                </span>
              </div>
              {/* 方案C：压降费用 */}
              <div className="bg-[var(--bg)] rounded-lg p-3">
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-[var(--text-muted)] whitespace-nowrap">方案C：需压降费用</span>
                  <span className="font-bold text-[var(--accent)] shrink-0">
                    {gs.requiredCostReduction! > 0 ? `¥${formatMoney(gs.requiredCostReduction!)}` : '已达标'}
                  </span>
                </div>
                <span className="text-[9px] text-[var(--text-muted)]">
                  当前利润 ¥{formatMoney(result.profit)}，{gs.requiredCostReduction! > 0 ? '目标利润 ¥' + formatMoney(targetProfit) : '无需额外调整'}
                </span>
              </div>
            </div>

            {/* 多变量组合方案 */}
            {gs.multiVarSolutions.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2">多变量组合方案</div>
                <div className="grid grid-cols-3 gap-2">
                  {gs.multiVarSolutions.map((s, i) => (
                    <SolutionCard key={s.label} s={s} delay={i * 0.1} />
                  ))}
                </div>
              </div>
            )}
          </>
        )
      ) : (
        <p className="text-[11px] text-[var(--text-muted)]">输入目标利润或目标利润率后自动计算反推方案</p>
      )}
    </div>
  )
}
