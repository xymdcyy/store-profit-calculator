# DESIGN.md — TCL门店盈利测算（合并版）

> 给 AI 编码代理的设计规范。放入项目根目录后，AI 工具可据此生成风格一致的 UI。

---

## 1. 品牌与色彩

### 主色板（TCL 品牌红色系）

| Token | 值 | 用途 |
|---|---|---|
| `--primary` | `#E4002B` | 主按钮、链接、活跃态、焦点环 |
| `--primary-hover` | `#C50024` | 按钮/链接 hover |
| `--secondary` | `#FDE8EC` | 浅红背景标签、次级按钮底色 |
| `--secondary-foreground` | `#333942` | 次级按钮文字 |
| `--accent-foreground` | `#8B0019` | 强调文字（深红） |

### 语义色

| Token | 值 | 用途 |
|---|---|---|
| `--positive` | `#34a853` | 盈利、增长、正值、成功状态 |
| `--negative` | `#ea4335` | 亏损、下降、负值、错误状态 |
| `--warning` | `#fbbc05` | 警告、临界值、需关注 |
| `--warning-soft` | `#fef3c7` | 警告背景（浅黄） |
| `--danger-soft` | `#fee2e2` | 错误背景（浅红） |
| `--success-soft` | `#d1fae5` | 成功背景（浅绿） |

### 中性色

| Token | 值 | 用途 |
|---|---|---|
| `--background` | `#ffffff` | 页面底色 |
| `--card` | `#ffffff` | 卡片/面板背景 |
| `--muted` | `#eff1f4` | 分隔线、禁用态底色 |
| `--muted-foreground` | `#7f8d9f` | 次要文字、说明文字 |
| `--border` | `#ebebeb` | 卡片/输入框边框 |
| `--input` | `#e2e3e4` | 输入框边框（略深） |

### 侧边栏

| Token | 值 | 用途 |
|---|---|---|
| `--sidebar` | `#FFF5F6` | 侧边栏背景（浅红） |
| `--sidebar-primary` | `#E4002B` | 侧边栏主色 |
| `--sidebar-accent` | `#FDE8EC` | 侧边栏选中背景 |
| `--sidebar-accent-foreground` | `#8B0019` | 侧边栏选中文字 |
| `--sidebar-border` | `#F5D0D6` | 侧边栏边框 |

### 图表色（Recharts）

按使用顺序：`#E4002B` → `#ea4335` → `#fbbc05` → `#34a853` → `#B91C3C`

> **规则**：图表线条主色用 `#E4002B`（TCL 红），保本线用 `#f59e0b`（amber），网格线用 `#f1f5f9`（slate-100）。

---

## 2. 字体

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
--font-mono: 'SF Mono', 'Cascadia Code', 'Consolas', 'Microsoft YaHei', monospace;
```

| 场景 | 字号 | 字重 | 备注 |
|---|---|---|---|
| KPI 数值 | `text-2xl` (24px) | `font-bold` | `tabular-nums` 等宽数字 |
| 卡片标题 | `text-[11px]` | `font-medium` | `uppercase tracking-wider` |
| 正文 | `text-sm` (14px) | normal | 默认 |
| 辅助说明 | `text-[11px]` | normal | `text-[var(--text-muted)]` |
| 公式/代码 | `text-xs` (12px) | `font-mono` | tooltip 内公式 |

---

## 3. 间距与圆角

- **基础间距单位**：`0.24rem`（≈ 3.84px），Tailwind 中用 `gap-3`（12px）或 `gap-4`（16px）
- **圆角**：`--radius: 0.5rem`（8px），大圆角 `--radius-lg: 0.75rem`（12px）
- **卡片内边距**：`p-4`（16px）
- **页面外边距**：`p-4 sm:p-6`

---

## 4. 组件规范

### 4.1 卡片（Surface）

```tsx
<div className="surface p-4">         // 标准卡片
<div className="surface-elevated ..."> // 带更大圆角的卡片
```

- 背景：`var(--card)`
- 边框：`1px solid var(--border)`
- 圆角：`var(--radius)` / `var(--radius-lg)`
- **无阴影**，用边框区分层级

### 4.2 KPI 卡片

```
┌─────────────────────┐
│ 销售额保本点          │  ← 11px, uppercase, muted, tracking-wider
│ ¥128,000            │  ← 24px, bold, tabular-nums
│ 加权 CMR 42.5%      │  ← 11px, muted, tabular-nums
└─────────────────────┘
```

- 4 列网格：`grid grid-cols-2 lg:grid-cols-4 gap-3`
- 盈利数字用 `text-emerald-600`，亏损用 `text-red-500`
- hover 显示 tooltip（深色背景 `bg-gray-900 text-white`，11px）

### 4.3 按钮

- 主按钮：`bg-[var(--primary)] text-white`，active 时 `translateY(1px)`（`.btn-press:active`）
- 次级按钮：`bg-[var(--secondary)] text-[var(--secondary-foreground)]`
- 危险按钮：`bg-[var(--destructive)] text-white`

### 4.4 输入框

- 边框：`var(--input)` (`#e2e3e4`)
- focus 环：`ring-2 ring-[var(--ring)]`
- 隐藏数字输入框的增减按钮（已全局 CSS 处理）

