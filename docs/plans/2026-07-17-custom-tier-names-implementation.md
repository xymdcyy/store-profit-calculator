# 系列名自定义 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将硬编码的 XCPS 系列名改为按品类自定义，系列数量保持 4 个，模板导入导出自动适配。

**Architecture:** 在 `CategoryData` 类型中新增 `tierNames` 字段，用系列名作为 `productStructure` 的 key。旧数据通过迁移函数自动兼容。模板生成和 Excel 解析改为动态读取系列名。UI 组件从数据层读取 `tierNames` 而非硬编码。

**Tech Stack:** TypeScript, React, ExcelJS, Electron IPC

---

## Task 1: 数据模型 — 类型定义

**Files:**
- Modify: `src/renderer/src/shared/types/scenario.ts`

**Step 1:** 在 `CategoryData` 接口的 `costMode` 下方添加 `tierNames: [string, string, string, string]`

---

## Task 2: 数据模型 — 默认数据

**Files:**
- Modify: `src/renderer/src/shared/data/defaultScenario.ts`

**Step 1:** 在 `emptyScenario` 和 `defaultScenario` 的 `singleCategory.data` 中添加 `tierNames: ['X', 'C', 'P', 'S']`

---

## Task 3: 数据模型 — 迁移函数 + 重命名 action

**Files:**
- Modify: `src/renderer/src/shared/context/ScenarioContext.tsx`

**Step 1:** 添加 `migrateTierNames` 迁移函数
**Step 2:** 在 `LOAD_SCENARIO` case 中调用迁移
**Step 3:** 新增 `RENAME_TIER` action 类型和实现

---

## Task 4: 模板生成 — 动态系列名

**Files:**
- Modify: `src/main/template-generator.ts`

**Step 1-5:** 函数签名增加 tierNames 参数，表头动态生成

---

## Task 5: Excel 解析 — 动态读取表头

**Files:**
- Modify: `src/main/excel-parser.ts`

**Step 1-5:** 移除 TIER_NAMES 常量，从表头动态读取

---

## Task 6: IPC 层 — 传递 tierNames

**Files:**
- Modify: `src/main/ipc-handlers.ts`

---

## Task 7-11: UI 组件

- TierInput.tsx, InlineCategoryEditor.tsx, CategoryWizard.tsx
- MultiCompare.tsx, ScenarioCompare.tsx
- HelpModal.tsx

---

## Task 12: 验证 & 提交
