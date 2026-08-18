import { ipcMain, dialog } from 'electron'
import { writeFileSync, readdirSync } from 'fs'
import crypto from 'crypto'
import path from 'path'
import {
  listScenarios, getScenario, createScenario,
  updateScenario, deleteScenario, cloneScenario,
} from './database'
import { generateTemplate, generateMultiTemplate, exportSingleTemplate, exportMultiTemplate } from './template-generator'
import { parseSingleExcel, parseMultiExcel } from './excel-parser'

/** 各核算模式专属的变动费用 key（与 renderer 的 costModeLabels 保持一致） */
const MODE_A_ONLY_KEYS = new Set([
  'commission', 'annualRebate', 'retailDiscount',
  'salesCommission', 'businessCommission', 'extraIncentive', 'logisticsFee',
])
const MODE_B_ONLY_KEYS = new Set([
  'contractRebate', 'salesGap', 'channelIncentiveOnline',
  'commissionSales', 'commissionBusiness', 'retailIncentive',
])

/** 按核算模式汇总变动费用（排除另一模式专属项） */
function sumVR(vc: Record<string, any>, mode?: string): number {
  return Object.entries(vc || {})
    .filter(([k]) => mode === 'modeA' ? !MODE_B_ONLY_KEYS.has(k)
      : mode === 'modeB' ? !MODE_A_ONLY_KEYS.has(k) : true)
    .reduce((a, [, v]) => a + (Number(v) || 0), 0)
}

