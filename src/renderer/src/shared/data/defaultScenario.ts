import type { CalculationScenario } from '../types/scenario'

export const emptyScenario: CalculationScenario = {
  id: '',
  name: '',
  mode: 'single',
  storeName: '',
  storeFixedCosts: {
    venueFee: 0, operationSupport: 0, laborCost: 0,
    dailyExpense: 0, boothCost: 0,
  },
  singleCategory: {
    category: '智屏',
    data: {
      category: '智屏',
      costMode: 'modeA',
      tierNames: ['X', 'C', 'P', 'S'],
      productStructure: {
        X: { sales: 0, volume: 0, grossMargin: 0 },
        C: { sales: 0, volume: 0, grossMargin: 0 },
        P: { sales: 0, volume: 0, grossMargin: 0 },
        S: { sales: 0, volume: 0, grossMargin: 0 },
      },
      variableCosts: {
        commission: 0, annualRebate: 0, retailDiscount: 0,
        extraRebate: 0, promotionSupport: 0,
        channelIncentivePrivate: 0, channelIncentiveReferral: 0,
        salesCommission: 0, businessCommission: 0,
        extraIncentive: 0, logisticsFee: 0, promotionFee: 0,
        contractRebate: 0, channelIncentiveOnline: 0,
        commissionSales: 0, commissionBusiness: 0, retailIncentive: 0, salesGap: 0,
      },
    },
  },
}

export const defaultScenario: CalculationScenario = {
  id: 'default',
  name: '示例方案',
  mode: 'single',
  storeName: '泰阳珠晖店',
  storeFixedCosts: {
    venueFee: 17000, operationSupport: 4000, laborCost: 10000,
    dailyExpense: 2000, boothCost: 8000,
  },
  singleCategory: {
    category: '智屏',
    data: {
      category: '智屏',
      costMode: 'modeA',
      tierNames: ['X', 'C', 'P', 'S'],
      productStructure: {
        X: { sales: 30000, volume: 2, grossMargin: 0.30 },
        C: { sales: 280000, volume: 33, grossMargin: 0.22 },
        P: { sales: 240000, volume: 40, grossMargin: 0.15 },
        S: { sales: 50000, volume: 15, grossMargin: 0.08 },
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
    },
  },
}
