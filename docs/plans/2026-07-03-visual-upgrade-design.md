# 全面视觉升级设计方案

> 日期：2026-07-03 | 状态：实施中

## 目标

在保持现有架构稳定的前提下，全面提升 TCL 门店盈利测算应用的视觉和交互质量，使其接近专业级桌面应用水准。

## 模块清单

### 1. 卡片阴影 & 视觉层次
- `.surface` 加 `shadow-sm`（0 1px 3px rgba(0,0,0,0.04)）
- `.surface-elevated` 加 `shadow-md`（0 4px 12px rgba(0,0,0,0.08)）
- 所有模态框统一 `backdrop-blur-sm`

### 2. Toast 通知系统
- 新建 `Toast` 组件（Framer Motion，右上角堆叠）
- 3 种类型：success（绿）、error（红）、warning（黄）
- 确认操作改为页面内确认弹窗
- 替换所有 `alert()` 和 `confirm()`

### 3. 表格 & 输入增强
- 表格行 hover 高亮 + 左侧红色指示条
- 数字输入框加 `-`/`+` stepper 按钮
- 费用分组用 GlowingCard 包裹 + 分组标题
- FixedCostInput 合计行加粗红色高亮

### 4. Loading 骨架屏
- 新建 `Skeleton` 组件（animate-pulse）
- KPI 卡片加载态占位
- 图表区域加载态占位

### 5. Tab 切换过渡
- AnimatePresence + motion.div 渐入渐出
- 侧边栏活跃项 layoutId 滑动背景

### 6. 图表 Tooltip 统一样式
- 深色背景（bg-gray-900）+ 白色文字
- 左侧 3px TCL 红色指示条
- 数值用 tabular-nums + font-mono

## 不做的事
- 暗色模式
- 页面结构调整
- 新增功能
