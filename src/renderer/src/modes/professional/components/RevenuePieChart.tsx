import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { StoreResult } from '../../../shared/types/scenario'
import { CATEGORY_COLORS } from '../../../shared/constants/categories'
import { useFormatMoney } from '../../../shell/UnitContext'
import { ChartTooltip } from '../../../components/ui/chart-tooltip'

export default function RevenuePieChart({ result }: { result: StoreResult }) {
  const { formatMoney } = useFormatMoney()
  const data = Object.entries(result.categoryResults).map(([name, cr]) => ({
    name, value: cr.totalSales, fill: CATEGORY_COLORS[name] || '#7f8d9f',
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Pie>
        <Tooltip content={<ChartTooltip valueFormatter={(v) => `¥${formatMoney(Number(v))}`} />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
