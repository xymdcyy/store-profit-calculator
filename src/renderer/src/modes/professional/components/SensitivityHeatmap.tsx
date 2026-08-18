import { motion } from 'framer-motion'
import { useFormatMoney } from '../../../shell/UnitContext'
import type { SensitivityMatrix } from '../../../shared/calc/sensitivity'

interface Props {
  matrix: SensitivityMatrix
}

/** 根据状态和利润大小返回背景色 */
function cellBg(status: 'profit' | 'loss' | 'breakeven', intensity: number): string {
  if (status === 'breakeven') return 'bg-yellow-50 text-yellow-800'
  if (status === 'loss') {
    if (intensity > 0.8) return 'bg-red-100 text-red-900'
    if (intensity > 0.4) return 'bg-red-50 text-red-800'
    return 'bg-red-50/60 text-red-700'
  }
  // profit
  if (intensity > 0.8) return 'bg-emerald-100 text-emerald-900'
  if (intensity > 0.4) return 'bg-emerald-50 text-emerald-800'
  return 'bg-emerald-50/60 text-emerald-700'
}

/** 格式化百分点显示 */
function pp(v: number): string {
  return v > 0 ? `+${v}pp` : `${v}pp`
}

/** 格式化百分比显示 */
function pct(v: number): string {
  return v > 0 ? `+${v}%` : `${v}%`
}

export default function SensitivityHeatmap({ matrix }: Props) {
  const { formatMoney } = useFormatMoney()
  const { salesChanges, cmrChanges, cells, baseProfit } = matrix

  // 计算最大绝对利润，用于归一化色阶强度
  let maxAbsProfit = 0
  for (const row of cells) {
    for (const c of row) {
      if (Math.abs(c.profit) > maxAbsProfit) maxAbsProfit = Math.abs(c.profit)
    }
  }
  const norm = maxAbsProfit > 0 ? maxAbsProfit : 1

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                className="px-3 py-2 text-left font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]"
                rowSpan={2}
              >
                销售额变动
              </th>
              <th
                className="px-3 py-2 text-center font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]"
                colSpan={cmrChanges.length}
              >
                综合扣率（CMR）变动
              </th>
            </tr>
            <tr>
              {cmrChanges.map(c => (
                <th
                  key={c}
                  className="px-3 py-2 text-center font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] min-w-[100px]"
                >
                  {pp(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {salesChanges.map((sChange, si) => (
              <motion.tr
                key={sChange}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: si * 0.08 }}
              >
                <td className="px-3 py-2 font-semibold text-[var(--foreground)] border-b border-[var(--border)] whitespace-nowrap">
                  {pct(sChange)}
                </td>
                {cmrChanges.map((cChange, ci) => {
                  const cell = cells[si][ci]
                  const isBase = sChange === 0 && cChange === 0
                  const intensity = Math.abs(cell.profit) / norm

                  return (
                    <td
                      key={cChange}
                      className={`
                        px-2 py-2.5 text-center border-b border-[var(--border)]
                        transition-colors duration-200
                        ${cellBg(cell.status, intensity)}
                        ${isBase ? 'ring-2 ring-[var(--primary)] ring-inset font-bold' : ''}
                      `}
                    >
                      <div className="font-semibold tabular-nums">
                        {formatMoney(cell.profit)}
                      </div>
                      <div className="text-[10px] opacity-75 tabular-nums mt-0.5">
                        {(cell.profitRate * 100).toFixed(1)}%
                      </div>
                    </td>
                  )
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-4 text-[10px] text-[var(--muted-foreground)]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />
          盈利
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-200" />
          亏损
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-yellow-50 border border-yellow-200" />
          盈亏平衡
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2 border-[var(--primary)]" />
          基准情景
        </div>
        <span className="ml-auto">颜色深度 = 利润绝对值大小</span>
      </div>
    </div>
  )
}
