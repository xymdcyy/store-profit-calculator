/* Excel 模板生成 — 从 Python openpyxl 翻译 */

/// <reference types="node" />

import ExcelJS from 'exceljs'

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' },
}

function hdrFont(): Partial<ExcelJS.Font> {
  return { name: '微软雅黑', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
}

function hdrFill(): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
}

function secFont(): Partial<ExcelJS.Font> {
  return { name: '微软雅黑', size: 11, bold: true, color: { argb: 'FF2563EB' } }
}

function valFont(): Partial<ExcelJS.Font> {
  return { name: '微软雅黑', size: 10 }
}

function muteFont(): Partial<ExcelJS.Font> {
  return { name: '微软雅黑', size: 9, color: { argb: 'FF666666' } }
}

function centerAlign(): Partial<ExcelJS.Alignment> {
  return { horizontal: 'center', vertical: 'middle' }
}

function leftAlign(): Partial<ExcelJS.Alignment> {
  return { horizontal: 'left', vertical: 'middle' }
}

function styleHeader(ws: ExcelJS.Worksheet, r: number, cols: number) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(r, c)
    cell.font = hdrFont()
    cell.fill = hdrFill()
    cell.alignment = centerAlign()
    cell.border = BORDER_THIN
  }
}

function writeProductStructure(
  ws: ExcelJS.Worksheet,
  startRow: number,
  tierNames: [string, string, string, string] = ['X', 'C', 'P', 'S'],
): number {
  let r = startRow
  ws.getCell(r, 1).value = '产品结构'
  ws.getCell(r, 1).font = secFont()
  r++

  const headers = ['项目', '合计', tierNames[0], tierNames[1], tierNames[2], tierNames[3]]
  for (let c = 0; c < headers.length; c++) {
    ws.getCell(r, c + 1).value = headers[c]
  }
  styleHeader(ws, r, headers.length)
  r++

  const rows: Array<[string, string, string | null]> = [
    ['销售额（元）', '#,##0', null],
    ['销量', '0', null],
    ['毛利率', '0.00%', null],
    ['总部补贴（元）', '#,##0', null],
  ]

  for (const [label, fmt] of rows) {
    ws.getCell(r, 1).value = label
    ws.getCell(r, 1).font = valFont()
    ws.getCell(r, 1).border = BORDER_THIN
    ws.getCell(r, 1).alignment = leftAlign()
    for (let c = 2; c <= 6; c++) {
      const cell = ws.getCell(r, c)
      cell.font = valFont()
      cell.border = BORDER_THIN
      cell.numFmt = fmt
      if (c === 2 && ['销售额（元）', '销量', '总部补贴（元）'].includes(label)) {
        cell.value = { formula: `C${r}+D${r}+E${r}+F${r}` }
      } else if (c === 2 && label === '毛利率') {
        cell.value = {
          formula: `IF(C${r - 2}+D${r - 2}+E${r - 2}+F${r - 2}>0,(C${r - 2}*C${r}+D${r - 2}*D${r}+E${r - 2}*E${r}+F${r - 2}*F${r})/(C${r - 2}+D${r - 2}+E${r - 2}+F${r - 2}),"")`
        }
      }
    }
    r++
  }
  return r
}

const MODE_A_ITEMS: Array<{ group: string; items: string[] }> = [
  { group: '基于供价的资源投入-客户费用', items: ['1、开单扣', '2、年度返利', '3、零售折扣'] },
  { group: '基于实际零售额客户费用投入', items: ['合同外返利', '促销活动支持'] },
  {
    group: '基于零售额的经营费用投入',
    items: [
      '1、渠道激励（对私）', '2、渠道激励（带单）',
      '3、销代提成', '4、业务提成', '5、追加激励',
      '6、储运费', '7、促销推广费',
    ],
  },
]

const MODE_B_ITEMS: Array<{ group: string; items: string[] }> = [
  {
    group: '基于开单价客户费用投入',
    items: ['1、合同内返利', '2、合同外返利', '3、促销活动支持', '4、销售补差（零售折扣）'],
  },
  {
    group: '基于开单价经营费用投入',
    items: [
      '1、渠道激励（对私）', '2、渠道激励（带单）', '3、渠道激励（对内）',
      '4、佣金-销代提成', '5、佣金-业务提成', '6、储运物流', '7、促销推广费',
    ],
  },
]

