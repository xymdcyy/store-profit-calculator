import type { CostMode } from '../../../shared/types/scenario'

export const MODE_LABELS: Record<CostMode, string> = {
  modeA: '倒扣制核算法',
  modeB: '顺加制核算法',
}

/** 模式 A 变动费用分组 */
export const MODE_A = {
  groups: [
    {
      title: '基于供价的资源投入-客户费用',
      items: [
        { key: 'commission', label: '1、开单扣' },
        { key: 'annualRebate', label: '2、年度返利' },
        { key: 'retailDiscount', label: '3、零售折扣' },
      ],
    },
    {
      title: '基于实际零售额客户费用投入',
      items: [
        { key: 'extraRebate', label: '合同外返利' },
        { key: 'promotionSupport', label: '促销活动支持' },
      ],
    },
    {
      title: '基于零售额的经营费用投入',
      items: [
        { key: 'channelIncentivePrivate', label: '1、渠道激励（对私）' },
        { key: 'channelIncentiveReferral', label: '2、渠道激励（带单）' },
        { key: 'salesCommission', label: '3、销代提成' },
        { key: 'businessCommission', label: '4、业务提成' },
        { key: 'extraIncentive', label: '5、追加激励' },
        { key: 'logisticsFee', label: '6、储运费' },
        { key: 'promotionFee', label: '7、促销推广费' },
      ],
    },
  ],
}

/** 模式 B 变动费用分组 */
export const MODE_B = {
  groups: [
    {
      title: '基于开单价客户费用投入',
      items: [
        { key: 'contractRebate', label: '1、合同内返利' },
        { key: 'extraRebate', label: '2、合同外返利' },
        { key: 'promotionSupport', label: '3、促销活动支持' },
        { key: 'salesGap', label: '4、销售补差（零售折扣）' },
      ],
    },
    {
      title: '基于开单价经营费用投入',
      items: [
        { key: 'channelIncentivePrivate', label: '1、渠道激励（对私）' },
        { key: 'channelIncentiveReferral', label: '2、渠道激励（带单）' },
        { key: 'channelIncentiveOnline', label: '3、渠道激励（对内）' },
        { key: 'commissionSales', label: '4、佣金-销代提成' },
        { key: 'commissionBusiness', label: '5、佣金-业务提成' },
        { key: 'retailIncentive', label: '6、储运物流' },
        { key: 'promotionFee', label: '7、促销推广费' },
      ],
    },
  ],
}

/** 获取指定模式的费用分组 */
export function getCostGroups(mode: CostMode) {
  return mode === 'modeA' ? MODE_A.groups : MODE_B.groups
}

/** 各模式专属的变动费用 key（不在集合内的为两模式共享项） */
export const MODE_A_ONLY_KEYS = new Set([
  'commission', 'annualRebate', 'retailDiscount',
  'salesCommission', 'businessCommission', 'extraIncentive', 'logisticsFee',
])
export const MODE_B_ONLY_KEYS = new Set([
  'contractRebate', 'salesGap', 'channelIncentiveOnline',
  'commissionSales', 'commissionBusiness', 'retailIncentive',
])

/**
 * 按核算模式过滤变动费用（返回费率合计）
 * 模式切换时另一模式专属的费用项仍保留在数据中（不丢失），但计入费率时排除，
 * 避免倒扣制/顺加制两套费用池被重复计算。
 */
export function sumVariableCostsByMode(
  vc: Record<string, number>,
  mode?: CostMode,
): number {
  const entries = Object.entries(vc)
  const filtered = mode === 'modeA'
    ? entries.filter(([k]) => !MODE_B_ONLY_KEYS.has(k))
    : mode === 'modeB'
      ? entries.filter(([k]) => !MODE_A_ONLY_KEYS.has(k))
      : entries
  return filtered.reduce((s, [, v]) => s + (Number(v) || 0), 0)
}

/** 创建空变动费用（全 0） */
export function emptyVariableCosts() {
  return {
    commission: 0, annualRebate: 0, retailDiscount: 0,
    salesCommission: 0, businessCommission: 0,
    extraIncentive: 0, logisticsFee: 0,
    contractRebate: 0, channelIncentiveOnline: 0,
    commissionSales: 0, commissionBusiness: 0, retailIncentive: 0,
    extraRebate: 0, promotionSupport: 0,
    channelIncentivePrivate: 0, channelIncentiveReferral: 0,
    promotionFee: 0, salesGap: 0,
  }
}

/** 模式 A 默认变动费用 */
export const DEFAULT_VR_MODE_A = {
  ...emptyVariableCosts(),
  commission: 0.03, annualRebate: 0.015, retailDiscount: 0.01,
  extraRebate: 0.005, promotionSupport: 0.01,
  channelIncentivePrivate: 0.008, channelIncentiveReferral: 0.005,
  salesCommission: 0.01, businessCommission: 0.005,
  extraIncentive: 0.003, logisticsFee: 0.008, promotionFee: 0.006,
}

/** 模式 B 默认变动费用 */
export const DEFAULT_VR_MODE_B = {
  ...emptyVariableCosts(),
  contractRebate: 0.03, extraRebate: 0.02, promotionSupport: 0.005,
  salesGap: 0.01,
  channelIncentivePrivate: 0.008, channelIncentiveReferral: 0.005,
  channelIncentiveOnline: 0.002,
  commissionSales: 0.015, commissionBusiness: 0.008,
  retailIncentive: 0.005, promotionFee: 0.006,
}
