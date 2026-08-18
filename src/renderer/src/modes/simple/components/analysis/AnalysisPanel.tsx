import { useMemo } from 'react'
import { useScenario } from '../../../../shared/context/ScenarioContext'
import { analyze } from '../../../../shared/calc/analyzer'
import type { Suggestion } from '../../../../shared/calc/analyzer'

const PRIORITY_STYLES: Record<string, { border: string; bg: string; dot: string }> = {
  high: { border: 'border-l-red-500', bg: 'bg-red-50/60', dot: 'bg-red-500' },
  medium: { border: 'border-l-amber-500', bg: 'bg-amber-50/60', dot: 'bg-amber-500' },
  low: { border: 'border-l-blue-500', bg: 'bg-blue-50/60', dot: 'bg-blue-500' },
}

const CATEGORY_LABELS: Record<string, string> = {
  product: '产品结构',
  cost: '费用控制',
  revenue: '收入增长',
  structure: '结构分析',
}

function SuggestionItem({ s }: { s: Suggestion }) {
  const style = PRIORITY_STYLES[s.priority]
  return (
    <div className={`border-l-[3px] rounded-r-md px-3 py-2 text-xs ${style.border} ${style.bg}`}>
      <span className="inline-block text-[10px] font-medium text-[var(--text-muted)] bg-white/80 rounded px-1.5 py-0.5 mr-2">
        {CATEGORY_LABELS[s.category]}
      </span>
      <span className="text-[var(--text-secondary)]">{s.message}</span>
    </div>
  )
}

export default function AnalysisPanel() {
  const { state } = useScenario()
  const result = state.result

  const analysis = useMemo(() => result ? analyze(result) : null, [result])

  if (!result || !analysis || result.totalSales === 0) return null

  return (
    <div className="surface p-4 mb-5">
      {/* Status bar */}
      <div className="flex items-center gap-3 mb-3">
        <span className={`inline-block w-2 h-2 rounded-full ${analysis.statusColor}`} />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {analysis.statusLabel}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">
          CMR {(result.weightedCMR * 100).toFixed(1)}% · 安全边际 {(result.safetyMarginRate !== null ? (result.safetyMarginRate * 100).toFixed(1) : '--')}%
        </span>
      </div>

      {analysis.suggestions.length > 0 ? (
        <div className="space-y-1.5">
          {analysis.suggestions.map((s, i) => (
            <SuggestionItem key={i} s={s} />
          ))}
        </div>
      ) : (
        <div className="text-xs text-[var(--text-muted)] text-center py-3">
          门店经营状况良好，暂无明显风险点
        </div>
      )}
    </div>
  )
}