function writeVariableCosts(
  ws: ExcelJS.Worksheet,
  startRow: number,
  costItems: Array<{ group: string; items: string[] }>,
): number {
  let r = startRow
  r++
  ws.getCell(r, 1).value = '变动费用（点位%，如 3% 填 0.03）'
  ws.getCell(r, 1).font = secFont()
  r++

  for (const { group, items } of costItems) {
    ws.getCell(r, 1).value = group
    ws.getCell(r, 1).font = muteFont()
    r++
    for (const item of items) {
      ws.getCell(r, 1).value = item
      ws.getCell(r, 1).font = valFont()
      ws.getCell(r, 1).border = BORDER_THIN
      const cell = ws.getCell(r, 2)
      cell.font = valFont()
      cell.border = BORDER_THIN
      cell.numFmt = '0.00%'
      r++
    }
  }
  return r
}

function writeFixedCosts(ws: ExcelJS.Worksheet, startRow: number): number {
  let r = startRow
  r++
  ws.getCell(r, 1).value = '固定费用（元/月）'
  ws.getCell(r, 1).font = secFont()
  r++
  for (const item of ['场地费', '展台', '人力成本', '日常费用', '运营支持']) {
    ws.getCell(r, 1).value = item
    ws.getCell(r, 1).font = valFont()
    ws.getCell(r, 1).border = BORDER_THIN
    const cell = ws.getCell(r, 2)
    cell.font = valFont()
    cell.border = BORDER_THIN
    cell.numFmt = '#,##0'
    r++
  }
  return r
}

function setColumnWidths(ws: ExcelJS.Worksheet) {
  ws.getColumn(1).width = 30
  ws.getColumn(2).width = 18
  for (const col of ['C', 'D', 'E', 'F']) {
    ws.getColumn(col).width = 14
  }
}

export async function generateTemplate(
  costMode: 'modeA' | 'modeB',
  tierNames: [string, string, string, string] = ['X', 'C', 'P', 'S'],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('测算数据')
  const costItems = costMode === 'modeA' ? MODE_A_ITEMS : MODE_B_ITEMS
  const modeLabel = costMode === 'modeA' ? '倒扣制核算法' : '顺加制核算法'

  let r = 1
  ws.getCell(r, 1).value = '门店名称'
  ws.getCell(r, 1).font = { name: '微软雅黑', size: 10, bold: true }
  ws.getCell(r, 2).font = valFont()
  r++

  ws.getCell(r, 1).value = '品类'
  ws.getCell(r, 1).font = { name: '微软雅黑', size: 10, bold: true }
  ws.getCell(r, 2).font = valFont()
  ;(ws as any).dataValidations.add(`B${r}`, { type: 'list', formulae: ['"智屏,白电,空调,CIoT"'] })
  r++

  ws.getCell(r, 1).value = `核算模式：${modeLabel}`
  ws.getCell(r, 1).font = muteFont()
  r += 2

  r = writeProductStructure(ws, r, tierNames)
  r = writeVariableCosts(ws, r, costItems)
  r = writeFixedCosts(ws, r)
  setColumnWidths(ws)

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer
}

/* ── Export (fill data into same template format) ── */

