import { createContext, useContext, useReducer, useRef, type Dispatch, type ReactNode } from 'react'
import type { CalculationScenario, CategoryData, StoreResult } from '../types/scenario'
import { calcSingleStore, calcMultiCategory, buildStepChartData } from '../calc/calculator'
import { normalizeCategoryName } from '../constants/categories'
import { emptyScenario } from '../data/defaultScenario'

interface State {
  scenario: CalculationScenario
  result: StoreResult | null
  tab: 'single' | 'multi'
}

type Action =
  | { type: 'LOAD_SCENARIO'; scenario: CalculationScenario; tab?: 'single' | 'multi' }
  | { type: 'SET_TAB'; tab: 'single' | 'multi' }
  | { type: 'RESET_DATA' }
  | { type: 'UPDATE_TIER'; tier: string; field: string; value: number }
  | { type: 'UPDATE_VARIABLE_COST'; field: string; value: number }
  | { type: 'UPDATE_FIXED_COST'; field: string; value: number }
  | { type: 'UPDATE_CATEGORY_EXCLUSIVE_FC'; category: string; field: string; value: number }
  | { type: 'SWITCH_COST_MODE'; mode: 'modeA' | 'modeB' }
  | { type: 'UPDATE_PERIOD'; period: string }
  | { type: 'UPDATE_MULTI_TIER'; category: string; tier: string; field: string; value: number }
  | { type: 'UPDATE_MULTI_VARIABLE_COST'; category: string; field: string; value: number }
  | { type: 'SWITCH_MULTI_COST_MODE'; category: string; mode: 'modeA' | 'modeB' }
  | { type: 'SET_NAME'; name: string }
  | { type: 'RENAME_TIER'; category: string; oldName: string; newName: string }

/** 迁移旧数据：为没有 tierNames 的 CategoryData 补充默认值 */
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

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_SCENARIO': {
      // 规范化品类名（兼容旧数据中的英文key）
      const s = { ...action.scenario }
      if (s.singleCategory) {
        s.singleCategory.data.category = normalizeCategoryName(s.singleCategory.data.category)
        s.singleCategory.category = normalizeCategoryName(s.singleCategory.category)
        s.singleCategory.data = migrateTierNames(s.singleCategory.data)
      }
      if (s.multiCategory) {
        const norm: Record<string, any> = {}
        for (const [key, val] of Object.entries(s.multiCategory.categories)) {
          const nk = normalizeCategoryName(key)
          const v = migrateTierNames(val as CategoryData) as any
          if (v.category) v.category = normalizeCategoryName(v.category)
          norm[nk] = v
        }
        s.multiCategory = { ...s.multiCategory, categories: norm, selectedCategories: s.multiCategory.selectedCategories?.map(normalizeCategoryName) }
      }
      // tab 未显式指定时跟随数据模式，避免"切换查看"污染已保存方案的 mode
      return { ...state, scenario: s, tab: action.tab ?? (s.mode === 'multi' ? 'multi' : 'single') }
    }

    case 'SET_TAB': {
      // 只切换查看标签，不改写 scenario.mode（保存时以数据实际模式落库）
      return { ...state, tab: action.tab }
    }

    case 'RESET_DATA':
    case 'UPDATE_TIER':
    case 'UPDATE_VARIABLE_COST':
    case 'UPDATE_FIXED_COST':
    case 'UPDATE_CATEGORY_EXCLUSIVE_FC':
    case 'SWITCH_COST_MODE': {
      const s = JSON.parse(JSON.stringify(state.scenario)) as CalculationScenario

      if (action.type === 'RESET_DATA') {
        if (s.singleCategory?.data?.productStructure) {
          for (const t of Object.values(s.singleCategory.data.productStructure)) {
            t.sales = 0; t.volume = 0; t.grossMargin = 0; t.subsidy = 0
          }
        }
        if (s.multiCategory?.categories) {
          for (const cat of Object.values(s.multiCategory.categories)) {
            if (cat.productStructure) {
              for (const t of Object.values(cat.productStructure)) {
                t.sales = 0; t.volume = 0; t.grossMargin = 0; t.subsidy = 0
              }
            }
            if (cat.variableCosts) {
              for (const k of Object.keys(cat.variableCosts)) {
                (cat.variableCosts as any)[k] = 0
              }
            }
          }
        }
        if (s.singleCategory?.data?.variableCosts) {
          for (const k of Object.keys(s.singleCategory.data.variableCosts)) {
            (s.singleCategory.data.variableCosts as any)[k] = 0
          }
        }
        for (const k of Object.keys(s.storeFixedCosts)) {
          (s.storeFixedCosts as any)[k] = 0
        }
      }

      if (action.type === 'UPDATE_TIER') {
        if (s.singleCategory) {
          const tier = s.singleCategory.data.productStructure[action.tier]
          if (tier) (tier as any)[action.field] = action.value
        } else {
          console.warn('UPDATE_TIER ignored: 当前方案模式不是单品类')
        }
      }

      if (action.type === 'UPDATE_VARIABLE_COST') {
        if (s.singleCategory) {
          (s.singleCategory.data.variableCosts as any)[action.field] = action.value
        } else {
          console.warn('UPDATE_VARIABLE_COST ignored: 当前方案模式不是单品类')
        }
      }

      if (action.type === 'UPDATE_FIXED_COST') {
        (s.storeFixedCosts as any)[action.field] = action.value
      }

      if (action.type === 'UPDATE_CATEGORY_EXCLUSIVE_FC') {
        if (s.multiCategory?.categories[action.category]?.exclusiveFixedCosts) {
          (s.multiCategory.categories[action.category].exclusiveFixedCosts! as any)[action.field] = action.value
        }
      }

      if (action.type === 'SWITCH_COST_MODE') {
        if (s.singleCategory) {
          s.singleCategory.data.costMode = action.mode
        }
      }

      return { ...state, scenario: s }
    }

    case 'SET_NAME':
      return { ...state, scenario: { ...state.scenario, name: action.name } }

    case 'UPDATE_PERIOD':
      return { ...state, scenario: { ...state.scenario, periodLabel: action.period } }

    case 'UPDATE_MULTI_TIER': {
      const s = JSON.parse(JSON.stringify(state.scenario)) as CalculationScenario
      const tier = s.multiCategory?.categories[action.category]?.productStructure?.[action.tier]
      if (tier) (tier as any)[action.field] = action.value
      return { ...state, scenario: s }
    }

    case 'UPDATE_MULTI_VARIABLE_COST': {
      const s = JSON.parse(JSON.stringify(state.scenario)) as CalculationScenario
      const vc = s.multiCategory?.categories[action.category]?.variableCosts
      if (vc) (vc as any)[action.field] = action.value
      return { ...state, scenario: s }
    }

    case 'SWITCH_MULTI_COST_MODE': {
      const s = JSON.parse(JSON.stringify(state.scenario)) as CalculationScenario
      const cat = s.multiCategory?.categories[action.category]
      if (cat) cat.costMode = action.mode
      return { ...state, scenario: s }
    }

    case 'RENAME_TIER': {
      const s = JSON.parse(JSON.stringify(state.scenario)) as CalculationScenario
      const target = action.category === ''
        ? s.singleCategory?.data
        : s.multiCategory?.categories[action.category]
      if (!target) return state
      const { oldName, newName } = action
      if (oldName === newName) return state
      if (target.tierNames.includes(newName)) return state
      const idx = target.tierNames.indexOf(oldName)
      if (idx === -1) return state
      target.tierNames[idx] = newName
      // 重命名 productStructure key
      const oldPS = target.productStructure
      const newPS: Record<string, any> = {}
      for (const [k, v] of Object.entries(oldPS)) {
        newPS[k === oldName ? newName : k] = v
      }
      target.productStructure = newPS
      return { ...state, scenario: s }
    }
  }
}

