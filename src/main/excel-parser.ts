/* Excel 导入解析 — 从 Python openpyxl 翻译 */

import ExcelJS from 'exceljs'

const VAR_LABEL_MAP: Record<string, string> = {
  '佣金-销代': 'commissionSales',
  '佣金-业务': 'commissionBusiness',
  '开单扣': 'commission',
  '年度返利': 'annualRebate',
  '零售折扣': 'retailDiscount',
  '销代提成': 'salesCommission',
  '业务提成': 'businessCommission',
  '追加激励': 'extraIncentive',
  '储运费': 'logisticsFee',
  '合同内返利': 'contractRebate',
  '对内': 'channelIncentiveOnline',
  '储运物流': 'retailIncentive',
  '合同外返利': 'extraRebate',
  '促销活动支持': 'promotionSupport',
  '对私': 'channelIncentivePrivate',
  '带单': 'channelIncentiveReferral',
  '促销推广费': 'promotionFee',
  '销售补差': 'salesGap',
}

const FIXED_LABEL_MAP: Record<string, string> = {
  '场地费': 'venueFee',
  '展台': 'boothCost',
  '人力成本': 'laborCost',
  '日常费用': 'dailyExpense',
  '运营支持': 'operationSupport',
}

const ALL_VAR_KEYS = [
  'commission', 'annualRebate', 'retailDiscount',
  'salesCommission', 'businessCommission', 'extraIncentive', 'logisticsFee',
  'contractRebate', 'channelIncentiveOnline',
  'commissionSales', 'commissionBusiness', 'retailIncentive',
  'extraRebate', 'promotionSupport',
  'channelIncentivePrivate', 'channelIncentiveReferral',
  'promotionFee', 'salesGap',
]

const FIXED_KEYS = ['venueFee', 'boothCost', 'laborCost', 'dailyExpense', 'operationSupport']
const ALL_CATEGORIES = new Set(['智屏', '白电', '空调', 'CIoT'])

/** 从产品结构表头行读取 C~F 列的系列名 */
function readTierNames(ws: ExcelJS.Worksheet, headerRow: number): [string, string, string, string] {
  const names: string[] = []
  for (let c = 3; c <= 6; c++) {
    const val = safeStr(ws.getCell(headerRow, c).value)
    names.push(val || `系列${c - 2}`)
  }
  return names as [string, string, string, string]
}

function safeFloat(val: any): number {
  if (val === null || val === undefined) return 0
  // Handle ExcelJS formula result objects: { formula: '...', result: number }
  if (typeof val === 'object' && 'result' in val) {
    return safeFloat(val.result)
  }
  // Handle ExcelJS shared formula objects
  if (typeof val === 'object' && 'sharedFormula' in val) {
    return 0
  }
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

/**
 * 匹配变动费用标签。
 * 两级匹配：先剥离括号内容匹配主标签（区分 '销售补差（零售折扣）' 与独立 '零售折扣' 行），
 * 未命中再按原始文本匹配（覆盖 '渠道激励（对私）' 等以括号内字样作为标签的项）。
 */
function matchVarLabel(aVal: string): string | null {
  const clean = aVal.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '')
  for (const [label, key] of Object.entries(VAR_LABEL_MAP)) {
    if (clean.includes(label)) return key
  }
  for (const [label, key] of Object.entries(VAR_LABEL_MAP)) {
    if (aVal.includes(label)) return key
  }
  return null
}

