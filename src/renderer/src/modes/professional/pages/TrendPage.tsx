import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useScenario } from '../../../shared/context/ScenarioContext'
import { useFormatMoney } from '../../../shell/UnitContext'
import { GlowingCard } from '../../../components/aceternity/GlowingCard'
import TrendChart from '../components/TrendChart'
import { loadPeriods, savePeriod, deletePeriod, clearPeriods } from '../services/periodStore'
import type { PeriodData } from '../../../shared/types/scenario'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function pct(n: number | null | undefined): string {
  if (n == null) return '—'
  return (n * 100).toFixed(2) + '%'
}

export default function TrendPage() {
  const { state } = useScenario()
  const { formatMoney } = useFormatMoney()
  const result = state.result
  const storeName = state.scenario.storeName || ''

  const [periods, setPeriods] = useState<PeriodData[]>([])
  const [labelInput, setLabelInput] = useState('')
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  // Load periods on mount and when storeName changes
  useEffect(() => {
    setPeriods(loadPeriods(storeName))
  }, [storeName])

  // Default label = current month
  const getDefaultLabel = useCallback(() => {
    if (labelInput) return labelInput
    const now = new Date()
    return `${now.getFullYear()}年${now.getMonth() + 1}月`
  }, [labelInput])

  const handleSave = () => {
    if (!result) return
    const label = getDefaultLabel().trim()
    if (!label) return
    const updated = savePeriod(storeName, label, result)
    setPeriods(updated)
    setLabelInput('')
  }

  const handleDelete = (label: string) => {
    const updated = deletePeriod(storeName, label)
    setPeriods(updated)
  }

  const handleClearAll = () => {
    clearPeriods(storeName)
    setPeriods([])
    setShowConfirmClear(false)
  }

  return (
    <motion.div
      className="p-6 space-y-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.h1 className="text-lg font-semibold" variants={item}>
        趋势分析
      </motion.h1>

      {/* Controls: save current period */}
      <motion.div variants={item}>
        <GlowingCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                期间管理
              </h2>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                保存不同期间的测算结果，用于趋势对比分析
              </p>
            </div>
            {periods.length > 0 && (
              <div className="flex items-center gap-2">
                {showConfirmClear ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-500">确认清空全部？</span>
                    <button
                      onClick={handleClearAll}
                      className="px-2 py-1 rounded bg-red-500 text-white text-[11px] hover:bg-red-600 transition-colors"
                    >
                      确认
                    </button>
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="px-2 py-1 rounded border border-[var(--border)] text-[11px] hover:bg-[var(--muted)] transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmClear(true)}
                    className="text-[11px] text-red-500 hover:text-red-600 transition-colors"
                  >
                    清空全部
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Period chips */}
          {periods.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {periods.map(p => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)]"
                >
                  {p.label}
                  <button
                    onClick={() => handleDelete(p.label)}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600 transition-colors text-[10px]"
                    title="删除此期间"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Save controls */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              placeholder={getDefaultLabel()}
              className="flex-1 max-w-[240px] text-xs border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--background)] focus:outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--muted-foreground)]"
            />
            <button
              onClick={handleSave}
              disabled={!result}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              保存当前测算
            </button>
          </div>
          {!result && (
            <p className="text-[11px] text-amber-500 mt-2">
              请先在测算输入页面完成数据录入后再保存
            </p>
          )}
        </GlowingCard>
      </motion.div>

      {/* Chart */}
      {periods.length > 0 ? (
        <motion.div variants={item}>
          <GlowingCard className="p-5">
            <h3 className="text-sm font-semibold mb-4">趋势图</h3>
            <TrendChart data={periods} />
          </GlowingCard>
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <GlowingCard className="p-10">
            <div className="flex flex-col items-center justify-center text-center">
              <svg
                className="w-12 h-12 text-[var(--muted-foreground)] mb-4 opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">
                暂无趋势数据
              </p>
              <p className="text-xs text-[var(--muted-foreground)] opacity-60">
                请先保存至少一个期间的测算结果，即可查看趋势图表
              </p>
            </div>
          </GlowingCard>
        </motion.div>
      )}

      {/* Detail table */}
      {periods.length > 0 && (
        <motion.div variants={item}>
          <GlowingCard className="p-5">
            <h3 className="text-sm font-semibold mb-4">明细数据</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2.5 px-3 font-medium text-[var(--muted-foreground)]">期间</th>
                    <th className="text-right py-2.5 px-3 font-medium text-[var(--muted-foreground)]">销售额</th>
                    <th className="text-right py-2.5 px-3 font-medium text-[var(--muted-foreground)]">毛利</th>
                    <th className="text-right py-2.5 px-3 font-medium text-[var(--muted-foreground)]">利润</th>
                    <th className="text-right py-2.5 px-3 font-medium text-[var(--muted-foreground)]">毛利率</th>
                    <th className="text-right py-2.5 px-3 font-medium text-[var(--muted-foreground)]">CMR</th>
                    <th className="text-right py-2.5 px-3 font-medium text-[var(--muted-foreground)]">利润率</th>
                    <th className="text-right py-2.5 px-3 font-medium text-[var(--muted-foreground)]">保本点</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p, i) => (
                    <tr
                      key={p.label}
                      className={`border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? '' : 'bg-[var(--muted)]/30'}`}
                    >
                      <td className="py-2.5 px-3 font-medium">{p.label}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatMoney(p.sales)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatMoney(p.grossProfit)}</td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatMoney(p.profit)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{pct(p.grossMarginRate)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{pct(p.cmr)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{pct(p.profitRate)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {p.breakevenSales != null ? formatMoney(p.breakevenSales) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlowingCard>
        </motion.div>
      )}
    </motion.div>
  )
}