### 4.5 图表（Recharts）

- 容器用 `useContainerSize` hook 自适应宽高
- 图表区高度：`h-[280px] sm:h-[320px]`
- 网格：`strokeDasharray="3 3" stroke="#f1f5f9"`
- 坐标轴：`stroke="#94a3b8"`，tick `fontSize: 11`
- 金额格式：≥1万显示为 `X.X万`，否则显示千分位
- Tooltip 格式：`¥xxx` + 系列名

---

## 5. 布局模式

项目有两个模式（`modes/`）：

| 模式 | 目录 | 适用场景 |
|---|---|---|
| **simple** | `modes/simple/` | 门店简洁版，KPI 卡片 + CVP 图 + 阶梯图 |
| **professional** | `modes/professional/` | 专业版，瀑布图 + 饼图 + 成本堆叠图 |

### 通用布局

```
┌──────────────────────────────────────┐
│ AppShell（顶部导航/模式切换）          │
├──────────────────────────────────────┤
│  KpiCards（2×2 / 4×1 网格）          │
├──────────────────────────────────────┤
│  图表区域（单列堆叠）                  │
│  ┌─────────────────────────────────┐ │
│  │ CvpChart / StepChart / ...      │ │
│  └─────────────────────────────────┘ │
├──────────────────────────────────────┤
│  输入/编辑区域（表单）                 │
└──────────────────────────────────────┘
```

---

## 6. 动效

- **极简**：仅 tooltip 用 `transition-all duration-150`
- **按钮点击**：`translateY(1px)` 微下沉（`.btn-press:active`）
- **无入场动画**、无页面过渡（Electron 桌面应用，速度优先）

---

## 7. 国际化与格式

- **语言**：简体中文
- **货币**：人民币 `¥`，数字用千分位分隔
- **大额缩写**：≥1万 → `X.X万`
- **百分比**：存储为小数（`0.425`），显示为 `42.5%`
- **等宽数字**：所有数值用 `tabular-nums`

---

## 8. TailwindCSS 使用约定

- 使用 TailwindCSS 4（`@import "tailwindcss"`）
- 自定义属性通过 `var(--xxx)` 引用，不用 `@apply`
- 响应式断点：`sm:`（640px+），`lg:`（1024px+）
- 组件 className 保持简短，复杂样式抽到 `index.css` 的 `.surface` / `.surface-elevated`

---

## 9. 禁止事项

- ❌ 不用阴影（`shadow-*`），用边框区分层级
- ❌ 不用渐变背景
- ❌ 不用 emoji 做图标（如需图标用 SVG 或文字）
- ❌ 不引入新的 CSS 框架或组件库
- ❌ 不修改 `--primary` 等核心色值（保持 TCL 品牌一致性）
- ❌ 不用 `@apply`，直接写 Tailwind class