export function registerIpcHandlers() {
  ipcMain.handle('scenarios:list', async () => listScenarios())
  ipcMain.handle('scenarios:get', async (_e, id: string) => getScenario(id))
  ipcMain.handle('scenarios:create', async (_e, body) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    return createScenario({ ...body, id, created_at: now, updated_at: now })
  })
  ipcMain.handle('scenarios:update', async (_e, id, updates) => updateScenario(id, updates))
  ipcMain.handle('scenarios:delete', async (_e, id) => deleteScenario(id))
  ipcMain.handle('scenarios:clone', async (_e, id) => cloneScenario(id))

  ipcMain.handle('template:download', async (_e, mode: 'single' | 'multi', cost: 'modeA' | 'modeB', tierNames?: [string, string, string, string]) => {
    const tn = tierNames || ['X', 'C', 'P', 'S']
    const buffer = mode === 'multi'
      ? await generateMultiTemplate(cost, tn)
      : await generateTemplate(cost, tn)
    const filename = mode === 'multi' ? 'TCL_multi_template.xlsx' : 'TCL_single_template.xlsx'
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    })
    if (!result.canceled && result.filePath) {
      writeFileSync(result.filePath, buffer)
    }
  })

  ipcMain.handle('excel:import', async (_e, mode: 'single' | 'multi' | 'auto') => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: '用户取消' }
    }
    try {
      // 自动检测：先尝试多品类解析
      if (mode === 'auto') {
        try {
          const data = await parseMultiExcel(result.filePaths[0])
          return { success: true, data }
        } catch {
          // 多品类失败，尝试单品类
        }
        try {
          const data = await parseSingleExcel(result.filePaths[0])
          return { success: true, data }
        } catch (e: any) {
          return { success: false, error: e.message || '解析失败' }
        }
      }
      const data = mode === 'multi'
        ? await parseMultiExcel(result.filePaths[0])
        : await parseSingleExcel(result.filePaths[0])
      return { success: true, data }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('scenarios:export', async (_e, id: string) => {
    try {
      const scenario = await getScenario(id)
      if (!scenario) throw new Error('方案不存在或已被删除，请重新保存后再导出')

      const d = scenario.data as any
      const sc = d.singleCategory
      const mc = d.multiCategory

      let buffer: Buffer

      if (mc?.categories) {
        const costMode = (Object.values(mc.categories)[0] as any)?.costMode || 'modeA'
        const fc = (d.storeFixedCosts || {}) as Record<string, number>
        const categories: Record<string, {
          tierNames: string[]
          tiers: Record<string, { sales: number; volume: number; grossMargin: number; subsidy?: number }>
          variableCosts: Record<string, number>
          costMode: 'modeA' | 'modeB'
          kpi: { totalSales: number; weightedCMR: number; contributionAmount: number }
        }> = {}

        let totalSales = 0
        let totalContribution = 0
        let totalSubsidy = 0
        let totalVR = 0
        for (const [catName, cat] of Object.entries(mc.categories)) {
          const c = cat as any
          const tiers = (c.productStructure || {}) as Record<string, { sales: number; volume: number; grossMargin: number; subsidy?: number }>
          const catMode = c.costMode || 'modeA'
          const vr = sumVR(c.variableCosts, catMode)
          const catSales = Object.values(tiers).reduce((s, t) => s + (t.sales || 0), 0)
          let weightedCMR = 0
          if (catSales > 0) {
            weightedCMR = Object.values(tiers).reduce((s, t) => s + ((t.sales || 0) / catSales) * ((t.grossMargin || 0) - vr), 0)
          }
          const catSubsidy = Object.values(tiers).reduce((s, t) => s + (t.subsidy || 0), 0)
          categories[catName] = {
            tierNames: c.tierNames || ['X', 'C', 'P', 'S'],
            tiers,
            variableCosts: c.variableCosts || {},
            costMode: catMode,
            kpi: { totalSales: catSales, weightedCMR, contributionAmount: catSales * weightedCMR },
          }
          totalSales += catSales
          totalContribution += catSales * weightedCMR
          totalSubsidy += catSubsidy
          totalVR += catSales * vr
        }

        const totalFC = Object.values(fc).reduce<number>((a, b) => a + Number(b), 0)
        const dailyContribution = totalContribution + totalSubsidy
        const profit = dailyContribution - totalFC
        const weightedCMR = totalSales > 0 ? totalContribution / totalSales : 0
        // 保本点按净固定费用（扣除总部补贴），与 renderer 计算引擎口径一致
        const breakevenSales = weightedCMR > 0 ? Math.max(0, totalFC - totalSubsidy) / weightedCMR : null
        const breakevenGM = totalSales > 0 ? totalVR / totalSales + (totalFC - totalSubsidy) / totalSales : 0

        buffer = await exportMultiTemplate({
          storeName: d.storeName || '',
          storeFixedCosts: fc,
          costMode,
          storeKpi: { breakevenSales, breakevenGM, profit, dailyContribution },
          categories: categories as any,
        })
      } else if (sc?.data) {
        const cat = sc.data
        const tiers = (cat.productStructure || {}) as Record<string, { sales: number; volume: number; grossMargin: number; subsidy?: number }>
        const vr = sumVR(cat.variableCosts, cat.costMode)
        const fc = d.storeFixedCosts || {}

        const totalSales = Object.values(tiers).reduce((s, t) => s + (t.sales || 0), 0)
        let weightedCMR = 0
        if (totalSales > 0) {
          weightedCMR = Object.values(tiers).reduce((s, t) => s + ((t.sales || 0) / totalSales) * ((t.grossMargin || 0) - vr), 0)
        }
        const contribution = totalSales * weightedCMR
        const totalSubsidy = Object.values(tiers).reduce((s, t) => s + (t.subsidy || 0), 0)
        const dailyContribution = contribution + totalSubsidy
        const totalFC = Object.values(fc).reduce<number>((a, b) => a + Number(b), 0)
        const profit = dailyContribution - totalFC
        // 保本点按净固定费用（扣除总部补贴），与 renderer 计算引擎口径一致
        const breakevenSales = weightedCMR > 0 ? Math.max(0, totalFC - totalSubsidy) / weightedCMR : null
        const breakevenGM = totalSales > 0 ? vr + (totalFC - totalSubsidy) / totalSales : 0

        buffer = await exportSingleTemplate({
          storeName: d.storeName || '',
          category: cat.category || '智屏',
          costMode: cat.costMode || 'modeA',
          tierNames: cat.tierNames || ['X', 'C', 'P', 'S'],
          tiers,
          variableCosts: cat.variableCosts || {},
          storeFixedCosts: fc,
          kpi: { breakevenSales, breakevenGM, profit, dailyContribution, dailyContributionRate: totalSales > 0 ? dailyContribution / totalSales : 0 },
        })
      } else {
        throw new Error('方案数据不完整，无法导出')
      }

      const result = await dialog.showSaveDialog({
        defaultPath: `scenario_${(id as string).slice(0, 8)}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      })
      if (!result.canceled && result.filePath) {
        writeFileSync(result.filePath, buffer as unknown as Buffer)
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || '导出失败' }
    }
  })

  // 批量导入 — 扫描文件夹内所有 Excel
  ipcMain.handle('batch:import', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择包含门店模板 Excel 的文件夹',
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: '用户取消' }
    }
    const dir = result.filePaths[0]
    const files = readdirSync(dir).filter(f => f.endsWith('.xlsx'))
    if (files.length === 0) return { success: false, error: '文件夹内没有 Excel 文件' }

    const stores: any[] = []
    for (const file of files) {
      const filePath = path.join(dir, file)
      try {
        try {
          const data = await parseMultiExcel(filePath)
          stores.push({ fileName: file, type: 'multi', data })
        } catch {
          try {
            const data = await parseSingleExcel(filePath)
            stores.push({ fileName: file, type: 'single', data })
          } catch (e: any) {
            stores.push({ fileName: file, error: e.message || '解析失败' })
          }
        }
      } catch (e: any) {
        stores.push({ fileName: file, error: e.message || '解析失败' })
      }
    }
    return { success: true, stores }
  })
}
