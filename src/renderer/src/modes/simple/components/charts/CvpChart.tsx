import { useMemo, memo } from 'react'
import {
  ComposedChart, Line, ReferenceLine, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { StoreResult } from '../../../../shared/types/scenario'
import { useContainerSize } from '../../hooks/useContainerSize'
import { useFormatMoney } from '../../../../shell/UnitContext'
import { ChartTooltip } from '../../../../components/ui/chart-tooltip'

function fmtShort(n: number): string {
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1) + '万'
  return Math.round(n).toLocaleString()
}

const CvpChart = memo(function CvpChart({ result }: { result: StoreResult }) {
  const [containerRef, { width, height }] = useContainerSize(500, 300)
  const { formatMoney } = useFormatMoney()

  const chartData = useMemo(() => {
    const maxX = Math.max(result.totalSales, result.breakevenSales ?? 0) * 1.3
    const steps = 40
    const points = []
    const gm = result.grossMarginRate
    const vr = result.variableCostRate
    const fc = result.totalFixedCost
    const costRate = 1 - gm + vr

    for (let i = 0; i <= steps; i++) {
      const x = (maxX / steps) * i
      points.push({
        x,
        revenue: x,
        grossProfit: x * gm,
        variableCost: x * vr,
        totalCost: fc + x * costRate,
      })
    }
    return points
  }, [result])

  const bepX = result.breakevenSales ?? 0

  const tickFmt = (v: number) => v >= 10000 ? (v / 10000).toFixed(0) + '万' : formatMoney(v)

  return (
    <div className="surface p-4 mt-4">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">量本利分析图（CVP）</h3>
      <div ref={containerRef} className="h-[280px] sm:h-[320px]">
      <ComposedChart width={width} height={height} data={chartData} margin={{ top: 15, right: 20, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="x" type="number" tickFormatter={tickFmt} stroke="#94a3b8" tick={{ fontSize: 11 }}
            label={{ value: '销售额（元）', position: 'insideBottom', offset: -3, fontSize: 11, fill: '#64748b' }} />
          <YAxis tickFormatter={tickFmt} stroke="#94a3b8" tick={{ fontSize: 11 }}
            label={{ value: '金额（元）', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#64748b' }} />

          <Line type="monotone" dataKey="revenue" stroke="#E4002B" strokeWidth={2} dot={false} name="总收入" />
          <Line type="monotone" dataKey="grossProfit" stroke="#B91C3C" strokeWidth={1} dot={false} name="毛利额" strokeDasharray="4 2" />
          <Line type="monotone" dataKey="variableCost" stroke="#10b981" strokeWidth={1.5} dot={false} name="变动费用" />
          <Line type="monotone" dataKey="totalCost" stroke="#ef4444" strokeWidth={2} dot={false} name="总成本" />

          {bepX > 0 && (
            <ReferenceLine x={bepX} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} />
          )}

          <ReferenceLine x={result.totalSales} stroke="#E4002B" strokeDasharray="4 3" strokeWidth={1} />

          <Tooltip
            content={<ChartTooltip
              labelFormatter={(x) => `销售额 ¥${formatMoney(Number(x))}`}
              valueFormatter={(v) => `¥${formatMoney(Number(v))}`}
            />}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </ComposedChart>
      </div>

      <div className="flex items-center justify-center gap-6 mt-2 text-[11px] text-[var(--text-muted)]">
        {bepX > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5" style={{ borderTop: '1.5px dashed #f59e0b' }} />
            保本点 ¥{formatMoney(bepX)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5" style={{ borderTop: '1px dashed #E4002B' }} />
          当前销售 ¥{formatMoney(result.totalSales)}
        </span>
      </div>
    </div>
  )
})

export default CvpChart
