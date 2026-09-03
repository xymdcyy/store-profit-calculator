# 灵犀平台 3.0 迁移（方案 A：纯对话 chatflow）

TCL门店盈利测算系统（原 Electron 桌面应用）迁移到 TCL AI 灵犀平台 3.0 的 DSL 开发工作区。

## 目录结构

```
lingxi/
├── calc_engine.py            # 计算引擎 + 格式化 + SVG（从 TS 纯函数移植，单一真相源）
├── test_calc_engine.py       # 移植验证测试（63 条）
├── generate_lingxi_dsl.py    # DSL 生成器（读取 calc_engine.py 内嵌进 code 节点）
├── TESTCASES.md              # 平台验收测试用例（10 个，含期望值）
└── out/
    └── TCL门店盈利测算智能体.yml   # 生成产物，可直接导入平台（零插件依赖）
```

## 用法

```powershell
# 1. 验证引擎正确性
uv run python -X utf8 lingxi/test_calc_engine.py

# 2. 生成 DSL（改 calc_engine.py 后重跑即可）
uv run python -X utf8 lingxi/generate_lingxi_dsl.py
```

## 节点拓扑

```
start（用户输入文字/上传文件）
  → if-else（是否上传文件）
      ├─ true  → 文档提取器（xlsx/csv → markdown 表格）
      └─ false ──────────────────────────┐
                                          ↓
  → LLM 参数抽取（intent + structured_output，context 注入文件文本）
  → code 盈利测算（calc_engine.py 内嵌，按 intent 路由 + SVG 生成）
  → LLM 经营诊断（只写叙事，数字由引擎直接展示）
  → answer 直接回复（facts_text + LLM叙事 + chart_svg）
```

**三种意图（单条消息即可完成，无需跨轮状态）**：
- `calc`：普通测算 → 核心指标表 + 阶梯表 + 诊断叙事 + SVG 瀑布图 + CVP 图
- `goal_seek`：目标利润反推 → 核心指标 + 方案A/B/C + 可行性评分 + 多变量组合
- `compare`：多方案对比 → 对比表 + 利润对比柱状 SVG
- `chat`：追问/闲聊 → 交给诊断 LLM 的对话记忆窗口，结合上一轮结果回答（**修复追问崩溃**）

### 多轮追问的处理（关键修复）

原实现每条消息无状态重算，追问时抽取节点抽不到品类数据 → `parsed[0]` 抛 IndexError 崩溃。

修复三层：
1. **引擎守卫**：`route()` 纯函数收口路由，`parsed` 为空时返回 `_no_data()` 友好引导（不再崩溃）。
2. **`chat` 意图**：追问判断为 chat，返回空 facts + 引导 guidance，不重算。
3. **开启两个 LLM 节点的 memory 窗口**（`enabled: true, size: 10`）：诊断 LLM 能"记得"上一轮已展示的核心指标表/阶梯表/诊断结论，据此回答追问。这是追问能正确回答的核心，而不只是不崩溃。

### 修改重算（增量修改）

用户说「把 S 系列毛利改成 10%」时要**重新计算**，而非当追问敷衍。方案（不依赖 conversation_variables 的赋值语法，那在官方样例里全是空、无法本地验证）：

1. **answer 末尾附带「本次测算输入数据」快照**（`format_input_snapshot`，含 X/C/P/S 原始明细 + 固定费用）。它作为纯文本进入对话历史。
2. **抽取节点 memory 窗口**（已开）下一轮能读到这份明细；抽取 prompt 有「修改重算」规则：判为 `calc` 并**把增量修改合并成完整新数据**（保留未改字段）。
3. code 节点照常计算，**计算层零改动**——重算面对的是"合并后的完整数据"。

这样修改重算走的是「LLM 记忆 + 增量合并」，完全绕开了 conversation_variables 的赋值语法风险。

### 模型

已切至 **DeepSeek-V4-Pro**（`provider: tcl_tech/tcl_private/vllm`，官方「请假单」样例验证过的写法，与 V3.1 同 provider 仅 name 不同）。