export async function parseSingleExcel(filePath: string) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  if (wb.worksheets.length === 0) throw new Error('Excel 文件为空，没有任何工作表')
  const ws = wb.worksheets[0]

  const result: any = {
    storeName: '',
    category: '智屏',
    data: {
      category: '智屏',
      costMode: 'modeA',
      productStructure: {} as Record<string, any>,
      variableCosts: {} as Record<string, number>,
    },
    storeFixedCosts: {} as Record<string, number>,
  }

  let section: string | null = null
  let tierNames: [string, string, string, string] = ['X', 'C', 'P', 'S']
  const tierSales: Record<string, number> = {}
  const tierVolume: Record<string, number> = {}
  const tierGm: Record<string, number> = {}
  const tierSubsidy: Record<string, number> = {}

  for (let r = 1; r <= ws.rowCount; r++) {
    const aVal = safeStr(ws.getCell(r, 1).value)
    const bVal = ws.getCell(r, 2).value

    if (!aVal) continue

    if (aVal.includes('门店名称')) {
      section = 'info'
      result.storeName = safeStr(bVal)
      continue
    }

    if (aVal.includes('品类') && section === 'info') {
      result.category = safeStr(bVal) || '智屏'
      result.data.category = result.category
      continue
    }

    if (section === null || section === 'info') {
      if (aVal.includes('倒扣制核算法')) {
        result.data.costMode = 'modeA'
        continue
      }
      if (aVal.includes('顺加制核算法')) {
        result.data.costMode = 'modeB'
        continue
      }
    }

    // 跳过导出文件中的 KPI 区块标签
    if (aVal.includes('关键指标')) continue
    if (aVal.includes('指标') && aVal.length <= 2) continue

    if (aVal.includes('产品结构')) {
      section = 'structure'
      // 下一行是表头，读取系列名
      tierNames = readTierNames(ws, r + 1)
      continue
    }
    if (aVal.includes('变动费用')) { section = 'variable'; continue }
    if (aVal.includes('固定费用')) { section = 'fixed'; continue }

    const skipWords = ['基于供价', '基于零售额', '经营费用', '客户费用']
    if (skipWords.some(w => aVal.includes(w))) continue

    // 跳过表头行（包含"项目"）
    if (section === 'structure' && aVal.includes('项目')) continue

    if (section === 'structure') {
      if (aVal.includes('销售额') && aVal.includes('元')) {
        for (let i = 0; i < tierNames.length; i++) {
          const val = ws.getCell(r, 3 + i).value
          if (val !== null && val !== undefined) tierSales[tierNames[i]] = safeFloat(val)
        }
      } else if (aVal.includes('销量')) {
        for (let i = 0; i < tierNames.length; i++) {
          const val = ws.getCell(r, 3 + i).value
          if (val !== null && val !== undefined) tierVolume[tierNames[i]] = Math.floor(safeFloat(val))
        }
      } else if (aVal.includes('毛利率')) {
        for (let i = 0; i < tierNames.length; i++) {
          const val = ws.getCell(r, 3 + i).value
          if (val !== null && val !== undefined) tierGm[tierNames[i]] = safeFloat(val)
        }
      } else if (aVal.includes('补贴')) {
        for (let i = 0; i < tierNames.length; i++) {
          const val = ws.getCell(r, 3 + i).value
          if (val !== null && val !== undefined) tierSubsidy[tierNames[i]] = safeFloat(val)
        }
      }
    }

    if (section === 'variable') {
      const key = matchVarLabel(aVal)
      if (key) result.data.variableCosts[key] = safeFloat(bVal)
    }

    if (section === 'fixed') {
      for (const [label, key] of Object.entries(FIXED_LABEL_MAP)) {
        if (aVal.includes(label)) {
          result.storeFixedCosts[key] = safeFloat(bVal)
          break
        }
      }
    }
  }

  result.data.tierNames = tierNames
  for (const name of tierNames) {
    result.data.productStructure[name] = {
      sales: tierSales[name] || 0,
      volume: tierVolume[name] || 0,
      grossMargin: tierGm[name] || 0,
      subsidy: tierSubsidy[name] || 0,
    }
  }

  const totalSales = Object.values(result.data.productStructure as Record<string, any>)
    .reduce((s: number, t: any) => s + t.sales, 0)
  if (totalSales <= 0) {
    throw new Error('未解析到产品结构数据')
  }

  for (const key of ALL_VAR_KEYS) {
    if (!(key in result.data.variableCosts)) result.data.variableCosts[key] = 0
  }

  if (Object.keys(result.storeFixedCosts).length === 0) {
    result.storeFixedCosts = Object.fromEntries(FIXED_KEYS.map(k => [k, 0]))
  }

  return result
}

export async function parseMultiExcel(filePath: string) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  const sheetNames = wb.worksheets.map(s => s.name)

  const result: any = {
    storeName: '',
    storeFixedCosts: {} as Record<string, number>,
    mode: 'multi',
    costMode: 'modeA',
    categories: {} as Record<string, any>,
  }

  if (sheetNames.includes('门店信息')) {
    const ws = wb.getWorksheet('门店信息')
    if (!ws) throw new Error('门店信息工作表损坏')
    let section: string | null = null
    for (let r = 1; r <= ws.rowCount; r++) {
      const aVal = safeStr(ws.getCell(r, 1).value)
      const bVal = ws.getCell(r, 2).value

      if (!aVal) continue

      if (aVal.includes('门店名称')) {
        result.storeName = safeStr(bVal)
        continue
      }
      if (aVal.includes('倒扣制核算法')) { result.costMode = 'modeA'; continue }
      if (aVal.includes('顺加制核算法')) { result.costMode = 'modeB'; continue }
      if (aVal.includes('固定费用')) { section = 'fixed'; continue }

      if (section === 'fixed') {
        for (const [label, key] of Object.entries(FIXED_LABEL_MAP)) {
          if (aVal.includes(label)) {
            result.storeFixedCosts[key] = safeFloat(bVal)
            break
          }
        }
      }
    }
  }

  for (const k of FIXED_KEYS) {
    if (!(k in result.storeFixedCosts)) result.storeFixedCosts[k] = 0
  }

  for (const name of sheetNames) {
    if (!ALL_CATEGORIES.has(name)) continue
    const ws = wb.getWorksheet(name)!
    const catData = parseCategorySheet(ws, name, result.costMode)
    if (catData) {
      // 校验该品类是否包含有效数据
      const totalSales = Object.values(catData.productStructure as Record<string, any>)
        .reduce((s: number, t: any) => s + t.sales, 0)
      if (totalSales > 0) {
        result.categories[name] = catData
      }
    }
  }

  if (Object.keys(result.categories).length === 0) {
    throw new Error('未解析到任何品类数据')
  }

  return result
}