const ScenarioContext = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null)

function computeResult(scenario: CalculationScenario): StoreResult | null {
  try {
    if (scenario.mode === 'single' && scenario.singleCategory) {
      return calcSingleStore(scenario.storeName, scenario.singleCategory.data, scenario.storeFixedCosts)
    }
    if (scenario.mode === 'multi' && scenario.multiCategory) {
      const r = calcMultiCategory(scenario.multiCategory.categories, scenario.storeFixedCosts)
      return { ...r, stepChartData: buildStepChartData(r, true) }
    }
    return null
  } catch (e) {
    console.error('计算失败:', e, scenario)
    return null
  }
}

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { scenario: emptyScenario, result: null, tab: 'single' as const })

  const prevJsonRef = useRef('')
  const prevResultRef = useRef<StoreResult | null>(null)
  const prevCtxRef = useRef<{ state: State; dispatch: Dispatch<Action> } | null>(null)
  const prevCtxJsonRef = useRef('')

  const scenarioJson = JSON.stringify(state.scenario)
  if (scenarioJson !== prevJsonRef.current) {
    prevJsonRef.current = scenarioJson
    prevResultRef.current = computeResult(state.scenario)
  }

  const result = prevResultRef.current

  if (!prevCtxRef.current || scenarioJson !== prevCtxJsonRef.current || prevCtxRef.current.state.result !== result || prevCtxRef.current.state.tab !== state.tab) {
    prevCtxJsonRef.current = scenarioJson
    prevCtxRef.current = { state: { scenario: state.scenario, result, tab: state.tab }, dispatch }
  }

  return (
    <ScenarioContext.Provider value={prevCtxRef.current}>
      {children}
    </ScenarioContext.Provider>
  )
}

export function useScenario() {
  const ctx = useContext(ScenarioContext)
  if (!ctx) throw new Error('useScenario must be used within ScenarioProvider')
  return ctx
}
