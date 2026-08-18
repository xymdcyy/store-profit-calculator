# TCL门店盈利测算（合并版）设计文档

> 日期：2026-06-29
> 状态：已确认

---

## 1. 背景与目标

将现有的两个独立应用合并为一个：
- **门店简洁版**（`d:\代码\经营模拟测算应用（门店简洁版）`）：面向门店店长/战区经理，单页Tab，智能诊断，结构调整模拟
- **财务专业版**（`d:\代码\经营模拟测算应用（财务专业版）`）：面向财务人员，5页面路由，金额/点位双模式，CVP精细化分析

合并后用户启动应用时选择模式，运行时可切换。两个模式共享计算引擎和方案库，UI各自独立。

### 已确认的关键决策

| 决策点 | 结论 |
|--------|------|
| 技术底座 | 门店简洁版（Electron + electron-vite, React 19, Tailwind 4, Recharts, SQLite）|
| 计算引擎 | 门店简洁版 |
| 架构方案 | 方案B：双子应用 + 共享核心层 |
| 专业版功能 | 保留全部（金额/点位双模式、多页面路由、额外图表）|
| 品类 | 统一为4个：智屏、白电、空调、CIoT |
| 数据存储 | SQLite，共享方案库 |
| Excel模板 | 门店简洁版模板 |
| 切换交互 | 启动选择页 + 运行时切换 |
| UI规范 | Google 设计规范（扁平、细边框、蓝主色、8px圆角、DM Sans）|
| 主题 | 仅亮色主题 |

---

## 2. 目录结构

```
TCL门店盈利测算（合并版）/
├── src/
│   ├── main/                          ← Electron 主进程
│   │   ├── index.ts                   ← 窗口创建
│   │   ├── database.ts                ← SQLite（沿用门店简洁版，去掉10条上限）
│   │   ├── excel-parser.ts            ← Excel导入解析
│   │   ├── template-generator.ts      ← Excel模板生成（品类改名）
│   │   └── ipc-handlers.ts            ← IPC通道
│   ├── preload/
│   │   └── index.ts                   ← preload桥接
│   └── renderer/
│       └── src/
│           ├── shared/                ← 共享核心层
│           │   ├── types/
│           │   │   └── scenario.ts    ← 统一数据模型
│           │   ├── calc/
│           │   │   ├── calculator.ts  ← 计算引擎
│           │   │   ├── analyzer.ts    ← 智能诊断
│           │   │   └── cvp.ts         ← CVP数据生成（从财务专业版迁移）
│           │   ├── context/
│           │   │   └── ScenarioContext.tsx  ← 测算状态管理
│           │   ├── data/
│           │   │   └── defaultScenario.ts
│           │   ├── constants/
│           │   │   └── categories.ts  ← 品类统一配置
│           │   └── styles/
│           │       └── tokens.css     ← Google设计规范token
│           ├── modes/
│           │   ├── simple/            ← 门店简洁模式
│           │   │   ├── SimpleApp.tsx
│           │   │   ├── components/    ← 门店简洁版组件迁移
│           │   │   └── services/
│           │   │       └── api.ts
│           │   └── professional/      ← 财务专业模式
│           │       ├── ProApp.tsx
│           │       ├── pages/
│           │       │   ├── CalculatorPage.tsx
│           │       │   ├── ResultPage.tsx
│           │       │   ├── ChartPage.tsx
│           │       │   ├── HistoryPage.tsx
│           │       │   └── ComparePage.tsx
│           │       └── components/
│           │           ├── AmountRateToggle.tsx
│           │           ├── ProfitWaterfall.tsx
│           │           └── RevenuePieChart.tsx
│           ├── shell/                 ← 应用外壳
│           │   ├── AppShell.tsx       ← 模式切换容器
│           │   ├── Launcher.tsx       ← 启动选择页
│           │   └── ModeContext.tsx    ← 模式状态
│           ├── App.tsx
│           └── main.tsx
├── package.json
├── electron.vite.config.ts
└── tsconfig.json
```

### 迁移规则

- 门店简洁版现有代码整体迁入 `modes/simple/`，调整 import 路径指向 `shared/`
- `calculator.ts`、`analyzer.ts`、`scenario.ts`、`ScenarioContext.tsx` 提到 `shared/`
- `database.ts`、`template-generator.ts`、`excel-parser.ts` 留在 `main/`
- 财务专业模式新建 `modes/professional/`，引入 `react-router-dom`

---

## 3. UI设计规范

采用 Google 分析型仪表盘设计规范（`D:\Google`）。

### Token体系（`shared/styles/tokens.css`）

