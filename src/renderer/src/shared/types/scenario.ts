/** 输入模式 */
export type InputMode = 'amount' | 'rate'

/** 变动费用核算模式 */
export type CostMode = 'modeA' | 'modeB'

/** 单个 X/C/P/S 系列数据 */
export interface TierData {
  sales: number
  volume: number
  grossMargin: number
  subsidy?: number
}

/** 变动费用（包含两种模式所有费用项，均为小数） */
export interface VariableCosts {
  commission: number
  annualRebate: number
  retailDiscount: number
  salesCommission: number
  businessCommission: number
  extraIncentive: number
  logisticsFee: number
  contractRebate: number
  channelIncentiveOnline: number
  commissionSales: number
  commissionBusiness: number
  retailIncentive: number
  extraRebate: number
  promotionSupport: number
  channelIncentivePrivate: number
  channelIncentiveReferral: number
  promotionFee: number
  salesGap: number
}

export type CostLevel = 'store' | 'category'

export interface FixedCosts {
  venueFee: number
  operationSupport: number
  laborCost: number
  dailyExpense: number
  boothCost: number
}

/** 品类数据 */
export interface CategoryData {
  category: string
  costMode: CostMode
  tierNames: [string, string, string, string]
  productStructure: Record<string, TierData>
  variableCosts: VariableCosts
  exclusiveFixedCosts?: FixedCosts
  inputMode?: InputMode
}

/** 测算方案 */
export interface CalculationScenario {
  id: string
  name: string
  mode: 'single' | 'multi'
  createdAt?: string
  updatedAt?: string
  storeName: string
  periodLabel?: string
  storeFixedCosts: FixedCosts
  sourceMode?: 'simple' | 'professional'
  singleCategory?: { category: string; data: CategoryData }
  multiCategory?: { selectedCategories: string[]; categories: Record<string, CategoryData> }
}

/** 系列计算结果 */
export interface TierResult {
  sales: number
  volume: number
  ratio: number
  grossMargin: number
  cmr: number
  contributionAmount: number
}

/** 品类计算结果 */
export interface CategoryResult {
  category: string
  totalSales: number
  totalGrossProfit: number
  totalVariableCost: number
  variableCostRate: number
  weightedCMR: number
  contributionAmount: number
  tierResults: Record<string, TierResult>
}

/** 阶梯图段 */
export interface StepSegment {
  label: string
  category: string
  sales: number
  cumulativeSales: number
  cmr: number
  contributionAmount: number
  cumulativeContribution: number
  color: string
}

export interface StepChartData {
  segments: StepSegment[]
  storeFC: number
  categoryFC?: number
  storeBEP: { sales: number; label: string } | null
  categoryBEP?: { sales: number; label: string } | null
  currentSales: number
}

/** 门店总计算结果 */
export interface StoreResult {
  totalSales: number
  totalGrossProfit: number
  totalVariableCost: number
  totalFixedCost: number
  contributionAmount: number
  totalSubsidy: number
  dailyContributionAmount: number
  dailyContributionRate: number
  profit: number
  grossMarginRate: number
  variableCostRate: number
  weightedCMR: number
  breakevenSales: number | null
  safetyMarginRate: number | null
  categoryBEP?: number | null
  categoryResults: Record<string, CategoryResult>
  stepChartData: StepChartData
}

/** 多期间趋势数据 */
export interface PeriodData {
  label: string           // e.g. "2026年1月"
  sales: number
  grossProfit: number
  variableCost: number
  fixedCost: number
  profit: number
  grossMarginRate: number
  cmr: number
  profitRate: number
  breakevenSales: number | null
}

/** CVP 数据点（财务专业模式用） */
export interface CVPDataPoint {
  sales: number
  revenue: number
  variableCost: number
  fixedCost: number
  totalCost: number
  profit: number
}

/** CVP 数据 */
export interface CVPData {
  category?: string
  level?: string
  data: CVPDataPoint[]
  breakEvenPoint?: { sales: number; revenue: number }
}
