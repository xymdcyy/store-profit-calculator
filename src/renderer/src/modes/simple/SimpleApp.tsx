import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScenarioProvider, useScenario } from '../../shared/context/ScenarioContext'
import { useMode } from '../../shell/ModeContext'
import { useToast } from '../../components/ui/toast'
import ErrorBoundary from '../../shell/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'
import KpiCards from './components/common/KpiCards'
import TierInput from './components/inputs/TierInput'
import VariableCostInput from './components/inputs/VariableCostInput'
import FixedCostInput from './components/inputs/FixedCostInput'
import ContributionBarChart from './components/charts/ContributionBarChart'
import StepChartMulti from './components/charts/StepChartMulti'
import CvpChart from './components/charts/CvpChart'
import AnalysisPanel from './components/analysis/AnalysisPanel'
import ScenarioCompare from './components/analysis/ScenarioCompare'
import MultiCompare from './components/analysis/MultiCompare'
import SeriesRemovalModal from './components/inputs/SeriesRemovalModal'
import CategoryWizard from './components/inputs/CategoryWizard'
import InlineCategoryEditor from './components/inputs/InlineCategoryEditor'
import GoalSeekPanel from './components/analysis/GoalSeekPanel'
import BatchCompare from './components/analysis/BatchCompare'
import HelpModal from './components/common/HelpModal'
import { createScenario, updateScenario, importExcel, exportScenario } from './services/api'
import { calcMultiCategory, buildStepChartData } from '../../shared/calc/calculator'
import { defaultScenario } from '../../shared/data/defaultScenario'
import { buildSuggestedName } from '../../shared/data/suggestName'
import type { StoreResult, CategoryData } from '../../shared/types/scenario'

/* ── Single Category View ──────────────────────────── */

