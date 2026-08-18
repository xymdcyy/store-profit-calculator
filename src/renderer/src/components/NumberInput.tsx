import { useEffect, useRef, useState } from 'react'

/**
 * 解析数字输入文本为实际值（除以 scale）；空/无效/科学计数法返回 null（不提交）
 *
 * 拒绝指数形式（'1e5'/'1e999'）：parseFloat 会把它们解析成超大数或 Infinity，
 * 一旦提交会污染计算模型（毛利率/费用率异常放大）。
 */
export function parseNumberInput(v: string, scale: number = 1): number | null {
  if (v.trim() === '') return null
  if (/[eE]/.test(v)) return null
  const n = parseFloat(v)
  return Number.isNaN(n) ? null : n / scale
}

interface NumberInputProps {
  /** 当前值（内部存储单位） */
  value: number | null | undefined
  /** 提交值（内部存储单位） */
  onChange: (v: number) => void
  className?: string
  placeholder?: string
  /** 显示 = value × scale；输入文本 ÷ scale 后提交。百分比字段传 100，金额字段默认 1 */
  scale?: number
  /** 整数字段（销量等）：提交时取整 */
  integer?: boolean
  min?: number
  max?: number
  step?: number | 'any'
}

/**
 * 数字输入框（通用 draft 缓冲版）。
 *
 * 编辑期间用本地 draft 缓冲显示文本：
 * - 输入过程不被受控 value 重置打断（'12.' 中间态保持，失焦归一）
 * - 空输入不提交（失焦自动恢复原值，不会误清为 0）
 * - 非空输入仍实时提交，保持"改数即重算"的联动体验
 * - 外部程序化覆盖 value（清空数据/导入方案）时 draft 让位，显示新值
 */
export default function NumberInput({
  value, onChange, className, placeholder, scale = 1, integer = false, min, max, step,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const prevValueRef = useRef(value)

  // 外部 value 变化（如 RESET_DATA / 导入方案）且与草稿解析值不一致时，draft 让位
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value
      if (draft !== null && parseNumberInput(draft, scale) !== value) {
        setDraft(null)
      }
    }
  }, [value, draft, scale])

  const display = draft !== null
    ? draft
    : value !== undefined && value !== null && !Number.isNaN(value)
      ? String(parseFloat((value * scale).toFixed(10)))
      : ''

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      value={display}
      onChange={e => {
        const v = e.target.value
        setDraft(v)
        const n = parseNumberInput(v, scale)
        if (n !== null) onChange(integer ? Math.round(n) : n)
      }}
      onBlur={() => setDraft(null)}
      className={className}
    />
  )
}
