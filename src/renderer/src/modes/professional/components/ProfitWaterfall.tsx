import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import type { StoreResult } from '../../../shared/types/scenario'
import { useFormatMoney } from '../../../shell/UnitContext'
import { ChartTooltip } from '../../../components/ui/chart-tooltip'

/* ---------- helpers ---------- */
function pct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

function cmrColor(v: number): string {
  if (v > 0.15) return 'text-emerald-600'
  if (v > 0.08) return 'text-amber-500'
  return 'text-red-500'
}

function smrColor(v: number | null): string {
  if (v === null) return 'text-red-500'
  if (v > 0.1) return 'text-emerald-600'
  if (v > 0) return 'text-amber-500'
  return 'text-red-500'
}

/* ---------- main component ---------- */
export default function ProfitWaterfall({ result }: { result: StoreResult }) {
  const { formatMoney } = useFormatMoney()

  const absSales = Math.abs(result.totalSales) || 1   // avoid /0

  /*
   * Waterfall bar data model:
   *   base = transparent offset (lifts the visible bar to its correct y position)
   *   value = the actual colored bar segment
   *
   * Recharts stacking: value bar renders from `base` to `base + value`.
   *   - Positive item: base = 0,  bar draws upward from 0 to value
   *   - Negative item: base = endpoint after the drop, value is negative,
   *     so bar draws downward from base to base+value (= the endpoint)
   *
   * Derived fields (totalSales − totalGrossProfit = totalVariableCost for products,
   * but we use the raw fields to stay data-driven).
   */
  const waterfallData = [
    // 1. 销售额
    { name: '销售额',   value: result.totalSales,     base: 0, fill: '#34a853' },
    // 2. 变动成本 (negative bar)
    { name: '变动成本', value: -(result.totalSales - result.totalGrossProfit), base: result.totalSales, fill: '#ea4335' },
    // 3. 毛利
    { name: '毛利',     value: result.totalGrossProfit, base: 0, fill: '#34a853' },
    // 4. 变动费用 (negative bar)
    { name: '变动费用', value: -result.totalVariableCost, base: result.totalGrossProfit, fill: '#ea4335' },
    // 5. 边际贡献
    { name: '边际贡献', value: result.contributionAmount, base: 0, fill: '#34a853' },
    // 6. 补贴
    { name: '补贴',     value: result.totalSubsidy, base: result.contributionAmount, fill: '#4285f4' },
    // 7. 贡献净额
    { name: '贡献净额', value: result.dailyContributionAmount, base: 0, fill: '#34a853' },
    // 8. 固定费用 (negative bar)
    { name: '固定费用', value: -result.totalFixedCost, base: result.dailyContributionAmount, fill: '#ea4335' },
    // 9. 利润
    { name: '利润',     value: result.profit, base: 0, fill: result.profit >= 0 ? '#34a853' : '#ea4335' },
  ].map(d => ({
    ...d,
    pctOfSales: Math.abs(d.value) / absSales,
  }))

  /* KPI summary cards */
  const kpis = [
    {
      label: '加权 CMR',
      value: pct(result.weightedCMR),
      className: cmrColor(result.weightedCMR),
    },
    {
      label: '盈亏平衡销售额',
      value: result.breakevenSales !== null
        ? `¥${formatMoney(result.breakevenSales)}`
        : '无法盈利',
      className: result.breakevenSales !== null
        ? 'text-[var(--text-primary)]'
        : 'text-red-500',
    },
    {
      label: '安全边际率',
      value: result.safetyMarginRate !== null
        ? pct(result.safetyMarginRate)
        : '—',
      className: smrColor(result.safetyMarginRate),
    },
  ]

  return (
    <div className="space-y-4">
      {/* ---- KPI summary cards ---- */}
      <div className="flex gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="flex-1 surface rounded-lg p-3">
            <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
              {kpi.label}
            </div>
            <div className={`text-lg font-bold tabular-nums ${kpi.className}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* ---- Value-driver waterfall chart ---- */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={waterfallData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#7f8d9f' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#7f8d9f' }}
            tickFormatter={(v) => `¥${formatMoney(v)}`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={(v, name) => {
                  if (name === 'base') return ''
                  const num = Number(v)
                  const d = waterfallData.find(item => Math.abs(item.value) === Math.abs(num) || item.base === num)
                  const abs = Math.abs(num)
                  const sign = num < 0 ? '-' : ''
                  if (d) return `${sign}¥${formatMoney(abs)}  (${pct(d.pctOfSales)})`
                  return `¥${formatMoney(abs)}`
                }}
              />
            }
          />
          <Legend
            verticalAlign="top"
            height={24}
            formatter={() => '价值驱动链（点击标签筛选）'}
          />

          {/* transparent base — lifts the colored bar to the right y position */}
          <Bar
            dataKey="base"
            stackId="waterfall"
            fill="transparent"
            isAnimationActive={false}
            legendType="none"
          />

          {/* colored value bar with rounded top corners */}
          <Bar
            dataKey="value"
            stackId="waterfall"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            legendType="none"
          >
            {waterfallData.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
