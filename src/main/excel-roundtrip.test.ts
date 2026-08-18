import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import ExcelJS from 'exceljs'
import { generateTemplate } from './template-generator'
import { parseSingleExcel } from './excel-parser'

let dir: string
beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcl-parser-test-')) })
afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }) })

/** 找到 '产品结构' 标题行号（表头在其下一行） */
async function findStructureHeaderRow(wb: ExcelJS.Workbook): Promise<number> {
  const ws = wb.getWorksheet('测算数据')!
  for (let r = 1; r <= ws.rowCount; r++) {
    if (String(ws.getCell(r, 1).value).includes('产品结构')) return r + 1
  }
  throw new Error('未找到产品结构区块')
}

describe('Excel 往返：表内修改系列名 → 导入正确读取（方式一）', () => {
  it('模板表头改名后，导入解析出对应系列名与数据结构', async () => {
    const buf = await generateTemplate('modeA')
    const file = path.join(dir, 'renamed.xlsx')
    fs.writeFileSync(file, buf)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(file)
    const ws = wb.getWorksheet('测算数据')!
    const hdr = await findStructureHeaderRow(wb)

    // 模拟用户把 X/C/P/S 改名为 高端X/高端C/高端P/高端S
    const names = ['高端X', '高端C', '高端P', '高端S']
    for (let c = 0; c < 4; c++) ws.getCell(hdr, 3 + c).value = names[c]

    // 填销售额（C~F 列）
    const salesRow = hdr + 1
    ws.getCell(salesRow, 3).value = 100000
    ws.getCell(salesRow, 4).value = 200000
    ws.getCell(salesRow, 5).value = 150000
    ws.getCell(salesRow, 6).value = 50000

    await wb.xlsx.writeFile(file)

    const data = await parseSingleExcel(file)
    expect(data.data.tierNames).toEqual(names)
    expect(Object.keys(data.data.productStructure)).toEqual(names)
    expect(data.data.productStructure['高端X'].sales).toBe(100000)
    expect(data.data.productStructure['高端C'].sales).toBe(200000)
    expect(data.data.productStructure['高端S'].sales).toBe(50000)
  })

  it('顺加制模板：销售补差（零售折扣）行解析进 salesGap 而非 retailDiscount', async () => {
    const buf = await generateTemplate('modeB')
    const file = path.join(dir, 'modeb-gap.xlsx')
    fs.writeFileSync(file, buf)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(file)
    const ws = wb.getWorksheet('测算数据')!

    // 定位 '4、销售补差（零售折扣）' 行并填值
    let filled = false
    for (let r = 1; r <= ws.rowCount; r++) {
      const v = String(ws.getCell(r, 1).value)
      if (v.includes('销售补差')) {
        ws.getCell(r, 2).value = 0.01
        filled = true
        break
      }
    }
    expect(filled).toBe(true)

    // 填产品结构避免整表无销售数据
    const hdr = await findStructureHeaderRow(wb)
    ws.getCell(hdr + 1, 3).value = 100000
    ws.getCell(hdr + 1, 4).value = 200000
    ws.getCell(hdr + 1, 5).value = 150000
    ws.getCell(hdr + 1, 6).value = 50000

    await wb.xlsx.writeFile(file)

    const data = await parseSingleExcel(file)
    expect(data.data.costMode).toBe('modeB')
    expect(data.data.variableCosts.salesGap).toBeCloseTo(0.01, 10)
    expect(data.data.variableCosts.retailDiscount).toBe(0)
  })
})