```css
:root {
  /* 核心 */
  --background: #ffffff;
  --foreground: #0e1115;
  --card: #ffffff;
  --popover: #f9f9fa;
  --muted: #eff1f4;
  --muted-foreground: #7f8d9f;

  /* 语义动作色 */
  --primary: #4285f4;
  --primary-foreground: #ffffff;
  --secondary: #dbeafe;
  --secondary-foreground: #333942;
  --accent: #dbeafe;
  --accent-foreground: #003e8f;
  --destructive: #ef4444;

  /* 边框/输入/聚焦 */
  --border: #ebebeb;
  --input: #e2e3e4;
  --ring: #4285f4;

  /* 图表色（4品类映射） */
  --chart-1: #4285f4;  /* 智屏 - 蓝 */
  --chart-2: #ea4335;  /* 白电 - 红 */
  --chart-3: #fbbc05;  /* 空调 - 黄 */
  --chart-4: #34a853;  /* CIoT - 绿 */
  --chart-5: #0043ad;  /* 辅助 - 深蓝 */

  /* 侧边栏（财务专业模式） */
  --sidebar: #f0f6ff;
  --sidebar-foreground: #0e1115;
  --sidebar-primary: #4285f4;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-border: #e7eaef;

  /* 字体 */
  --font-sans: 'DM Sans', ui-sans-serif, sans-serif, system-ui;
  --font-mono: 'JetBrains Mono', monospace;

  /* 圆角/间距 */
  --radius: 0.5rem;          /* 8px */
  --spacing: 0.24rem;        /* 3.84px */

  /* 扩展：测算专用 */
  --positive: #34a853;
  --negative: #ea4335;
  --warning: #fbbc05;
  --warning-soft: #fef3c7;
  --danger-soft: #fee2e2;
  --success-soft: #d1fae5;
}
```

### 视觉规则

- **卡片**：白底 + `--border`细边框 + `--radius`圆角，无阴影
- **KPI卡片**：大数字用 `font-mono` 保证对齐，趋势标签用 soft 色底
- **按钮**：统一36px高，Primary蓝填充 / Secondary浅蓝底 / Ghost透明+边框
- **图表**：4品类固定色，盈亏线绿/红，参考线灰虚线

### 两模式布局差异

**门店简洁模式：**
- 顶部 Header（白底 + 模式切换按钮）
- 单页 Tab（单品类/多品类）
- 左输入右图表 5:3 网格

**财务专业模式：**
- 左侧 Sidebar（`--sidebar`浅蓝底，260px，5页面导航）
- 顶部 Topbar（模式切换按钮）
- 主内容区按页面路由切换

---

## 4. 数据模型与计算引擎

### 统一数据模型（`shared/types/scenario.ts`）

以门店简洁版为基础扩展：

```typescript
export type InputMode = 'amount' | 'rate'  // 新增

export interface TierData {  // 沿用
  sales: number
  volume: number
  grossMargin: number
  subsidy?: number
}

export interface VariableCosts { /* 17字段，沿用 */ }
export interface FixedCosts { /* 5字段，沿用 */ }

export interface CategoryData {  // 扩展 inputMode
  category: string
  costMode: CostMode
  productStructure: Record<string, TierData>
  variableCosts: VariableCosts
  exclusiveFixedCosts?: FixedCosts
  inputMode?: InputMode  // 默认 'rate'
}

export interface CalculationScenario {  // 扩展 sourceMode
  id: string
  name: string
  mode: 'single' | 'multi'
  createdAt?: string
  updatedAt?: string
  storeName: string
  storeFixedCosts: FixedCosts
  sourceMode?: 'simple' | 'professional'  // 新增
  singleCategory?: { category: string; data: CategoryData }
  multiCategory?: { selectedCategories: string[]; categories: Record<string, CategoryData> }
}
```

### 计算引擎（`shared/calc/`）

| 文件 | 来源 | 说明 |
|------|------|------|
| `calculator.ts` | 门店简洁版 | calcCategory / calcMultiCategory / calcSingleStore / buildStepChartData |
| `analyzer.ts` | 门店简洁版 | 4级诊断 + 改进建议，两模式共用 |
| `cvp.ts` | 财务专业版迁移 | generateCVPData / generateCategoryLevelCVPData / amountToRate / rateToAmount |

### 品类统一配置（`shared/constants/categories.ts`）

```typescript
export const CATEGORIES = ['智屏', '白电', '空调', 'CIoT'] as const
export const CATEGORY_COLORS: Record<string, string> = {
  '智屏': '#4285f4',
  '白电': '#ea4335',
  '空调': '#fbbc05',
  'CIoT': '#34a853',
}
```

### 命名变更影响

全代码库 `冰洗`→`白电`、`门锁`→`CIoT`，涉及：
- `calculator.ts` 的 CATEGORY_COLORS
- `template-generator.ts` 的数据验证和品类列表
- `defaultScenario.ts` 的默认品类
- 各组件文案

### SQLite存储调整