function writeProductStructureFilled(
  ws: ExcelJS.Worksheet,
  startRow: number,
  tiers: Record<string, { sales: number; volume: number; grossMargin: number; subsidy?: number }>,
  tierNames?: [string, string, string, string],
): number {
  const names = tierNames || (Object.keys(tiers) as [string, string, string, string])
  let r = startRow
  ws.getCell(r, 1).value = '产品结构'
  ws.getCell(r, 1).font = secFont()
  r++

  const headers = ['项目', '合计', names[0], names[1], names[2], names[3]]
  for (let c = 0; c < headers.length; c++) {
    ws.getCell(r, c + 1).value = headers[c]
  }
  styleHeader(ws, r, headers.length)
  r++

  // 销售额（元）
  ws.getCell(r, 1).value = '销售额（元）'
  ws.getCell(r, 1).font = valFont(); ws.getCell(r, 1).border = BORDER_THIN; ws.getCell(r, 1).alignment = leftAlign()
  const totalSales = names.reduce((s, t) => s + (tiers[t]?.sales || 0), 0)
  ws.getCell(r, 2).value = totalSales
  ws.getCell(r, 2).font = valFont(); ws.getCell(r, 2).border = BORDER_THIN; ws.getCell(r, 2).numFmt = '#,##0'
  for (let ci = 0; ci < 4; ci++) {
    const cell = ws.getCell(r, 3 + ci)
    cell.value = tiers[names[ci]]?.sales || 0
    cell.font = valFont(); cell.border = BORDER_THIN; cell.numFmt = '#,##0'
  }
  r++

  // 销量
  ws.getCell(r, 1).value = '销量'
  ws.getCell(r, 1).font = valFont(); ws.getCell(r, 1).border = BORDER_THIN; ws.getCell(r, 1).alignment = leftAlign()
  const totalVolume = names.reduce((s, t) => s + (tiers[t]?.volume || 0), 0)
  ws.getCell(r, 2).value = totalVolume
  ws.getCell(r, 2).font = valFont(); ws.getCell(r, 2).border = BORDER_THIN; ws.getCell(r, 2).numFmt = '0'
  for (let ci = 0; ci < 4; ci++) {
    const cell = ws.getCell(r, 3 + ci)
    cell.value = tiers[names[ci]]?.volume || 0
    cell.font = valFont(); cell.border = BORDER_THIN; cell.numFmt = '0'
  }
  r++

  // 毛利率
  ws.getCell(r, 1).value = '毛利率'
  ws.getCell(r, 1).font = valFont(); ws.getCell(r, 1).border = BORDER_THIN; ws.getCell(r, 1).alignment = leftAlign()
  const weightedGM = totalSales > 0
    ? names.reduce((s, t) => s + (tiers[t]?.sales || 0) * (tiers[t]?.grossMargin || 0), 0) / totalSales
    : 0
  ws.getCell(r, 2).value = weightedGM
  ws.getCell(r, 2).font = valFont(); ws.getCell(r, 2).border = BORDER_THIN; ws.getCell(r, 2).numFmt = '0.00%'
  for (let ci = 0; ci < 4; ci++) {
    const cell = ws.getCell(r, 3 + ci)
    cell.value = tiers[names[ci]]?.grossMargin || 0
    cell.font = valFont(); cell.border = BORDER_THIN; cell.numFmt = '0.00%'
  }
  r++

  // 总部补贴（元）
  ws.getCell(r, 1).value = '总部补贴（元）'
  ws.getCell(r, 1).font = valFont(); ws.getCell(r, 1).border = BORDER_THIN; ws.getCell(r, 1).alignment = leftAlign()
  const totalSubsidy = names.reduce((s, t) => s + (tiers[t]?.subsidy || 0), 0)
  ws.getCell(r, 2).value = totalSubsidy
  ws.getCell(r, 2).font = valFont(); ws.getCell(r, 2).border = BORDER_THIN; ws.getCell(r, 2).numFmt = '#,##0'
  for (let ci = 0; ci < 4; ci++) {
    const cell = ws.getCell(r, 3 + ci)
    cell.value = tiers[names[ci]]?.subsidy || 0
    cell.font = valFont(); cell.border = BORDER_THIN; cell.numFmt = '#,##0'
  }
  r++

  return r
}

function writeVariableCostsFilled(
  ws: ExcelJS.Worksheet,
  startRow: number,
  costItems: Array<{ group: string; items: string[] }>,
  vrData: Record<string, number>,
  labelToKey: Record<string, string>,
): number {
  let r = startRow
  r++
  ws.getCell(r, 1).value = '变动费用（点位%，如 3% 填 0.03）'
  ws.getCell(r, 1).font = secFont()
  r++

  for (const { group, items } of costItems) {
    ws.getCell(r, 1).value = group
    ws.getCell(r, 1).font = muteFont()
    r++
    for (const item of items) {
      ws.getCell(r, 1).value = item
      ws.getCell(r, 1).font = valFont()
      ws.getCell(r, 1).border = BORDER_THIN
      const key = labelToKey[item] || ''
      const cell = ws.getCell(r, 2)
      cell.value = vrData[key] ?? 0
      cell.font = valFont()
      cell.border = BORDER_THIN
      cell.numFmt = '0.00%'
      r++
    }
  }
  return r
}

