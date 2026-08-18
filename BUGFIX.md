# Bug 修复记录

> 日期：2026-07-22
> 环境：macOS 25.4.0 (Apple Silicon) · Node.js v24.18.0 · Electron 33

---

## 修复 #3：毛利率输入删空后数据异常放大

**日期**：2026-08-12

**文件**：
- `src/renderer/src/components/PercentInput.tsx`（新增）
- `src/renderer/src/components/PercentInput.test.ts` / `PercentInput.component.test.tsx`（新增，9 个用例）
- `src/renderer/src/modes/simple/components/inputs/TierInput.tsx`
- `src/renderer/src/modes/simple/components/inputs/InlineCategoryEditor.tsx`
- `src/renderer/src/modes/simple/components/inputs/CategoryWizard.tsx`

**严重程度**：🟠 数据显示异常（不崩溃）

**现象**：加载示例数据后，在 X/C/P/S 区域用退格删除毛利率数字、删到输入框为空时，所有测算数据变得异常大（示例中保本点从 59 万暴涨到 436 万），且输入框被强制显示 "0"、无法继续删空重输。

**根因**：原实现 `(parseFloat(e.target.value) || 0) / 100` 中，空输入 `parseFloat('') = NaN`，`NaN || 0 = 0`——删除数字的编辑中间态（空输入）被立即提交为"毛利率=0"。该系列 CMR 骤变为负、加权 CMR 趋近 0，保本点 = 固定费用 ÷ 极小 CMR 被急剧放大；受控 value 又强制输入框显示 "0"，编辑被打断。

**修复方式**：新增 `PercentInput` 百分比输入组件（本地 draft 缓冲 + 空输入不提交 + 失焦恢复原值 + 外部 value 覆盖时 draft 让位），替换三处毛利率输入。非空输入仍实时提交，保留"改数即重算"联动。语义变化：删空不再等于清零，设为 0 需显式输入 "0"。

**测试**：`npm test`（vitest，9 用例：空输入不提交/正常解析/显式 0/中间态/外部覆盖）

**跟进**：变动费用百分比输入同型问题一并修复——`InlineCategoryEditor.tsx`、`CategoryWizard.tsx`、`VariableCostInput.tsx`（点位模式）已改用 PercentInput。

---

## 修复 #4：全仓代码审查发现的 15 项缺陷（2026-08-12）

> 触发方式：`/code-review` 全仓审查（15 findings）。核心结论：财务口径不一致（保本点忽略补贴）、数据丢失路径（tab 污染 mode / savedId 残留 / 导出丢元信息）、输入中间态破坏、若干显示错配。

### 财务数学（P0）
- **F1 保本点公式纳入补贴**：`calculator.ts` / `analyzer.ts` / `ipc-handlers.ts` 导出 KPI 统一为 `BEP = (固定费用 − 总部补贴) ÷ 加权 CMR`（补贴 ≥ 固定费用时 BEP=0），与利润公式/goalSeek/敏感性分析口径一致
- **F7 诊断建议错误放大**：`analyzer.ts` "需提升销售额"由 `gap/CMR` 改为 `gap`（达到保本点所需增量即缺口本身）
- **F8 goalSeek 除零**：目标利润率 ≥ 加权 CMR 时 `requiredSalesForRate` 返回 null（无法通过扩销实现）

### 数据丢失（P0/P1）
- **F2 SET_TAB 不再改写 scenario.mode**：切换查看不再污染已保存方案的 mode；`LOAD_SCENARIO` 未显式传 tab 时跟随数据模式
- **F3 savedId 重置**：清空数据/导入 Excel（Simple + 专业两模式）后 `savedId=null`，保存走"新建"而非静默覆盖旧方案
- **F4 导出模板写元信息**：单品类导出写门店名称/品类/核算模式；多品类每个品类 sheet 写自己的核算模式，重导入可还原（`template-generator.ts` + `excel-parser.ts` + `ipc-handlers.ts`）

### 崩溃/错配（P0/P1）
- **F6 多品类视图 toast 未定义**：`SimpleApp.tsx` MultiCategoryView 补 `useToast()`，导入失败不再抛 ReferenceError
- **F9 敏感性分析摘要格子取反**：最悲观 = cells[0][0]（-20% 销售/-3pp），最乐观 = cells[4][4]；文字符号同步修正
- **F10 专业模式 tab 跟随 context**：历史记录加载方案后显示与数据模式一致
- **F11 方案对比系列名并集**：MultiCompare 按各方案自己的 tierNames 汇总行，改名后的方案不再整行显示 0

