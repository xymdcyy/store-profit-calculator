import type { InputMode } from '../../../shared/types/scenario'
import NumberInput from '../../../components/NumberInput'
import PercentInput from '../../../components/PercentInput'

interface Props {
  mode: InputMode
  onModeChange: (mode: InputMode) => void
  sales: number
  rate: number
  amount: number
  onRateChange: (rate: number) => void
  onAmountChange: (amount: number) => void
  label: string
}

export default function AmountRateToggle({
  mode, onModeChange, sales, rate, amount, onRateChange, onAmountChange, label,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--muted-foreground)] w-28 truncate">{label}</span>
      <div className="flex rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
        <button
          onClick={() => onModeChange('rate')}
          className={`px-2 py-1 text-[11px] font-medium ${mode === 'rate' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-[var(--muted-foreground)]'}`}
        >点位</button>
        <button
          onClick={() => onModeChange('amount')}
          className={`px-2 py-1 text-[11px] font-medium ${mode === 'amount' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-[var(--muted-foreground)]'}`}
        >金额</button>
      </div>
      {mode === 'rate' ? (
        <PercentInput
          value={rate}
          onChange={onRateChange}
          className="w-20 px-2 py-1 text-xs border border-[var(--input)] rounded-[var(--radius)] tabular-nums"
        />
      ) : (
        <NumberInput
          value={amount}
          onChange={onAmountChange}
          className="w-20 px-2 py-1 text-xs border border-[var(--input)] rounded-[var(--radius)] tabular-nums"
        />
      )}
      <span className="text-[10px] text-[var(--muted-foreground)]">{mode === 'rate' ? '%' : '元'}</span>
      <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
        ≈ {mode === 'rate' ? `¥${Math.round(rate * sales).toLocaleString()}` : `${(amount / (sales || 1) * 100).toFixed(2)}%`}
      </span>
    </div>
  )
}