function writeFixedCostsFilled(ws: ExcelJS.Worksheet, startRow: number, fcData: Record<string, number>): number {
  let r = startRow
  r++
  ws.getCell(r, 1).value = '固定费用（元/月）'
  ws.getCell(r, 1).font = secFont()
  r++
  const fcLabels: Record<string, string> = {
    '1、场地费': 'venueFee', '2、展台': 'boothCost', '3、人力成本': 'laborCost',
    '4、日常费用': 'dailyExpense', '5、运营支持': 'operationSupport',
  }
  for (const [label, key] of Object.entries(fcLabels)) {
    ws.getCell(r, 1).value = label
    ws.getCell(r, 1).font = valFont()
    ws.getCell(r, 1).border = BORDER_THIN
    const cell = ws.getCell(r, 2)
    cell.value = fcData[key] ?? 0
    cell.font = valFont()
    cell.border = BORDER_THIN
    cell.numFmt = '#,##0'
    r++
  }
  return r
}

const EXPORT_VAR_LABEL_MAP_MODE_A: Record<string, string> = {
  '1、开单扣': 'commission', '2、年度返利': 'annualRebate', '3、零售折扣': 'retailDiscount',
  '合同外返利': 'extraRebate', '促销活动支持': 'promotionSupport',
  '1、渠道激励（对私）': 'channelIncentivePrivate',
  '2、渠道激励（带单）': 'channelIncentiveReferral',
  '3、销代提成': 'salesCommission', '4、业务提成': 'businessCommission',
  '5、追加激励': 'extraIncentive', '6、储运费': 'logisticsFee',
  '7、促销推广费': 'promotionFee',
}

const EXPORT_VAR_LABEL_MAP_MODE_B: Record<string, string> = {
  '1、合同内返利': 'contractRebate', '2、合同外返利': 'extraRebate',
  '3、促销活动支持': 'promotionSupport', '4、销售补差（零售折扣）': 'salesGap',
  '1、渠道激励（对私）': 'channelIncentivePrivate',
  '2、渠道激励（带单）': 'channelIncentiveReferral',
  '3、渠道激励（对内）': 'channelIncentiveOnline',
  '4、佣金-销代提成': 'commissionSales', '5、佣金-业务提成': 'commissionBusiness',
  '6、储运物流': 'retailIncentive', '7、促销推广费': 'promotionFee',
}