### Excel 导入（阶段4）

Dify 官方文档确认「文档提取器」节点支持 Excel（`.xls/.xlsx`）和 CSV → 转 markdown 表格，输出变量名 `text`。

方案：`start → if-else(sys.files 是否非空) → true 走文档提取器 → 抽取节点`。文档提取器的 `text` 作为抽取节点的 context 注入，抽取 prompt 已加「优先从文档表格读数据」规则。计算层零改动（仍是抽取 → route → 计算）。

**需平台实测**：文档提取器对 xlsx 的实际提取效果（字段名对齐、表格转 markdown 的规整度）只能在平台验证。

## 两个关键架构决策

### 1. 数字 100% 绕过 LLM（根治口径错误）

诊断 LLM 会无视「照抄」指令、自己重算指标导致口径全错（曾出现 CMR 12.82%、保本 31.98万 等错值）。

**方案**：code 节点输出拆两条——
- `facts_text`：全部数字（核心指标表/阶梯表/目标反推/方案对比），由引擎 `format_*` 纯函数格式化
- `guidance_text`：仅有「盈利状态 + 建议线索」文本，无原始数字

answer 节点 = `facts_text + LLM叙事 + chart_svg`。LLM 拿不到原始数字，物理上无法重算。

### 2. SVG 图表（零插件依赖）

平台图表工具 `mcp-server-chart` 只存在于 agent 节点内部，而 agent 节点依赖 `langgenius/agent` 插件（ReAct 策略）——该插件未安装会报错。

**方案**：code 节点的 Python 直接用已有数据拼 **SVG**（纯文本）：
- `waterfall_svg()`：阶梯边际贡献瀑布图（**真实瀑布** + 橙色虚线净固定费参考线）
- `cvp_svg()`：量本利折线图（收入线 vs 总成本线 + 保本点圆点标记）
- `compare_bar_svg()`：方案利润对比柱状图

SVG 比 mcp-server-chart 的堆叠柱状图还原度更高（能画真瀑布 + 参考线）。

### 「两个保本」口径（重要）

- 核心指标表 `breakevenSales` = 净固定费用 ÷ 加权 CMR（**按当前结构均摊**）
- 阶梯表「优先序覆盖点」= 按高 CMR 先卖、首次覆盖净固定费的位置

两者意义不同，措辞已区分，避免混淆。

## 与报名表承诺的对照

| 承诺 | 现状 |
|---|---|
| 4大品类 | ✅ categories 数组支持 智屏/白电/空调/CIoT |
| 2渠道模式 | ✅ cost_mode modeA(倒扣)/modeB(顺加) |
| 4级产品结构 | ✅ X/C/P/S |
| 阶梯边际贡献图 | ✅ SVG 真实瀑布 + 保本参考线 |
| 量本利 CVP 图 | ✅ SVG 折线 + 保本点 |
| 智能诊断面板 | ✅ analyze() 规则 + LLM 润色 |
| 目标利润反推 | ✅ intent=goal_seek |
| 方案对比 | ✅ intent=compare |

## 已知限制 / 下一步

1. **SVG 渲染需平台实测**：唯一不确定项是对话窗口是否渲染内嵌 SVG/HTML。请假单样例（`template-transform` 输出 `<form>`）证明前端能渲染 HTML，SVG 大概率可以，但必须实测确认。若 SVG 不渲染，回退方案：装 `langgenius/agent` 插件走 mcp-server-chart（旧路径），或临时用 markdown 表格。
2. **敏感性分析**（阶段3可选）：引擎已移植 `build_sensitivity_matrix`，未接对话（热力图无法在 SVG 低成本复现，价值打折）。
3. **Excel 导入**（阶段4）：引擎已移植解析逻辑，未接对话。平台走 document-extractor 节点。
4. **明确不做**：趋势分析、历史记录、期间保存、成本堆叠图（专业版月报场景）。