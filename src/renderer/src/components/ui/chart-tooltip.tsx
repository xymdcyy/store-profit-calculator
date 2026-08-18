interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>
  label?: string | number
  labelFormatter?: (label: any) => string
  valueFormatter?: (value: number, name?: string) => string
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  // Filter out hidden/helper data (transparent base bars in waterfall charts)
  const visible = payload.filter(entry => !['base', '__base'].includes(entry.dataKey || ''))

  if (visible.length === 0) return null

  return (
    <div className="rounded-lg bg-gray-900 text-white shadow-xl border border-gray-800 overflow-hidden text-xs">
      {/* Label */}
      <div className="px-3 py-2 border-b border-gray-700/50 flex items-center gap-2">
        <span className="w-1 h-3 rounded-full bg-[#E4002B] flex-shrink-0" />
        <span className="text-gray-300 text-[10px] font-medium tracking-wider uppercase">
          {labelFormatter ? labelFormatter(label) : label}
        </span>
      </div>
      {/* Values */}
      <div className="px-3 py-2 space-y-1">
        {visible.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-gray-400 text-[10px]">{entry.name}</span>
            <span className="font-mono font-semibold tabular-nums">
              {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
