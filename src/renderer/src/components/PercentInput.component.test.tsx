import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import PercentInput from './PercentInput'

afterEach(cleanup)

/** 模拟真实父组件：onChange 提交后立即回写 value；rerender(v) 可模拟外部覆盖 */
function renderControlled(initial: number) {
  let current = initial
  const onChange = vi.fn((n: number) => { current = n })
  const view = render(<PercentInput value={current} onChange={onChange} />)
  const rerender = (v?: number) => {
    if (v !== undefined) current = v
    view.rerender(<PercentInput value={current} onChange={onChange} />)
  }
  return { input: () => screen.getByRole('spinbutton') as HTMLInputElement, onChange, rerender }
}

describe('PercentInput 组件 — 编辑状态机（修复：删空不再提交为 0）', () => {
  it('删空后失焦：不提交（onChange 不被调用），显示恢复原值', () => {
    const { input, onChange } = renderControlled(0.22)

    fireEvent.change(input(), { target: { value: '' } })
    expect(onChange).not.toHaveBeenCalled()   // 空输入不提交
    expect(input().value).toBe('')            // 编辑中保持为空

    fireEvent.blur(input())
    expect(input().value).toBe('22')          // 失焦恢复原值 22%
  })

  it('输入数字实时提交，失焦后保持显示', () => {
    const { input, onChange, rerender } = renderControlled(0.22)

    fireEvent.change(input(), { target: { value: '50' } })
    expect(onChange).toHaveBeenCalledWith(0.5)   // 50% → 0.5 实时提交

    rerender()  // 父组件回写 value=0.5
    fireEvent.blur(input())
    expect(input().value).toBe('50')
  })

  it('显式输入 0 仍可提交为 0（清零语义保留）', () => {
    const { input, onChange } = renderControlled(0.22)
    fireEvent.change(input(), { target: { value: '0' } })
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('外部程序化覆盖 value（清空数据/导入）时 draft 让位，显示新值', () => {
    const { input, onChange, rerender } = renderControlled(0.22)

    fireEvent.change(input(), { target: { value: '35' } })   // 用户输入 35%（已提交 0.35）
    expect(onChange).toHaveBeenCalledWith(0.35)

    rerender(0)  // 外部把值重置为 0
    expect(input().value).toBe('0')   // 陈旧草稿 "35" 失效
  })

  it('用户输入回写值一致时不打断草稿（正常联动场景）', () => {
    const { input, onChange, rerender } = renderControlled(0.22)

    fireEvent.change(input(), { target: { value: '35' } })
    rerender()  // 父组件回写 0.35，与草稿解析值一致
    expect(input().value).toBe('35')   // 草稿继续有效，不被打断
  })
})
