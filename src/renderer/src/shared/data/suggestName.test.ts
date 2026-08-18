import { describe, it, expect } from 'vitest'
import { buildSuggestedName } from './suggestName'
import { defaultScenario, emptyScenario } from './defaultScenario'
import type { CalculationScenario } from '../types/scenario'

const NOW = new Date('2026-08-12')

function multiScenario(storeName: string): CalculationScenario {
  return {
    ...defaultScenario,
    storeName,
    mode: 'multi',
    multiCategory: {
      selectedCategories: ['智屏', '白电'],
      categories: {},
    },
  }
}

describe('buildSuggestedName — 方案推荐命名', () => {
  it('单品类：门店-品类-年月', () => {
    expect(buildSuggestedName(defaultScenario, NOW)).toBe('泰阳珠晖店-智屏-2026-08')
  })

  it('多品类：门店-多品类-年月', () => {
    expect(buildSuggestedName(multiScenario('阳江雨田广场店'), NOW)).toBe('阳江雨田广场店-多品类-2026-08')
  })

  it('多品类由 multiCategory 数据判定（兼容 mode 未同步的场景）', () => {
    const s = { ...multiScenario('测试店'), mode: 'single' as const }
    expect(buildSuggestedName(s, NOW)).toBe('测试店-多品类-2026-08')
  })

  it('无门店名时跳过门店段', () => {
    expect(buildSuggestedName({ ...emptyScenario, storeName: '' }, NOW)).toBe('智屏-2026-08')
    expect(buildSuggestedName(multiScenario(''), NOW)).toBe('多品类-2026-08')
  })

  it('门店名首尾空白被清理', () => {
    expect(buildSuggestedName({ ...defaultScenario, storeName: '  泰阳珠晖店  ' }, NOW)).toBe('泰阳珠晖店-智屏-2026-08')
  })
})