export async function exportSingleTemplate(data: {
  storeName: string
  category: string
  costMode: 'modeA' | 'modeB'
  tierNames: [string, string, string, string]
  tiers: Record<string, { sales: number; volume: number; grossMargin: number; subsidy?: number }>
  variableCosts: Record<string, number>
  storeFixedCosts: Record<string, number>
  kpi: {
    breakevenSales: number | null
    breakevenGM: number
    profit: number
    dailyContribution: number
    dailyContributionRate: number
  }
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('测算数据')
  const costItems = data.costMode === 'modeA' ? MODE_A_ITEMS : MODE_B_ITEMS
  const labelMap = data.costMode === 'modeA' ? EXPORT_VAR_LABEL_MAP_MODE_A : EXPORT_VAR_LABEL_MAP_MODE_B

  let r = 1

  // ── 门店信息（重导入时用于还原门店/品类/核算模式）──
  ws.getCell(r, 1).value = '门店名称'
  ws.getCell(r, 1).font = { name: '微软雅黑', size: 10, bold: true }
  ws.getCell(r, 2).value = data.storeName
  ws.getCell(r, 2).font = valFont()
  r++
  ws.getCell(r, 1).value = '品类'
  ws.getCell(r, 1).font = { name: '微软雅黑', size: 10, bold: true }
  ws.getCell(r, 2).value = data.category
  ws.getCell(r, 2).font = valFont()
  r++
  ws.getCell(r, 1).value = `核算模式：${data.costMode === 'modeA' ? '倒扣制核算法' : '顺加制核算法'}`
  ws.getCell(r, 1).font = muteFont()
  r += 2

  // ── 关键指标 ──
  ws.getCell(r, 1).value = '关键指标'
  ws.getCell(r, 1).font = secFont()
  r++

  const kpiHeaders = ['指标', '数值']
  for (let c = 0; c < kpiHeaders.length; c++) {
    const cell = ws.getCell(r, c + 1)
    cell.value = kpiHeaders[c]
    cell.font = hdrFont()
    cell.fill = hdrFill()
    cell.alignment = centerAlign()
    cell.border = BORDER_THIN
  }
  r++

  const kpiRows: Array<[string, string | number, string?]> = [
    ['销售额保本点', data.kpi.breakevenSales != null ? data.kpi.breakevenSales : '无法盈利', '#,##0'],
    ['保本毛利率', data.kpi.breakevenGM, '0.00%'],
    ['门店利润', data.kpi.profit, '#,##0'],
    ['日常边际贡献', data.kpi.dailyContribution, '#,##0'],
  ]
  for (const [label, value, fmt] of kpiRows) {
    ws.getCell(r, 1).value = label
    ws.getCell(r, 1).font = { name: '微软雅黑', size: 10, bold: true }
    ws.getCell(r, 1).border = BORDER_THIN
    ws.getCell(r, 1).alignment = leftAlign()
    const vc = ws.getCell(r, 2)
    vc.value = typeof value === 'string' ? value : value
    vc.font = valFont()
    vc.border = BORDER_THIN
    if (fmt && typeof value === 'number') vc.numFmt = fmt
    r++
  }
  r++

  r = writeProductStructureFilled(ws, r, data.tiers, data.tierNames)
  r = writeVariableCostsFilled(ws, r, costItems, data.variableCosts, labelMap)
  r = writeFixedCostsFilled(ws, r, data.storeFixedCosts)
  setColumnWidths(ws)

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer
}

export async function exportMultiTemplate(data: {
  storeName: string
  storeFixedCosts: Record<string, number>
  costMode: 'modeA' | 'modeB'
  storeKpi: {
    breakevenSales: number | null
    breakevenGM: number
    profit: number
    dailyContribution: number
  }
  categories: Record<string, {
    tierNames: [string, string, string, string]
    tiers: Record<string, { sales: number; volume: number; grossMargin: number; subsidy?: number }>
    variableCosts: Record<string, number>
    costMode: 'modeA' | 'modeB'
    kpi: {
      totalSales: number
      weightedCMR: number
      contributionAmount: number
    }
  }>
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()

  // Sheet 1: 门店信息（含关键指标 + 固定费用）
  const wsInfo = wb.addWorksheet('门店信息')
  let r = 1

  // ── 门店名称（重导入时还原）──
  wsInfo.getCell(r, 1).value = '门店名称'
  wsInfo.getCell(r, 1).font = { name: '微软雅黑', size: 10, bold: true }
  wsInfo.getCell(r, 2).value = data.storeName
  wsInfo.getCell(r, 2).font = valFont()
  r++
  wsInfo.getCell(r, 1).value = `核算模式：${data.costMode === 'modeA' ? '倒扣制核算法' : '顺加制核算法'}`
  wsInfo.getCell(r, 1).font = muteFont()
  r += 2

  // ── 关键指标 ──
  wsInfo.getCell(r, 1).value = '关键指标'
  wsInfo.getCell(r, 1).font = secFont()
  r++

  const kpiHeaders = ['指标', '数值']
  for (let c = 0; c < kpiHeaders.length; c++) {
    const cell = wsInfo.getCell(r, c + 1)
    cell.value = kpiHeaders[c]
    cell.font = hdrFont()
    cell.fill = hdrFill()
    cell.alignment = centerAlign()
    cell.border = BORDER_THIN
  }
  r++

  const kpiRows: Array<[string, string | number, string?]> = [
    ['销售额保本点', data.storeKpi.breakevenSales != null ? data.storeKpi.breakevenSales : '无法盈利', '#,##0'],
    ['保本毛利率', data.storeKpi.breakevenGM, '0.00%'],
    ['门店利润', data.storeKpi.profit, '#,##0'],
    ['日常边际贡献', data.storeKpi.dailyContribution, '#,##0'],
  ]
  for (const [label, value, fmt] of kpiRows) {
    wsInfo.getCell(r, 1).value = label
    wsInfo.getCell(r, 1).font = { name: '微软雅黑', size: 10, bold: true }
    wsInfo.getCell(r, 1).border = BORDER_THIN
    wsInfo.getCell(r, 1).alignment = leftAlign()
    const vc = wsInfo.getCell(r, 2)
    vc.value = typeof value === 'string' ? value : value
    vc.font = valFont()
    vc.border = BORDER_THIN
    if (fmt && typeof value === 'number') vc.numFmt = fmt
    r++
  }
  r++

  r = writeFixedCostsFilled(wsInfo, r - 1, data.storeFixedCosts)
  wsInfo.getColumn(1).width = 30
  wsInfo.getColumn(2).width = 18

  // One sheet per category（每个品类 sheet 记录自己的核算模式，重导入可还原）
  for (const [catName, catData] of Object.entries(data.categories)) {
    const ws = wb.addWorksheet(catName)
    const catMode = catData.costMode || data.costMode
    const costItems = catMode === 'modeA' ? MODE_A_ITEMS : MODE_B_ITEMS
    const labelMap = catMode === 'modeA' ? EXPORT_VAR_LABEL_MAP_MODE_A : EXPORT_VAR_LABEL_MAP_MODE_B
    let cr = 1

    ws.getCell(cr, 1).value = `核算模式：${catMode === 'modeA' ? '倒扣制核算法' : '顺加制核算法'}`
    ws.getCell(cr, 1).font = muteFont()
    cr++
    ws.getCell(cr, 1).value = `品类：${catName}`
    ws.getCell(cr, 1).font = secFont()
    cr += 2

    // KPI section
    ws.getCell(cr, 1).value = '关键指标'
    ws.getCell(cr, 1).font = secFont()
    cr++

    const kpiHeaders = ['指标', '数值']
    for (let c = 0; c < kpiHeaders.length; c++) {
      const cell = ws.getCell(cr, c + 1)
      cell.value = kpiHeaders[c]
      cell.font = hdrFont()
      cell.fill = hdrFill()
      cell.alignment = centerAlign()
      cell.border = BORDER_THIN
    }
    cr++

    const kpiRows: Array<[string, string | number, string?]> = [
      ['销售额', catData.kpi.totalSales, '#,##0'],
      ['加权CMR', catData.kpi.weightedCMR, '0.00%'],
      ['边际贡献额', catData.kpi.contributionAmount, '#,##0'],
    ]
    for (const [label, value, fmt] of kpiRows) {
      ws.getCell(cr, 1).value = label
      ws.getCell(cr, 1).font = { name: '微软雅黑', size: 10, bold: true }
      ws.getCell(cr, 1).border = BORDER_THIN
      ws.getCell(cr, 1).alignment = leftAlign()
      const vc = ws.getCell(cr, 2)
      vc.value = value
      vc.font = valFont()
      vc.border = BORDER_THIN
      if (fmt) vc.numFmt = fmt
      cr++
    }
    cr += 1

    cr = writeProductStructureFilled(ws, cr, catData.tiers, catData.tierNames)
    cr = writeVariableCostsFilled(ws, cr, costItems, catData.variableCosts, labelMap)
    setColumnWidths(ws)
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer
}

export async function generateMultiTemplate(
  costMode: 'modeA' | 'modeB',
  tierNames: [string, string, string, string] = ['X', 'C', 'P', 'S'],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const costItems = costMode === 'modeA' ? MODE_A_ITEMS : MODE_B_ITEMS
  const modeLabel = costMode === 'modeA' ? '倒扣制核算法' : '顺加制核算法'

  const wsInfo = wb.addWorksheet('门店信息')
  let r = 1
  wsInfo.getCell(r, 1).value = '门店名称'
  wsInfo.getCell(r, 1).font = { name: '微软雅黑', size: 10, bold: true }
  wsInfo.getCell(r, 2).font = valFont()
  r++
  wsInfo.getCell(r, 1).value = `核算模式：${modeLabel}`
  wsInfo.getCell(r, 1).font = muteFont()
  r += 2
  r = writeFixedCosts(wsInfo, r - 1)
  wsInfo.getColumn(1).width = 30
  wsInfo.getColumn(2).width = 18

  for (const cat of ['智屏', '白电', '空调', 'CIoT']) {
    const ws = wb.addWorksheet(cat)
    let cr = 1
    ws.getCell(cr, 1).value = `品类：${cat}`
    ws.getCell(cr, 1).font = secFont()
    cr += 2
    cr = writeProductStructure(ws, cr, tierNames)
    cr = writeVariableCosts(ws, cr, costItems)
    setColumnWidths(ws)
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer
}