function parseCategorySheet(ws: ExcelJS.Worksheet, categoryName: string, costMode: string) {
  const data: any = {
    category: categoryName,
    costMode,
    productStructure: {} as Record<string, any>,
    variableCosts: {} as Record<string, number>,
  }

  let section: string | null = null
  let tierNames: [string, string, string, string] = ['X', 'C', 'P', 'S']
  const tierSales: Record<string, number> = {}
  const tierVolume: Record<string, number> = {}
  const tierGm: Record<string, number> = {}
  const tierSubsidy: Record<string, number> = {}

  for (let r = 1; r <= ws.rowCount; r++) {
    const aVal = safeStr(ws.getCell(r, 1).value)
    const bVal = ws.getCell(r, 2).value

    if (!aVal) continue

    // 品类 sheet 内可能标注自己的核算模式（多品类导出为每个品类独立记录）
    if (aVal.includes('倒扣制核算法')) { data.costMode = 'modeA'; continue }
    if (aVal.includes('顺加制核算法')) { data.costMode = 'modeB'; continue }

    if (aVal.includes('产品结构')) {
      section = 'structure'
      // 下一行是表头，读取系列名
      tierNames = readTierNames(ws, r + 1)
      continue
    }
    if (aVal.includes('变动费用')) { section = 'variable'; continue }

    const skipWords = ['基于供价', '基于零售额', '经营费用', '客户费用', '基于开单价', '品类：', '关键指标', '指标', '数值']
    if (skipWords.some(w => aVal.includes(w))) continue

    // 跳过表头行（包含"项目"）
    if (section === 'structure' && aVal.includes('项目')) continue

    if (section === 'structure') {
      if (aVal.includes('销售额') && aVal.includes('元')) {
        for (let i = 0; i < tierNames.length; i++) {
          const val = ws.getCell(r, 3 + i).value
          if (val !== null && val !== undefined) tierSales[tierNames[i]] = safeFloat(val)
        }
      } else if (aVal.includes('销量')) {
        for (let i = 0; i < tierNames.length; i++) {
          const val = ws.getCell(r, 3 + i).value
          if (val !== null && val !== undefined) tierVolume[tierNames[i]] = Math.floor(safeFloat(val))
        }
      } else if (aVal.includes('毛利率')) {
        for (let i = 0; i < tierNames.length; i++) {
          const val = ws.getCell(r, 3 + i).value
          if (val !== null && val !== undefined) tierGm[tierNames[i]] = safeFloat(val)
        }
      } else if (aVal.includes('补贴')) {
        for (let i = 0; i < tierNames.length; i++) {
          const val = ws.getCell(r, 3 + i).value
          if (val !== null && val !== undefined) tierSubsidy[tierNames[i]] = safeFloat(val)
        }
      }
    }

    if (section === 'variable') {
      const key = matchVarLabel(aVal)
      if (key) data.variableCosts[key] = safeFloat(bVal)
    }
  }

  data.tierNames = tierNames
  for (const name of tierNames) {
    data.productStructure[name] = {
      sales: tierSales[name] || 0,
      volume: tierVolume[name] || 0,
      grossMargin: tierGm[name] || 0,
      subsidy: tierSubsidy[name] || 0,
    }
  }

  const totalSales = Object.values(data.productStructure as Record<string, any>)
    .reduce((s: number, t: any) => s + t.sales, 0)
  if (totalSales <= 0) return null

  for (const key of ALL_VAR_KEYS) {
    if (!(key in data.variableCosts)) data.variableCosts[key] = 0
  }

  return data
}
