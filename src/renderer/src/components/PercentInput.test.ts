import { describe, it, expect } from 'vitest'
import { parsePercentInput } from './PercentInput'

describe('parsePercentInput — 毛利率输入解析（修复：删空输入不再提交为 0）', () => {
  it('空输入返回 null（不提交，避免毛利率被清为 0 导致保本点异常放大）', () => {
    expect(parsePercentInput('')).toBeNull()
    expect(parsePercentInput('   ')).toBeNull()
  })

  it('正常百分比文本解析为 0-1 小数', () => {
    expect(parsePercentInput('25.4')).toBeCloseTo(0.254, 10)
    expect(parsePercentInput('0')).toBe(0)      // 显式输入 0 仍合法
    expect(parsePercentInput('100')).toBe(1)
    expect(parsePercentInput('25.')).toBeCloseTo(0.25, 10)  // 输入中途的小数点
    expect(parsePercentInput('8')).toBeCloseTo(0.08, 10)
  })

  it('无效输入返回 null（不提交，保持原值）', () => {
    expect(parsePercentInput('abc')).toBeNull()
    expect(parsePercentInput('e')).toBeNull()   // type=number 允许的科学计数法残留
    expect(parsePercentInput('-')).toBeNull()
  })

  it('科学计数法/超大数返回 null（防止 Infinity 污染模型）', () => {
    expect(parsePercentInput('1e5')).toBeNull()       // parseFloat 会解析成 100000
    expect(parsePercentInput('1e999')).toBeNull()     // parseFloat 解析成 Infinity
    expect(parsePercentInput('2.5E3')).toBeNull()
  })

  it('数值边界：负数和超过 100 按原逻辑仍可提交', () => {
    expect(parsePercentInput('-5')).toBe(-0.05)
    expect(parsePercentInput('120')).toBe(1.2)
  })
})
