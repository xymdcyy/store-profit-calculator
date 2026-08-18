import { useMemo, memo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, LabelList, Cell,
} from 'recharts'
import { useContainerSize } from '../../hooks/useContainerSize'
import { useFormatMoney } from '../../../../shell/UnitContext'
import { ChartTooltip } from '../../../../components/ui/chart-tooltip'
import type { StepChartData } from '../../../../shared/types/scenario'

function fmtShort(n: number): string {
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1) + '万'
  return Math.round(n).toLocaleString()
}

/** 基于 CMR 给贡献柱着色 */
function cmrColor(cmr: number): string {
  if (cmr >= 0.10) return '#22c55e'
  if (cmr >= 0.03) return '#f59e0b'
  if (cmr >= 0) return '#f97316'
  return '#ef4444'
}

const ContributionBarChart = memo(function ContributionBarChart({ data }: { data: StepChartData }) {
  const [containerRef, { width, height }] = useContainerSize(500, 300)
  const { formatMoney } = useFormatMoney()

  const chartData = useMemo(() => {
    return data.segments
      .filter(s => s.sales > 0)
      .map(s => ({
        name: s.label,
        sales: s.sales,
        contribution: s.contributionAmount,
        cmr: s.cmr,
        cmrLabel: (s.cmr * 100).toFixed(1) + '%',
      }))
  }, [data.segments])

  const maxY = useMemo(() => {
    if (chartData.length === 0) return data.storeFC * 1.5
    const maxVal = Math.max(
      ...chartData.map(d => Math.max(d.sales, Math.abs(d.contribution))),
      data.storeFC,
    )
    return maxVal * 1.2
  }, [chartData, data.storeFC])

  const tickFmt = (v: number) => fmtShort(v)

  return (
    <div className="surface p-4">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
        系列边际贡献分析
      </h3>

      <div ref={containerRef} className="h-[280px] sm:h-[300px]">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-[var(--text-muted)]">
            暂无数据
          </div>
        ) : (
          <BarChart
            width={width} height={height}
            data={chartData}
            margin={{ top: 25, right: 30, left: 10, bottom: 10 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              tick={{ fontSize: 12, fontWeight: 600 }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tickFormatter={tickFmt}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              width={60}
            />

            <ReferenceLine
              y={data.storeFC}
              stroke="#ef4444"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `固定成本 ¥${fmtShort(data.storeFC)}`,
                position: 'right',
                fontSize: 10,
                fill: '#ef4444',
              }}
            />

            <Bar dataKey="sales" name="销售额" fill="#E4002B" radius={[3, 3, 0, 0]}>
              <LabelList
                dataKey="sales"
                position="top"
                formatter={(v: number) => fmtShort(v)}
                style={{ fontSize: 10, fill: '#E4002B', fontWeight: 500 }}
              />
            </Bar>

            <Bar dataKey="contribution" name="边际贡献" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={cmrColor(entry.cmr)} />
              ))}
              <LabelList
                dataKey="cmrLabel"
                position="top"
                style={{ fontSize: 10, fontWeight: 700 }}
              />
            </Bar>

            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={<ChartTooltip
                labelFormatter={(label) => `系列 ${label}`}
                valueFormatter={(v) => `¥${formatMoney(Number(v))}`}
              />}
            />
          </BarChart>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#E4002B' }} />
          销售额
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} />
          边际贡献
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span className="inline-block w-4 border-t border-dashed border-red-500" />
          固定成本
        </div>
      </div>

      {data.storeBEP && (
        <div className="mt-2 text-[11px] text-[var(--text-muted)] text-center">
          盈亏平衡点：
          <span className="font-semibold text-[var(--text-primary)]">¥{formatMoney(data.storeBEP.sales)}</span>
          <span className="mx-1">·</span>
          安全边际：{formatMoney(data.currentSales - data.storeBEP.sales)} 元
        </div>
      )}
      {!data.storeBEP && (
        <div className="mt-2 text-[11px] text-red-500 text-center font-medium">
          加权边际贡献率 ≤ 0，该门店在当前产品结构和费用下无法盈利
        </div>
      )}
    </div>
  )
})

export default ContributionBarChart