function SingleCategoryView() {
  const { state } = useScenario()
  const result = state.result
  const [showRemoval, setShowRemoval] = useState(false)

  return (
    <>
      {result ? (
        <KpiCards result={result} />
      ) : (
        <div className="flex items-center justify-center py-3 text-xs text-[var(--text-muted)] bg-amber-50 border border-amber-100 rounded-lg mb-4">
          暂无有效数据，请填写下方产品结构和费用后自动计算
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 参数区：产品结构 + 变动/固定费用（单栏堆叠，双栏在窄列会挤压文字） */}
        <div className="lg:col-span-2 space-y-0">
          <TierInput />
          <VariableCostInput />
          <FixedCostInput />
          <button onClick={() => setShowRemoval(true)}
            className="w-full mt-3 px-4 py-2 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all btn-press">
            结构调整模拟（砍掉某个系列）
          </button>
        </div>
        {/* 结果区：诊断 → 图表 → 目标反推 */}
        <div className="lg:col-span-3">
          {result ? (
            <>
              <AnalysisPanel />
              <ContributionBarChart data={result.stepChartData} />
              <CvpChart result={result} />
              <GoalSeekPanel />
            </>
          ) : (
            <div className="surface p-6 text-center text-xs text-[var(--text-muted)]">输入数据后将显示图表</div>
          )}
        </div>
      </div>
      <ScenarioCompare currentResult={result} currentScenario={state.scenario} />
      {showRemoval && <SeriesRemovalModal onClose={() => setShowRemoval(false)} />}
    </>
  )
}

/* ── Multi Category View ───────────────────────────── */

interface MultiCategoryViewProps {
  /** 数据被整体替换（导入/向导完成）时通知父组件，用于重置已保存方案关联 */
  onDataChanged?: () => void
}

function MultiCategoryView({ onDataChanged }: MultiCategoryViewProps) {
  const { state, dispatch } = useScenario()
  const { toast } = useToast()
  const scenarioRef = useRef(state.scenario)
  scenarioRef.current = state.scenario
  const [showWizard, setShowWizard] = useState(false)
  const [importing, setImporting] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const mc = state.scenario.multiCategory
  const hasData = mc?.categories && Object.keys(mc.categories).length > 0

  const toggleExpand = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const multiResult = useMemo<StoreResult | null>(() => {
    if (!hasData) return null
    try {
      const base = calcMultiCategory(mc!.categories, state.scenario.storeFixedCosts)
      const stepChartData = buildStepChartData(base, true)
      return { ...base, stepChartData } as StoreResult
    } catch {
      return null
    }
  }, [mc, state.scenario.storeFixedCosts])

  const handleMultiImport = useCallback(async () => {
    setImporting(true)
    try {
      const res = await importExcel('auto')
      if (res.success && res.data) {
        const d = res.data
        if (d.categories && Object.keys(d.categories).length > 0) {
          const prev = scenarioRef.current
          dispatch({
            type: 'LOAD_SCENARIO',
            scenario: {
              ...prev,
              storeName: d.storeName || prev.storeName || '',
              mode: 'multi',
              storeFixedCosts: d.storeFixedCosts || prev.storeFixedCosts || { venueFee: 0, boothCost: 0, laborCost: 0, dailyExpense: 0, operationSupport: 0 },
              multiCategory: { selectedCategories: Object.keys(d.categories), categories: d.categories },
            },
          })
          onDataChanged?.()
        } else {
          toast({ type: 'warning', title: '未解析到多品类数据', message: '请确认模板格式' })
        }
      } else if (res.error !== '用户取消') {
        toast({ type: 'error', title: '导入失败', message: res.error })
      }
    } catch { toast({ type: 'error', title: '导入失败', message: '请确认后端已启动' }) }
    finally { setImporting(false) }
  }, [dispatch])

  const handleWizardComplete = useCallback((data: { categories: Record<string, CategoryData>; storeFC: typeof state.scenario.storeFixedCosts }) => {
    const prev = scenarioRef.current
    dispatch({
      type: 'LOAD_SCENARIO',
      scenario: {
        ...prev,
        mode: 'multi',
        storeFixedCosts: data.storeFC,
        multiCategory: { selectedCategories: Object.keys(data.categories), categories: data.categories },
      },
    })
    onDataChanged?.()
    setShowWizard(false)
  }, [dispatch, onDataChanged])

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] border border-red-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-muted)]">多品类综合测算支持同时分析智屏、白电、空调、CIoT</p>
        <p className="text-xs text-[var(--text-muted)]">自动计算三层加权 CMR，品类级阶梯图 + 系列下钻</p>
        <div className="flex gap-3 mt-3">
          <div className="flex gap-2">
            <button onClick={() => window.electronAPI.downloadTemplate('multi', 'modeA')}
              className="px-3 py-2 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
              下载模板（倒扣制）
            </button>
            <button onClick={() => window.electronAPI.downloadTemplate('multi', 'modeB')}
              className="px-3 py-2 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
              下载模板（顺加制）
            </button>
          </div>
          <button onClick={handleMultiImport} disabled={importing}
            className={`px-4 py-2 text-[11px] font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-all btn-press cursor-pointer ${importing ? 'opacity-50' : ''}`}>
            {importing ? '导入中...' : '导入多品类 Excel'}
          </button>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <div className="h-px flex-1 bg-[var(--border-light)]" />
          <span className="text-[11px] text-[var(--text-muted)]">或</span>
          <div className="h-px flex-1 bg-[var(--border-light)]" />
        </div>
        <button onClick={() => setShowWizard(true)}
          className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--accent-hover)] transition-all btn-press">
          手动填写多品类数据
        </button>
        {showWizard && <CategoryWizard onClose={() => setShowWizard(false)} onComplete={handleWizardComplete} />}
      </div>
    )
  }

  return (
    <>
      {multiResult ? (
        <>
          <KpiCards result={multiResult} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {Object.entries(multiResult.categoryResults).map(([key, cr]) => {
                const catData = state.scenario.multiCategory?.categories?.[key]
                const isExpanded = expandedCats.has(key)
                return (
                  <div key={key} className="surface">
                    <button onClick={() => toggleExpand(key)} className="w-full p-3 flex justify-between items-center text-left hover:bg-[var(--bg)] transition-colors">
                      <div className="flex items-center gap-2">
                        <svg className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">{cr.category}</span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] tabular-nums">CMR {(cr.weightedCMR * 100).toFixed(1)}% · ¥{Math.round(cr.contributionAmount).toLocaleString()}</span>
                    </button>
                    {isExpanded && catData && (
                      <div className="px-3 pb-3 border-t border-[var(--border-light)] pt-3">
                        <InlineCategoryEditor category={key} data={catData} />
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="space-y-2">
                <button onClick={() => setShowWizard(true)}
                  className="w-full px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
                  重新配置
                </button>
                <button onClick={handleMultiImport} disabled={importing}
                  className={`w-full px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press cursor-pointer flex items-center justify-center ${importing ? 'opacity-50' : ''}`}>
                  {importing ? '导入中...' : '导入多品类 Excel'}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => window.electronAPI.downloadTemplate('multi', 'modeA')}
                    className="flex-1 px-2 py-2 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
                    下载模板（倒扣制）
                  </button>
                  <button onClick={() => window.electronAPI.downloadTemplate('multi', 'modeB')}
                    className="flex-1 px-2 py-2 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
                    下载模板（顺加制）
                  </button>
                </div>
              </div>
              {showWizard && <CategoryWizard onClose={() => setShowWizard(false)} onComplete={handleWizardComplete} />}
            </div>
            <div className="lg:col-span-3">
              <AnalysisPanel />
              <StepChartMulti data={multiResult.stepChartData} result={multiResult} />
              <GoalSeekPanel result={multiResult} />
            </div>
          </div>
        </>
      ) : null}
      <MultiCompare currentResult={multiResult} currentScenario={state.scenario} />
    </>
  )
}

/* ── App Content ───────────────────────────────────── */

function SimpleAppContent() {
  const { toggleMode } = useMode()
  const { toast, confirm: toastConfirm } = useToast()
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const { state, dispatch } = useScenario()
  const scenarioRef = useRef(state.scenario)
  scenarioRef.current = state.scenario
  const saveForExportRef = useRef(false)
  const tab = state.tab

  const doImport = useCallback(async (switchTab: boolean) => {
    setImporting(true)
    try {
      const res = await importExcel('auto')
      if (res.success && res.data) {
        const d = res.data
        const prev = scenarioRef.current
        if (d.mode === 'multi' || d.categories) {
          const cats = d.categories || {}
          if (Object.keys(cats).length === 0) { toast({ type: 'warning', title: '未解析到任何品类数据' }); return }
          dispatch({
            type: 'LOAD_SCENARIO',
            scenario: {
              ...prev,
              storeName: d.storeName || prev.storeName || '',
              mode: 'multi',
              storeFixedCosts: d.storeFixedCosts || prev.storeFixedCosts || { venueFee: 0, boothCost: 0, laborCost: 0, dailyExpense: 0, operationSupport: 0 },
              multiCategory: { selectedCategories: Object.keys(cats), categories: cats },
            },
            ...(switchTab ? { tab: 'multi' as const } : {}),
          })
        } else {
          const catData = d.data
          if (!catData?.productStructure || Object.keys(catData.productStructure).length === 0) { toast({ type: 'warning', title: '未解析到产品结构数据' }); return }
          dispatch({
            type: 'LOAD_SCENARIO',
            scenario: {
              ...prev,
              storeName: d.storeName || prev.storeName || '',
              mode: 'single',
              storeFixedCosts: d.storeFixedCosts || prev.storeFixedCosts || { venueFee: 0, boothCost: 0, laborCost: 0, dailyExpense: 0, operationSupport: 0 },
              singleCategory: { category: d.category || '智屏', data: catData },
            },
            ...(switchTab ? { tab: 'single' as const } : {}),
          })
        }
        setSavedId(null)  // 导入的新数据不再关联旧方案，保存走"新建"而非"覆盖"
      } else if (res.error !== '用户取消') {
        toast({ type: 'error', title: '导入失败', message: res.error || '请确认 Excel 格式正确' })
      }
    } catch {
      toast({ type: 'error', title: '导入失败', message: '请确认后端已启动' })
    } finally {
      setImporting(false)
    }
  }, [dispatch])

  const handleImportExcel = useCallback(() => {
    doImport(true)
  }, [doImport])

  const handleExport = useCallback(async () => {
    if (savedId) {
      const res = await exportScenario(savedId)
      if (res && !res.success) toast({ type: 'error', title: '导出失败', message: res.error })
    } else {
      saveForExportRef.current = true
      setSaveName(scenarioRef.current.name || buildSuggestedName(scenarioRef.current))
      setShowSaveDialog(true)
    }
  }, [savedId])

  const handleLoadSample = useCallback(() => {
    dispatch({ type: 'LOAD_SCENARIO', scenario: defaultScenario, tab: 'single' })
    setSavedId(null)
  }, [dispatch])

  const openSaveDialog = useCallback(() => {
    // 未命名过时预填推荐名（门店-品类/多品类-年月），用户仍可自由修改
    setSaveName(scenarioRef.current.name || buildSuggestedName(scenarioRef.current))
    setShowSaveDialog(true)
  }, [])

  const handleSave = useCallback(async (asNew = false) => {
    const s = scenarioRef.current
    if (!saveName.trim()) return
    setSaving(true)
    try {
      let newId: string | null = null
      const payload = { name: saveName.trim(), mode: s.mode, data: s }
      if (savedId && !asNew) {
        await updateScenario(savedId, { name: payload.name, data: s })
        newId = savedId
      } else {
        const res = await createScenario(payload)
        newId = res.id
        setSavedId(res.id)
      }
      dispatch({ type: 'SET_NAME', name: payload.name })
      setShowSaveDialog(false)
      if (saveForExportRef.current && newId) {
        saveForExportRef.current = false
        const expRes = await exportScenario(newId)
        if (expRes && !expRes.success) toast({ type: 'error', title: '导出失败', message: expRes.error })
      }
    } catch {
      toast({ type: 'error', title: '保存失败', message: '请确认后端已启动' })
    }
    setSaving(false)
  }, [savedId, saveName])

  return (
    <AppLayout
      title="TCL门店盈利测算"
      actions={
        <div className="flex gap-1.5">
          <button onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 text-[11px] font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-all btn-press">
            使用帮助
          </button>
          <button onClick={() => setShowTemplateDialog(true)}
            className="px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
            下载模板
          </button>
          {showTemplateDialog && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTemplateDialog(false)}>
              <div className="surface-elevated p-6 w-80" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">选择核算模式</h3>
                <div className="space-y-2">
                  <button onClick={() => { window.electronAPI.downloadTemplate('single', 'modeA'); setShowTemplateDialog(false) }}
                    className="w-full px-4 py-3 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] hover:border-[var(--accent)] text-[var(--text-primary)] transition-all btn-press text-left">
                    <span className="font-semibold">倒扣制核算法</span>
                  </button>
                  <button onClick={() => { window.electronAPI.downloadTemplate('single', 'modeB'); setShowTemplateDialog(false) }}
                    className="w-full px-4 py-3 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] hover:border-[var(--accent)] text-[var(--text-primary)] transition-all btn-press text-left">
                    <span className="font-semibold">顺加制核算法</span>
                  </button>
                </div>
                <button onClick={() => setShowTemplateDialog(false)}
                  className="w-full mt-3 px-4 py-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  取消
                </button>
              </div>
            </div>
          )}
          <button onClick={handleImportExcel} disabled={importing}
            className={`px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all cursor-pointer btn-press ${importing ? 'opacity-50' : ''}`}>
            {importing ? '导入中...' : '导入 Excel'}
          </button>
          <button onClick={async () => { if (await toastConfirm('确定要清空所有输入数据吗？')) { dispatch({ type: 'RESET_DATA' }); setSavedId(null) } }}
            className="px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 text-[var(--text-secondary)] transition-all btn-press">
            清空数据
          </button>
          <button onClick={handleLoadSample}
            className="px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
            加载示例
          </button>
          <button onClick={handleExport}
            className="px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
            导出报告
          </button>
          <button onClick={openSaveDialog} disabled={saving}
            className="px-3 py-1.5 text-[11px] font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all btn-press">
            {saving ? '保存中...' : '保存方案'}
          </button>
          <button onClick={() => setShowBatch(true)}
            className="px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
            批量对比
          </button>
          <button onClick={toggleMode}
            className="px-2.5 py-1.5 text-[11px] font-medium border border-[var(--primary)] text-[var(--primary)] rounded-lg hover:bg-[var(--secondary)] transition-all btn-press">
            切换财务专业模式
          </button>
        </div>
      }
      tabs={
        <>
          <button onClick={() => dispatch({ type: 'SET_TAB', tab: 'single' })}
            className={`px-4 md:px-6 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === 'single' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}>
            单品类测算
          </button>
          <button onClick={() => dispatch({ type: 'SET_TAB', tab: 'multi' })}
            className={`px-4 md:px-6 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === 'multi' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}>
            多品类综合测算
          </button>
        </>
      }
    >
      <AnimatePresence mode="wait">
        {tab === 'single' ? (
          <motion.div key="single" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <ErrorBoundary key="single-err"><SingleCategoryView /></ErrorBoundary>
          </motion.div>
        ) : (
          <motion.div key="multi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <ErrorBoundary key="multi-err"><MultiCategoryView onDataChanged={() => setSavedId(null)} /></ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showBatch && <BatchCompare onClose={() => setShowBatch(false)} />}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSaveDialog(false)}>
          <div className="surface-elevated p-6 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">保存方案</h3>
            <input type="text" value={saveName} autoFocus
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave(false)}
              placeholder="输入方案名称"
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors" />
            <button onClick={() => setSaveName(buildSuggestedName(scenarioRef.current))}
              className="mt-1.5 mb-3 text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors">
              ✨ 智能命名：{buildSuggestedName(scenarioRef.current)}
            </button>
            <div className="flex gap-2 justify-end">
              {savedId && (
                <button onClick={() => handleSave(true)} disabled={saving}
                  className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] transition-all btn-press">
                  另存为新方案
                </button>
              )}
              <button onClick={() => handleSave(false)} disabled={saving || !saveName.trim()}
                className="px-4 py-2 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-all btn-press">
                {saving ? '保存中...' : savedId ? '更新方案' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default function SimpleApp() {
  return (
    <ScenarioProvider>
      <SimpleAppContent />
    </ScenarioProvider>
  )
}
