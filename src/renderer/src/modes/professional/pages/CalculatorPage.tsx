import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useScenario } from '../../../shared/context/ScenarioContext'
import { useToast } from '../../../components/ui/toast'
import { calcMultiCategory, buildStepChartData } from '../../../shared/calc/calculator'
import TierInput from '../../simple/components/inputs/TierInput'
import VariableCostInput from '../../simple/components/inputs/VariableCostInput'
import FixedCostInput from '../../simple/components/inputs/FixedCostInput'
import KpiCards from '../../simple/components/common/KpiCards'
import CategoryWizard from '../../simple/components/inputs/CategoryWizard'
import InlineCategoryEditor from '../../simple/components/inputs/InlineCategoryEditor'
import SeriesRemovalModal from '../../simple/components/inputs/SeriesRemovalModal'
import GoalSeekPanel from '../../simple/components/analysis/GoalSeekPanel'
import MultiCompare from '../../simple/components/analysis/MultiCompare'
import BatchCompare from '../../simple/components/analysis/BatchCompare'
import { importExcel, exportScenario, createScenario, updateScenario } from '../../simple/services/api'
import { defaultScenario } from '../../../shared/data/defaultScenario'
import { buildSuggestedName } from '../../../shared/data/suggestName'
import { GlowingCard } from '../../../components/aceternity/GlowingCard'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import type { InputMode, StoreResult, CategoryData } from '../../../shared/types/scenario'

