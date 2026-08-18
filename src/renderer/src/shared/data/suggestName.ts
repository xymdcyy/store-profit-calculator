import type { CalculationScenario } from '../types/scenario'

function formatMonth(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

/**
 * 根据当前方案数据生成推荐名称：`门店-品类/多品类-年月`（缺失段跳过）。
 *
 * 多品类判定优先看数据（multiCategory 存在即多品类），兼容 mode 字段未同步的场景。
 *
 * @param scenario 当前方案
 * @param now 用于生成月份，默认当前时间（可注入便于测试）
 */
export function buildSuggestedName(scenario: CalculationScenario, now: Date = new Date()): string {
  const store = scenario.storeName?.trim() || ''
  const month = formatMonth(now)

  const isMulti = !!scenario.multiCategory?.categories
  const scope = isMulti
    ? '多品类'
    : scenario.singleCategory?.data?.category?.trim() || ''

  return [store, scope, month].filter(Boolean).join('-')
}
