import { describe, it, expect } from 'vitest'
import { calcSingleStore, calcCategory, sumVariableCosts } from './calculator'
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

describe('sumVariableCosts — 按核算模式过滤（F13）', () => {
  const both = {
    commission: 0.03, contractRebate: 0.02,  // modeA/modeB 专属各一
    extraRebate: 0.01,                       // 共享项
  }

  it('modeA 排除 modeB 专属项，保留共享项', () => {
    expect(sumVariableCosts(both, 'modeA')).toBeCloseTo(0.03 + 0.01, 10)
  })

  it('modeB 排除 modeA 专属项，保留共享项', () => {
    expect(sumVariableCosts(both, 'modeB')).toBeCloseTo(0.02 + 0.01, 10)
  })

  it('不传模式时汇总全部（兼容旧调用）', () => {
    expect(sumVariableCosts(both)).toBeCloseTo(0.06, 10)
  })
})

describe('保本点公式纳入补贴 BEP=(FC-subsidy)/CMR（F1）', () => {
  it('补贴计入保本点：净固定费用为分母', () => {
    const cat = makeCat()
    const r = calcSingleStore('测试店', cat, FC)
    // vr = 0.115（modeA 全部可见项）
    const totalSales = 600000
    const weightedCMR = (30000/600000)*(0.30-0.115) + (280000/600000)*(0.22-0.115)
      + (240000/600000)*(0.15-0.115) + (50000/600000)*(0.08-0.115)
    const subsidy = 20000
    const netFC = 41000 - subsidy
    expect(r.breakevenSales).toBeCloseTo(netFC / weightedCMR, 6)
    // 修复前是 41000/weightedCMR，修复后应显著更小
    expect(r.breakevenSales!).toBeLessThan(41000 / weightedCMR)
  })

  it('补贴 ≥ 固定费用时保本点为 0（已保本）', () => {
    const cat = makeCat()
    // S 类补贴足够大
    cat.productStructure.S = { sales: 50000, volume: 15, grossMargin: 0.08, subsidy: 50000 }
    const r = calcSingleStore('测试店', cat, FC)
    expect(r.breakevenSales).toBe(0)
    expect(r.safetyMarginRate).toBe(1)
  })
})

describe('0 销售额系列的边际贡献（bug 修复）', () => {
  it('销售额为 0 的系列：cmr 归零（不再显示负值）、贡献额为 0、占比为 0', () => {
    const cat = makeCat()
    // X 毛利率 0.05 < 变动费率 0.115，修复前 cmr = -0.065
    cat.productStructure.X = { sales: 0, volume: 0, grossMargin: 0.05 }
    const { tierResults } = calcCategory(cat)
    expect(tierResults.X.cmr).toBe(0)
    expect(tierResults.X.contributionAmount).toBe(0)
    expect(tierResults.X.ratio).toBe(0)
  })

  it('有销售额的系列 cmr 保持数学值（gm - vr），不受 0 销售额系列影响', () => {
    const cat = makeCat()
    cat.productStructure.X = { sales: 0, volume: 0, grossMargin: 0.05 }
    const { tierResults, result } = calcCategory(cat)
    expect(tierResults.C.cmr).toBeCloseTo(0.22 - 0.115, 10)
    expect(tierResults.C.contributionAmount).toBeCloseTo(280000 * (0.22 - 0.115), 10)
    expect(result.contributionAmount).toBeCloseTo(
      (280000 * (0.22 - 0.115)) + (240000 * (0.15 - 0.115)) + (50000 * (0.08 - 0.115)),
      6)
  })

  it('全部系列销售额为 0 时加权 CMR 为 0', () => {
    const cat = makeCat()
    for (const k of Object.keys(cat.productStructure)) {
      cat.productStructure[k] = { ...cat.productStructure[k], sales: 0 }
    }
    const { result } = calcCategory(cat)
    expect(result.weightedCMR).toBe(0)
    expect(result.contributionAmount).toBe(0)
  })
})
