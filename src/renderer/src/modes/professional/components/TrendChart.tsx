import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import type { PeriodData } from '../../../shared/types/scenario'
import { useFormatMoney } from '../../../shell/UnitContext'
import { ChartTooltip } from '../../../components/ui/chart-tooltip'

interface TrendChartProps {
  data: PeriodData[]
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

export default function TrendChart({ data }: TrendChartProps) {
  const { formatMoney } = useFormatMoney()

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#7f8d9f' }}
          axisLine={false}
          tickLine={false}
        />
        {/* Left Y axis: Sales & Profit */}
        <YAxis
          yAxisId="money"
          tick={{ fontSize: 11, fill: '#7f8d9f' }}
          tickFormatter={(v) => formatMoney(v)}
          axisLine={false}
          tickLine={false}
        />
        {/* Right Y axis: Percentage */}
        <YAxis
          yAxisId="pct"
          orientation="right"
          tick={{ fontSize: 11, fill: '#7f8d9f' }}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          domain={[0, 'auto']}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={
            <ChartTooltip
              valueFormatter={(v, name) => {
                if (name === '毛利率' || name === 'CMR') return pct(v)
                return `¥${formatMoney(v)}`
              }}
            />
          }
        />
        <Legend
          verticalAlign="top"
          height={28}
          formatter={(value) => {
            if (value === '毛利率' || value === 'CMR') return `${value}`
            return value
          }}
        />

        {/* Reference line at y=0 for profit axis */}
        <ReferenceLine yAxisId="money" y={0} stroke="var(--border)" strokeDasharray="3 3" />

        {/* Sales bars */}
        <Bar
          yAxisId="money"
          dataKey="sales"
          name="销售额"
          fill="rgba(66, 133, 244, 0.25)"
          stroke="rgba(66, 133, 244, 0.5)"
          strokeWidth={1}
          radius={[4, 4, 0, 0]}
          barSize={32}
        />

        {/* Profit bars (color based on sign) */}
        <Bar
          yAxisId="money"
          dataKey="profit"
          name="利润"
          radius={[4, 4, 0, 0]}
          barSize={24}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.profit >= 0 ? 'rgba(52, 168, 83, 0.6)' : 'rgba(234, 67, 53, 0.6)'} />
          ))}
        </Bar>

        {/* Gross margin rate line */}
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="grossMarginRate"
          name="毛利率"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />

        {/* CMR line */}
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="cmr"
          name="CMR"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
