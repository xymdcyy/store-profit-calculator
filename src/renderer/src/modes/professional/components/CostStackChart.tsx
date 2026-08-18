import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { StoreResult } from '../../../shared/types/scenario'
import { useFormatMoney } from '../../../shell/UnitContext'
import { ChartTooltip } from '../../../components/ui/chart-tooltip'

export default function CostStackChart({ result }: { result: StoreResult }) {
  const { formatMoney } = useFormatMoney()
  const data = Object.entries(result.categoryResults).map(([name, cr]) => ({
    name, 变动费用: cr.totalVariableCost, 固定费用: result.totalFixedCost,
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7f8d9f' }} />
        <YAxis tick={{ fontSize: 11, fill: '#7f8d9f' }} tickFormatter={(v) => `¥${formatMoney(v)}`} />
        <Tooltip content={<ChartTooltip valueFormatter={(v) => `¥${formatMoney(Number(v))}`} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="变动费用" stackId="a" fill="#ea4335" radius={[0, 0, 0, 0]} />
        <Bar dataKey="固定费用" stackId="a" fill="#fbbc05" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
