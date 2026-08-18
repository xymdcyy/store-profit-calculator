# 设计方案：系列名自定义

> 日期：2026-07-17
> 状态：待实施

## 背景

XCPS（X高端/C中端/P主流/S低端）是硬编码的四个产品系列名。实际业务中不同品类/门店的系列名可能不同（如"旗舰/主力/经济/入门"），需要支持自定义。

## 设计目标

- 系列数量保持 4 个不变，不够的全填 0
- 系列名可按品类独立自定义
- 模板导入导出自动适配自定义系列名
- 简洁模式和专业模式同步生效
- 旧数据无缝兼容

---

## 1. 数据模型变更

### 1.1 类型定义（`shared/types/scenario.ts`）

```typescript
export interface CategoryData {
  category: string
  costMode: CostMode
  tierNames: [string, string, string, string]  // 新增
  productStructure: Record<string, TierData>    // key 与 tierNames 对应
  variableCosts: VariableCosts
  exclusiveFixedCosts?: FixedCosts
  inputMode?: InputMode
}
```

### 1.2 默认数据（`shared/data/defaultScenario.ts`）

```typescript
tierNames: ['X', 'C', 'P', 'S'],
productStructure: {
  X: { sales: 0, volume: 0, grossMargin: 0 },
  C: { sales: 0, volume: 0, grossMargin: 0 },
  P: { sales: 0, volume: 0, grossMargin: 0 },
  S: { sales: 0, volume: 0, grossMargin: 0 },
},
```

### 1.3 数据迁移

在 `LOAD_SCENARIO` reducer 中增加迁移：

```typescript
function migrateTierNames(data: CategoryData): CategoryData {
  if (data.tierNames) return data
  const keys = Object.keys(data.productStructure)
  return {
    ...data,
    tierNames: keys.length === 4
      ? keys as [string, string, string, string]
      : ['X', 'C', 'P', 'S'],
  }
}
```

单品类和多品类场景均需调用此迁移。

---

## 2. 模板导入导出变更

### 2.1 模板生成（`main/template-generator.ts`）

函数签名增加 `tierNames` 参数：

```typescript
export async function generateTemplate(
  costMode: 'modeA' | 'modeB',
  tierNames: [string, string, string, string] = ['X', 'C', 'P', 'S']
): Promise<Buffer>

export async function generateMultiTemplate(
  costMode: 'modeA' | 'modeB',
  tierNames?: [string, string, string, string]
): Promise<Buffer>
```

表头改为纯系列名：

```typescript
const headers = ['项目', '合计', tierNames[0], tierNames[1], tierNames[2], tierNames[3]]
```

导出函数（`exportSingleTemplate` / `exportMultiTemplate`）同理，从入参的 `tiers` 对象 key 动态取列名。

### 2.2 Excel 解析（`main/excel-parser.ts`）

移除硬编码 `TIER_NAMES` 常量，改为从表头行动态读取：

1. 找到包含"项目"的行
2. 读取 C~F 列的值作为 tierNames
3. 用这些名称作为 productStructure 的 key

向后兼容：旧模板表头为 X/C/P/S，正常解析。

### 2.3 IPC 层（`main/ipc-handlers.ts`）

`template:download` 从当前方案数据取 `tierNames` 传给模板生成函数。`scenarios:export` 已包含完整方案数据，无需额外变更。

---

## 3. UI 变更

### 3.1 系列名编辑交互

在产品结构表格表头行，系列名可点击编辑：

- 点击系列名 → 变为 inline input，聚焦选中全部文字
- Enter / 失焦 → 保存新名称，同步更新 productStructure 的 key
- Esc → 取消编辑
- 不允许重复名称，重复时 toast 提示

### 3.2 需修改的组件

| 组件 | 路径 | 变更内容 |
|---|---|---|
| TierInput.tsx | simple/inputs/ | 表头动态化 + inline 编辑 |
| InlineCategoryEditor.tsx | simple/inputs/ | 系列列名动态化 + inline 编辑 |
| CategoryWizard.tsx | simple/inputs/ | 品类向导系列名动态化 |
| MultiCompare.tsx | simple/analysis/ | 多品类对比系列列名动态化 |
| ScenarioCompare.tsx | simple/analysis/ | 方案对比系列列名动态化 |
| CalculatorPage.tsx | professional/pages/ | 专业模式系列名动态化 |
| StepChartMulti.tsx | simple/charts/ | 阶梯图系列标签动态化 |

### 3.3 帮助文档

HelpModal.tsx 中 "X（高端）、C（中端）、P（主流）、S（低端）" 改为"四个产品系列（名称可自定义）"。

---

## 4. 两个模式的同步

两个模式共享 `ScenarioContext`，数据层变更天然同步。UI 层各组件独立从 `categoryData.tierNames` 读取，无需额外同步逻辑。

---

## 5. 数据流

```
用户编辑系列名
  → CategoryData.tierNames 更新
  → productStructure key 重命名
  → reducer 更新 state
  → 计算引擎自动适配（key 为 string，无硬编码）
  → 两个模式 UI 自动刷新

下载模板
  → 取当前方案 tierNames
  → 传给 generateTemplate()
  → Excel 表头使用自定义名

导入 Excel
  → 读取表头 C~F 列
  → 作为 tierNames 存入 CategoryData
  → productStructure key 与表头对应
```

---

## 6. 待确认事项

- [x] 系列名存储方式：用系列名做 key
- [x] 表头格式：纯系列名
- [x] 自定义入口：品类级别
