import { useState, useMemo, memo } from 'react'
import {
  ComposedChart, Line, ReferenceLine, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceArea,
} from 'recharts'
import type { StepChartData, StoreResult } from '../../../../shared/types/scenario'
import { buildCategorySegments } from '../../../../shared/calc/calculator'
import { useContainerSize } from '../../hooks/useContainerSize'
import { useFormatMoney } from '../../../../shell/UnitContext'
import { ChartTooltip } from '../../../../components/ui/chart-tooltip'

function fmt(n: number): string {
  return Math.round(n).toLocaleString()
}

interface Props {
  data: StepChartData
  result: Omit<StoreResult, 'stepChartData'>
}

const StepChartMulti = memo(function StepChartMulti({ data, result }: Props) {
  const [containerRef, { width, height }] = useContainerSize(500, 300)
  const [drillCategory, setDrillCategory] = useState<string | null>(null)
  const { formatMoney } = useFormatMoney()

  const catSegments = useMemo(() => buildCategorySegments(result), [result])

  const seriesSegments = useMemo(() => {
    if (!drillCategory) return []
    const cr = result.categoryResults[drillCategory]
    if (!cr) return []
    const entries = Object.entries(cr.tierResults)
      .sort(([, a], [, b]) => b.cmr - a.cmr)
    let cs = 0, cc = 0
    return entries
      .filter(([, t]) => t.sales > 0)
      .map(([name, t]) => {
        cs += t.sales; cc += t.contributionAmount
        return {
          label: name, category: cr.category, sales: t.sales,
          cumulativeSales: cs, cmr: t.cmr,
          contributionAmount: t.contributionAmount,
          cumulativeContribution: cc,
          color: data.segments.find(s => s.category === drillCategory)?.color || '#E4002B',
        }
      })
  }, [drillCategory, result, data.segments])

  const segments = drillCategory ? seriesSegments : catSegments
  const totalFC = result.totalFixedCost
  const catCommonFC = result.categoryBEP ? result.categoryBEP * result.weightedCMR : 0
  const showTwoLines = !drillCategory && catCommonFC > 0

  const chartData = useMemo(() => {
    const points: { x: number; contribution: number; label: string }[] = []
    if (segments.length === 0) return points
    points.push({ x: 0, contribution: 0, label: '0' })
    for (const seg of segments) {
      points.push({ x: seg.cumulativeSales, contribution: points[points.length - 1].contribution, label: '' })
      points.push({ x: seg.cumulativeSales, contribution: seg.cumulativeContribution, label: seg.label })
    }
    return points
  }, [segments])

  const maxX = Math.max(
    result.totalSales,
    segments.length > 0 ? segments[segments.length - 1].cumulativeSales : 0,
  ) * 1.2

  const tickFmt = (v: number) => v >= 10000 ? (v / 10000).toFixed(0) + '万' : fmt(v)

  const bepSales = useMemo(() => {
    if (totalFC <= 0) return null
    let prevCs = 0, prevCc = 0
    for (const seg of segments) {
      if (seg.cumulativeContribution >= totalFC) {
        const overshoot = totalFC - prevCc
        return seg.cmr > 0 ? Math.round(prevCs + overshoot / seg.cmr) : prevCs
      }
      prevCs = seg.cumulativeSales
      prevCc = seg.cumulativeContribution
    }
    return null
  }, [segments, totalFC])

  const categoryBands = useMemo(() => {
    if (drillCategory) return []
    const bands: { x1: number; x2: number; color: string; cat: string }[] = []
    let prev = 0
    for (const seg of catSegments) {
      bands.push({ x1: prev, x2: seg.cumulativeSales, color: seg.color, cat: seg.category })
      prev = seg.cumulativeSales
    }
    return bands
  }, [catSegments, drillCategory])

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            {drillCategory ? `${drillCategory} 系列结构` : '阶梯式累计边际贡献图（品类级）'}
          </h3>
          {drillCategory && (
            <button onClick={() => setDrillCategory(null)} className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors">
              ← 返回品类总览
            </button>
          )}
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">按 CMR 降序 · 点击品类色带下钻</span>
      </div>

      <div ref={containerRef} className="h-[280px] sm:h-[340px] lg:h-[380px]">
      <ComposedChart
        width={width} height={height}
        data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          onClick={(e) => {
            if (e?.activeLabel !== undefined && !drillCategory) {
              const x = Number(e.activeLabel)
              const band = categoryBands.find(b => x >= b.x1 && x <= b.x2)
              if (band) setDrillCategory(band.cat)
            }
          }}
        >
          {!drillCategory && categoryBands.map((b, i) => (
            <ReferenceArea key={i} x1={b.x1} x2={b.x2} fill={b.color} fillOpacity={0.05} />
          ))}

          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="x" type="number" domain={[0, maxX]} tickFormatter={tickFmt} stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={tickFmt} stroke="#94a3b8" tick={{ fontSize: 11 }} />

          {showTwoLines && (
            <ReferenceLine y={catCommonFC} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1}
              label={{ value: `品类FC ¥${formatMoney(catCommonFC)}`, position: 'right', fontSize: 10, fill: '#f59e0b' }} />
          )}
          <ReferenceLine y={totalFC} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5}
            label={{ value: showTwoLines ? `总FC ¥${formatMoney(totalFC)}` : `固定成本 ¥${formatMoney(totalFC)}`, position: 'right', fontSize: 10, fill: '#ef4444' }} />

          <ReferenceLine x={result.totalSales} stroke="#E4002B" strokeDasharray="4 3" strokeWidth={1}
            label={{ value: `当前 ¥${formatMoney(result.totalSales)}`, position: 'top', fontSize: 10, fill: '#E4002B' }} />

          <Line type="stepAfter" dataKey="contribution" stroke="#E4002B" strokeWidth={2.5}
            dot={false} name="累计边际贡献" activeDot={{ r: 5, fill: '#E4002B' }} />

          <Tooltip content={<ChartTooltip
              labelFormatter={(x) => `累计销售额 ¥${formatMoney(Number(x))}`}
              valueFormatter={(v) => `¥${formatMoney(Number(v))}`}
            />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </ComposedChart>
      </div>

      {!drillCategory && (
        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          {catSegments.map(seg => (
            <button key={seg.category} onClick={() => setDrillCategory(seg.category)}
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all hover:shadow-sm btn-press"
              style={{ borderColor: seg.color, color: seg.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
              {seg.category}
              <span className="text-[var(--text-muted)]">CMR {(seg.cmr * 100).toFixed(1)}%</span>
            </button>
          ))}
        </div>
      )}

      {bepSales && (
        <div className="mt-2 text-[11px] text-[var(--text-muted)] text-center space-x-3">
          {showTwoLines && result.categoryBEP && (
            <span>品类层BEP：<span className="font-semibold text-amber-600">¥{formatMoney(result.categoryBEP)}</span></span>
          )}
          <span>门店总BEP：<span className="font-semibold text-[var(--text-primary)]">¥{formatMoney(bepSales)}</span></span>
          <span>安全边际：{formatMoney(result.totalSales - bepSales)} 元</span>
        </div>
      )}
    </div>
  )
})

export default StepChartMulti
