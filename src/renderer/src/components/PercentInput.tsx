import NumberInput, { parseNumberInput } from './NumberInput'

/**
 * 解析百分比输入文本为 0-1 小数；空/无效/科学计数法返回 null（不提交）
 *
 * 修复背景：原实现 `(parseFloat(v) || 0) / 100` 会把删除数字过程中的空输入
 * 提交为 0，导致该系列 CMR 骤变、保本点等指标异常放大。
 * 语义变化：删空不再等于清零，设为 0 需显式输入 "0"。
 */
export function parsePercentInput(v: string): number | null {
  return parseNumberInput(v, 100)
}

interface PercentInputProps {
  /** 当前值（0-1 小数） */
  value: number | null | undefined
  /** 提交 0-1 小数 */
  onChange: (v: number) => void
  className?: string
}

/**
 * 百分比输入框（显示 0-100，内部存 0-1 小数）。
 * 基于通用 NumberInput（draft 缓冲 + 空值不提交），详见 NumberInput。
 */
export default function PercentInput(props: PercentInputProps) {
  return <NumberInput {...props} scale={100} min={0} max={100} step="any" />
}
