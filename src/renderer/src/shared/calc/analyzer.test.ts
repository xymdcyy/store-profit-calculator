import { describe, it, expect } from 'vitest'
import { analyze } from './analyzer'
import { calcSingleStore } from './calculator'
import type { CategoryData, FixedCosts } from '../types/scenario'

function makeCat(overrides: Partial<CategoryData> = {}): CategoryData {
  return {
    category: '智屏',
    costMode: 'modeA',
    tierNames: ['X', 'C', 'P', 'S'],
    productStructure: {
      X: { sales: 30000, volume: 2, grossMargin: 0.30 },
      C: { sales: 280000, volume: 33, grossMargin: 0.22 },
      P: { sales: 240000, volume: 40, grossMargin: 0.15 },
      S: { sales: 50000, volume: 15, grossMargin: 0.08, subsidy: 20000 },
    },
    variableCosts: {
      commission: 0.03, annualRebate: 0.015, retailDiscount: 0.01,
      extraRebate: 0.005, promotionSupport: 0.01,
      channelIncentivePrivate: 0.008, channelIncentiveReferral: 0.005,
      salesCommission: 0.01, businessCommission: 0.005,
      extraIncentive: 0.003, logisticsFee: 0.008, promotionFee: 0.006,
      contractRebate: 0, channelIncentiveOnline: 0,
      commissionSales: 0, commissionBusiness: 0, retailIncentive: 0, salesGap: 0,
    },
    ...overrides,
  }
}

const FC: FixedCosts = { venueFee: 17000, operationSupport: 4000, laborCost: 10000, dailyExpense: 2000, boothCost: 8000 }

describe('analyze — 0 销售额系列不误报负边际贡献（bug 修复）', () => {
  it('销售额为 0 且毛利率低于变动费率的系列，不产生"边际贡献率为负"建议', () => {
    const cat = makeCat()
    // X 毛利率 0.05 < 变动费率 0.115：修复前 cmr=-0.065 被误诊
    // 注：S 系列（gm 0.08 < vr 0.115）有实际销售，其负 CMR 建议是合法输出，
    // 故此处只断言 X（0 销售额）的消息缺席
    cat.productStructure.X = { sales: 0, volume: 0, grossMargin: 0.05 }
    const r = calcSingleStore('测试店', cat, FC)
    const result = analyze(r)
    expect(result.suggestions.some(s => s.message.includes('X系列边际贡献率为负'))).toBe(false)
  })

  it('有实际销售的负 CMR 系列仍被正常诊断', () => {
    const cat = makeCat()
    cat.productStructure.S = { sales: 50000, volume: 15, grossMargin: 0.05 }
    const r = calcSingleStore('测试店', cat, FC)
    const result = analyze(r)
    expect(result.suggestions.some(s => s.message.includes('S系列边际贡献率为负'))).toBe(true)
  })
})