export default function CalculatorPage() {
  const { state, dispatch } = useScenario()
  const { toast, confirm: toastConfirm } = useToast()
  const [inputMode, setInputMode] = useState<InputMode>('rate')
  const tab = state.tab  // 跟随 context 标签，加载方案后与数据模式保持一致
  const [showWizard, setShowWizard] = useState(false)
  const [showRemoval, setShowRemoval] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const scenarioRef = useRef(state.scenario)
  scenarioRef.current = state.scenario
  const saveForExportRef = useRef(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')

  const result = state.result
  const mc = state.scenario.multiCategory
  const hasMultiData = mc?.categories && Object.keys(mc.categories).length > 0

  const multiResult = useMemo<StoreResult | null>(() => {
    if (!hasMultiData) return null
    try {
      const base = calcMultiCategory(mc!.categories, state.scenario.storeFixedCosts)
      return { ...base, stepChartData: buildStepChartData(base, true) } as StoreResult
    } catch { return null }
  }, [mc, state.scenario.storeFixedCosts])

  const displayResult = tab === 'multi' ? multiResult : result

  const handleImport = useCallback(async () => {
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
              ...prev, storeName: d.storeName || prev.storeName || '', mode: 'multi',
              storeFixedCosts: d.storeFixedCosts || prev.storeFixedCosts || { venueFee: 0, boothCost: 0, laborCost: 0, dailyExpense: 0, operationSupport: 0 },
              multiCategory: { selectedCategories: Object.keys(cats), categories: cats },
            },
          })
          dispatch({ type: 'SET_TAB', tab: 'multi' })
        } else {
          if (!d.data?.productStructure || Object.keys(d.data.productStructure).length === 0) {
            toast({ type: 'warning', title: '未解析到产品结构数据' }); return
          }
          dispatch({
            type: 'LOAD_SCENARIO',
            scenario: {
              ...prev, storeName: d.storeName || prev.storeName || '', mode: 'single',
              storeFixedCosts: d.storeFixedCosts || prev.storeFixedCosts || { venueFee: 0, boothCost: 0, laborCost: 0, dailyExpense: 0, operationSupport: 0 },
              singleCategory: { category: d.category || '智屏', data: d.data },
            },
          })
          dispatch({ type: 'SET_TAB', tab: 'single' })
        }
        setSavedId(null)  // 导入的新数据不再关联旧方案，保存走"新建"而非"覆盖"
      } else if (res.error !== '用户取消') {
        toast({ type: 'error', title: '导入失败', message: res.error })
      }
    } catch { toast({ type: 'error', title: '导入失败', message: '请确认后端已启动' }) }
    finally { setImporting(false) }
  }, [dispatch])

  const handleTemplate = (cost: 'modeA' | 'modeB') => {
    window.electronAPI.downloadTemplate(tab, cost)
    setShowTemplate(false)
  }

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
    } catch { toast({ type: 'error', title: '保存失败', message: '请确认后端已启动' }) }
    setSaving(false)
  }, [savedId, saveName])

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

  const handleWizardComplete = useCallback((data: { categories: Record<string, CategoryData>; storeFC: typeof state.scenario.storeFixedCosts }) => {
    dispatch({
      type: 'LOAD_SCENARIO',
      scenario: { ...scenarioRef.current, mode: 'multi', storeFixedCosts: data.storeFC, multiCategory: { selectedCategories: Object.keys(data.categories), categories: data.categories } },
    })
    setShowWizard(false)
  }, [dispatch])

  const handleLoadSample = useCallback(() => {
    dispatch({ type: 'LOAD_SCENARIO', scenario: defaultScenario })
    setSavedId(null)
  }, [dispatch])

  const toggleExpand = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <motion.div
      className="p-6 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-lg font-semibold">测算输入</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBatch(true)}>批量对比</Button>
          {/* Amount/Rate toggle */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button onClick={() => setInputMode('rate')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${inputMode === 'rate' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] hover:bg-[var(--bg)]'}`}>点位</button>
            <button onClick={() => setInputMode('amount')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${inputMode === 'amount' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] hover:bg-[var(--bg)]'}`}>金额</button>
          </div>
          {/* Template */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowTemplate(!showTemplate)}>下载模板</Button>
            <AnimatePresence>
              {showTemplate && (
                <motion.div
                  className="absolute right-0 top-10 bg-white border border-[var(--border)] rounded-lg shadow-lg p-3 z-50 w-56"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  <button onClick={() => handleTemplate('modeA')} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg)] rounded transition-colors">倒扣制核算法</button>
                  <button onClick={() => handleTemplate('modeB')} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg)] rounded transition-colors">顺加制核算法</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button variant="outline" size="sm" onClick={handleImport} disabled={importing}>
            {importing ? '导入中...' : '导入 Excel'}
          </Button>
          <Button variant="outline" size="sm" className="text-[var(--negative)] hover:text-[var(--negative)]" onClick={async () => { if (await toastConfirm('确定清空所有数据吗？')) { dispatch({ type: 'RESET_DATA' }); setSavedId(null) } }}>
            清空
          </Button>
          <Button variant="outline" size="sm" onClick={handleLoadSample}>加载示例</Button>
          <Button variant="outline" size="sm" onClick={handleExport}>导出报告</Button>
          <Button size="sm" onClick={openSaveDialog} disabled={saving}>
            {saving ? '保存中...' : '保存方案'}
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="flex gap-1 border-b border-[var(--border-light)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {(['single', 'multi'] as const).map(t => (
          <button
            key={t}
            onClick={() => dispatch({ type: 'SET_TAB', tab: t })}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t === 'single' ? '单品类测算' : '多品类综合测算'}
          </button>
        ))}
      </motion.div>

      {displayResult && <KpiCards result={displayResult} />}

      <AnimatePresence mode="wait">
        {tab === 'single' ? (
          <motion.div
            key="single"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-4">
            <TierInput />
            <VariableCostInput displayMode={inputMode} totalSales={result?.totalSales ?? 0} />
            <FixedCostInput />
            <Button variant="outline" className="w-full text-[var(--negative)] hover:text-[var(--negative)]" onClick={() => setShowRemoval(true)}>
              结构调整模拟（砍掉某个系列）
            </Button>
            <GoalSeekPanel />
          </div>
          <div>
            <GlowingCard className="p-4">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">输入模式</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                当前为<b>{inputMode === 'rate' ? '点位' : '金额'}</b>模式。
                {inputMode === 'rate' ? '以百分比形式输入各项费用率。' : '以元为单位输入各项费用金额。'}
              </p>
            </GlowingCard>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="multi"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {!hasMultiData ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-sm text-[var(--muted-foreground)]">多品类综合测算支持同时分析智屏、白电、空调、CIoT</p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => window.electronAPI.downloadTemplate('multi', 'modeA')}>下载模板（倒扣制）</Button>
                <Button variant="outline" size="sm" onClick={() => window.electronAPI.downloadTemplate('multi', 'modeB')}>下载模板（顺加制）</Button>
                <Button size="sm" onClick={handleImport} disabled={importing}>
                  {importing ? '导入中...' : '导入多品类 Excel'}
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-px w-20 bg-[var(--border-light)]" />
                <span className="text-[11px] text-[var(--muted-foreground)]">或</span>
                <div className="h-px w-20 bg-[var(--border-light)]" />
              </div>
              <Button onClick={() => setShowWizard(true)}>手动填写多品类数据</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 space-y-3">
                  {multiResult && Object.entries(multiResult.categoryResults).map(([key, cr]) => {
                    const catData = state.scenario.multiCategory?.categories?.[key]
                    const isExpanded = expandedCats.has(key)
                    return (
                      <GlowingCard key={key}>
                        <button onClick={() => toggleExpand(key)} className="w-full p-3 flex justify-between items-center text-left hover:bg-[var(--bg)] transition-colors rounded-xl">
                          <div className="flex items-center gap-2">
                            <svg className={`w-3 h-3 text-[var(--muted-foreground)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            <span className="text-xs font-semibold">{cr.category}</span>
                          </div>
                          <span className="text-[11px] text-[var(--muted-foreground)]">CMR {(cr.weightedCMR * 100).toFixed(1)}% · ¥{Math.round(cr.contributionAmount).toLocaleString()}</span>
                        </button>
                        <AnimatePresence>
                          {isExpanded && catData && (
                            <motion.div
                              className="px-3 pb-3 border-t border-[var(--border-light)] pt-3"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <InlineCategoryEditor category={key} data={catData} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </GlowingCard>
                    )
                  })}
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={() => setShowWizard(true)}>重新配置</Button>
                    <Button variant="outline" className="w-full" onClick={handleImport} disabled={importing}>
                      {importing ? '导入中...' : '导入多品类 Excel'}
                    </Button>
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <GlowingCard className="p-4 flex items-center justify-center h-full min-h-[200px] text-sm text-[var(--muted-foreground)]">
                    多品类阶梯图在「图表可视化」页面查看
                  </GlowingCard>
                </div>
              </div>
              <GoalSeekPanel result={multiResult} />
              <MultiCompare currentResult={multiResult} currentScenario={state.scenario} />
            </>
          )}
        </motion.div>
      )}
      </AnimatePresence>

      {showWizard && <CategoryWizard onClose={() => setShowWizard(false)} onComplete={handleWizardComplete} />}
      {showRemoval && <SeriesRemovalModal onClose={() => setShowRemoval(false)} />}
      {showBatch && <BatchCompare onClose={() => setShowBatch(false)} />}

      {/* Save dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              className="surface-elevated p-6 w-96 shadow-lg"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="text-sm font-semibold mb-4">保存方案</h3>
              <Input
                value={saveName}
                autoFocus
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave(false)}
                placeholder="输入方案名称"
              />
              <button
                onClick={() => setSaveName(buildSuggestedName(scenarioRef.current))}
                className="mt-1.5 mb-4 text-[11px] text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors"
              >
                ✨ 智能命名：{buildSuggestedName(scenarioRef.current)}
              </button>
              <div className="flex gap-2 justify-end">
                {savedId && (
                  <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
                    另存为新方案
                  </Button>
                )}
                <Button onClick={() => handleSave(false)} disabled={saving || !saveName.trim()}>
                  {saving ? '保存中...' : savedId ? '更新方案' : '确认保存'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