### 输入层（P1/P2）
- **F5 Excel 标签错位**：`excel-parser.ts` 两级匹配（先剥离括号匹配主标签，再原始文本兜底），"销售补差（零售折扣）"不再解析进零售折扣
- **F12 GoalSeekPanel 输入**：目标利润/目标利润率换 NumberInput，删空不再联动清零对方
- **F13 核算模式费用池过滤**：`sumVariableCosts(vc, mode)` 按模式排除专属项，两套费用不再重复计入；CategoryWizard 切换模式不再覆盖已填数据
- **F14 NumberInput 拒绝科学计数法**：`1e5`/`1e999` 不再提交（防 Infinity 污染模型）
- **F15 金额输入 draft 缓冲**：销售额/销量/补贴/固定费用/金额模式统一换 `NumberInput`（通用化 PercentInput：scale/integer/placeholder），"12.5" 中间态不再被回写破坏

### 工程改进
- **tsc 清零**：修掉全部 17 个存量类型错误（ScenarioCompare MetricDef、InlineCategoryEditor Props、Set 迭代 target 问题），`tsc --noEmit -p tsconfig.web.json` 从 17 错误 → 0
- **测试**：`npm test` 15 用例（PercentInput 解析/组件状态机 + 保本点含补贴 + sumVariableCosts 模式过滤）

## 修复 #1：macOS activate 事件导致 IPC handler 重复注册崩溃

**文件**：`src/main/index.ts`

**严重程度**：🔴 启动即崩溃

**现象**：打开应用后，关闭所有窗口，再点击 Dock 图标重新激活窗口时，应用崩溃并报错：

```
Uncaught Exception:
Error: Attempted to register a second handler for 'scenarios:list'
```

**根因**：`registerIpcHandlers()` 调用被放在 `createWindow()` 函数内部。在 macOS 上，`createWindow()` 会被调用多次：

- `app.whenReady().then(createWindow)` → 第一次
- `app.on('activate', () => { if (...) createWindow() })` → 用户点 Dock 图标时再次调用

每次 `createWindow()` 都尝试注册已经存在 IPC handler，Electron 抛出异常。

**修复方式**：将 `registerIpcHandlers()` 移到 `createWindow()` 外部，作为模块顶层调用，确保全局只执行一次。

```diff
 function createWindow() {
-  registerIpcHandlers()  // ← 每次创建窗口都注册，导致重复
   // ...
 }
+
+registerIpcHandlers()  // ← 移到外部，只执行一次
```

---

## 修复 #2：`crypto.randomUUID()` 未导入 crypto 模块

**文件**：
- `src/main/ipc-handlers.ts`（第 15 行）
- `src/main/database.ts`（第 134 行）

**严重程度**：🔴 保存/克隆方案时崩溃

**现象**：用户点击「保存方案」或「克隆方案」时应用崩溃，报错：

```
ReferenceError: crypto is not defined
```

**根因**：两处代码直接使用了 `crypto.randomUUID()` 生成唯一 ID，但没有 `import crypto from 'crypto'`。

在 Node.js 中，`crypto` **不是**全局变量（不像 `console`、`Buffer`、`process`），必须显式导入。Windows 版本未触发此 bug 可能是因为测试时未走保存/克隆流程。

**影响范围**：
- `ipc-handlers.ts`：`scenarios:create` handler → 保存新方案时崩溃
- `database.ts`：`cloneScenario()` → 克隆方案时崩溃

**修复方式**：在两个文件中添加 `import crypto from 'crypto'`。

```diff
+import crypto from 'crypto'
```

---

## 编译环境问题（非代码 bug）

**问题**：`node_modules` 从 Windows 机器直接复制到 Mac，缺少 macOS arm64 原生模块（如 `@rollup/rollup-darwin-arm64`），导致编译失败。

**解决**：删除 `node_modules` 和 `package-lock.json`，在 Mac 上重新 `npm install`。

---

## 配置补充

构建 macOS 版本时做了以下配置补充：

1. **`electron-builder.yml`**：补充了 `mac.icon` 和 `mac.target`（dmg + zip）
2. **`build/entitlements.mac.plist`**：新建了 macOS 权限声明文件（`allow-unsigned-executable-memory` + `allow-jit`）