- 去掉 [database.ts](file:///d:/代码/经营模拟测算应用（门店简洁版）/src/main/database.ts#L93-L95) 的10条上限，改为无限
- 方案 `data` 字段 JSON 自然包含 `sourceMode`，两模式可互读

---

## 5. 模式切换机制

### 启动流程

```
应用启动
  ↓
AppShell 检查 localStorage.lastMode
  ├─ 有记录 → 直接进入对应模式
  └─ 无记录 → 显示 Launcher 启动选择页
       ├─ "门店简洁模式" → SimpleApp
       └─ "财务专业模式" → ProApp
  ↓
运行时 Header/Sidebar 顶部按钮切换
  ↓
切换时记录 lastMode 到 localStorage
```

### 模式状态（`shell/ModeContext.tsx`）

```typescript
type AppMode = 'simple' | 'professional'
interface ModeState {
  mode: AppMode
  setMode: (mode: AppMode) => void
  toggleMode: () => void
}
```

- `mode` 持久化到 localStorage
- 切换时不卸载共享计算状态，仅切换 UI 组件树
- 两模式共用同一个 ScenarioContext

### 状态管理架构

| 层级 | 职责 | 实现 |
|------|------|------|
| ModeContext | 模式切换 | 轻量 Context |
| ScenarioContext | 测算数据 | 门店简洁版 reducer，提到 shared/ |
| ProApp局部状态 | 输入模式、当前页面 | useState |

财务专业版原用 Zustand，合并后降级为 Context+useReducer 以统一技术栈。`inputMode` 状态降级为 ProApp 内部 useState。

### 窗口

```typescript
new BrowserWindow({
  width: 1440,   // 折中尺寸
  height: 900,
  minWidth: 1024,
  minHeight: 700,
  title: 'TCL门店盈利测算',
})
```

### 共享IPC接口（`preload/index.ts`）

8个方法两模式共用，无需扩展：
- 方案CRUD：listScenarios / getScenario / createScenario / updateScenario / deleteScenario / cloneScenario
- Excel：downloadTemplate / importExcel / exportScenario

---

## 6. 组件复用清单

| 组件 | 来源 | 门店简洁 | 财务专业 |
|------|------|---------|---------|
| KpiCards | 门店简洁版 | ✓ | ✓ |
| TierInput | 门店简洁版 | ✓ | ✓ 包裹切换器 |
| VariableCostInput | 门店简洁版 | ✓ | ✓ 包裹切换器 |
| FixedCostInput | 门店简洁版 | ✓ | ✓ |
| ContributionBarChart | 门店简洁版 | ✓ | ✗ |
| StepChartMulti | 门店简洁版 | ✓ | ✗ |
| CvpChart | 门店简洁版 | ✓ | ✓ 扩展下钻 |
| AnalysisPanel | 门店简洁版 | ✓ | ✓ |
| ScenarioCompare | 门店简洁版 | ✓ | ✓ |
| CategoryWizard | 门店简洁版 | ✓ | ✓ |
| AmountRateToggle | 新建 | ✗ | ✓ |
| ProfitWaterfall | 新建 | ✗ | ✓ |
| RevenuePieChart | 新建 | ✗ | ✓ |

### 财务专业模式5页面

| 页面 | 复用 | 新建 |
|------|------|------|
| 测算输入 | TierInput + VariableCostInput + FixedCostInput + CategoryWizard | AmountRateToggle |
| 结果展示 | KpiCards + AnalysisPanel | 费率警告面板 |
| 图表可视化 | CvpChart | ProfitWaterfall + RevenuePieChart + 费用堆叠图 |
| 历史记录 | — | HistoryTable |
| 方案对比 | ScenarioCompare | — |

---

## 7. 技术栈

| 组件 | 选型 |
|------|------|
| 框架 | Electron 33 + electron-vite 2.3 |
| 前端 | React 19 + TypeScript 5.5 |
| UI | Tailwind CSS 4（纯手写样式）|
| 图表 | Recharts 2.15 |
| 路由 | react-router-dom 7（财务专业模式）|
| 状态 | React Context + useReducer |
| Excel | exceljs 4.4 |
| 数据存储 | sql.js（SQLite）|
| 字体 | DM Sans + JetBrains Mono |

---

## 8. 验收标准

- [ ] 启动应用显示模式选择页，选择后进入对应模式
- [ ] 运行时可在两模式间切换，切换后数据不丢失
- [ ] 门店简洁模式功能与原门店简洁版一致（单页Tab、智能诊断、结构调整模拟、阶梯图）
- [ ] 财务专业模式功能包含5页面路由、金额/点位双模式、CVP图、瀑布图、饼图
- [ ] 两个模式共享方案库，在一方保存的方案可在另一方加载
- [ ] 品类统一为：智屏、白电、空调、CIoT
- [ ] UI 符合 Google 设计规范（扁平、蓝主色、8px圆角、DM Sans字体）
- [ ] Excel模板导入导出正常工作
- [ ] 应用可打包为 Windows exe
