import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useScenario } from '../../../shared/context/ScenarioContext'
import { calcMultiCategory, buildStepChartData } from '../../../shared/calc/calculator'
import ScenarioCompare from '../../simple/components/analysis/ScenarioCompare'
import MultiCompare from '../../simple/components/analysis/MultiCompare'
import { GlowingCard } from '../../../components/aceternity/GlowingCard'
import type { StoreResult } from '../../../shared/types/scenario'

export default function ComparePage() {
  const { state } = useScenario()
  const result = state.result
  const mc = state.scenario.multiCategory
  const hasMultiData = mc?.categories && Object.keys(mc.categories).length > 0

  const multiResult = useMemo<StoreResult | null>(() => {
    if (!hasMultiData) return null
    try {
      const base = calcMultiCategory(mc!.categories, state.scenario.storeFixedCosts)
      return { ...base, stepChartData: buildStepChartData(base, true) } as StoreResult
    } catch { return null }
  }, [mc, state.scenario.storeFixedCosts, hasMultiData])

  if (!result && !multiResult) {
    return (
      <motion.div
        className="p-6 space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-lg font-semibold">方案对比</h1>
        <GlowingCard className="p-6 text-center text-sm text-[var(--muted-foreground)]">
          请先在「测算输入」页面输入数据
        </GlowingCard>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="p-6 space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.h1
        className="text-lg font-semibold"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        方案对比
      </motion.h1>
      {hasMultiData && multiResult ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <MultiCompare currentResult={multiResult} />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ScenarioCompare currentResult={result} currentScenario={state.scenario} />
        </motion.div>
      )}
    </motion.div>
  )
}
