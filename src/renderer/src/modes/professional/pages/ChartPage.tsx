import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useScenario } from '../../../shared/context/ScenarioContext'
import { calcMultiCategory, buildStepChartData } from '../../../shared/calc/calculator'
import CvpChart from '../../simple/components/charts/CvpChart'
import ContributionBarChart from '../../simple/components/charts/ContributionBarChart'
import StepChartMulti from '../../simple/components/charts/StepChartMulti'
import ProfitWaterfall from '../components/ProfitWaterfall'
import RevenuePieChart from '../components/RevenuePieChart'
import CostStackChart from '../components/CostStackChart'
import { GlowingCard } from '../../../components/aceternity/GlowingCard'
import type { StoreResult } from '../../../shared/types/scenario'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function ChartPage() {
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

  if (!result && !multiResult) return <div className="p-6 text-sm text-[var(--muted-foreground)]">请先输入测算数据</div>

  return (
    <motion.div
      className="p-6 space-y-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.h1 className="text-lg font-semibold" variants={item}>
        图表可视化
      </motion.h1>

      {/* 单品类图表 */}
      {result && (
        <>
          <motion.div variants={item}>
            <GlowingCard className="p-4">
              <h3 className="text-sm font-semibold mb-3">系列边际贡献分析</h3>
              <ContributionBarChart data={result.stepChartData} />
            </GlowingCard>
          </motion.div>

          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-4" variants={container}>
            <motion.div variants={item}>
              <GlowingCard className="p-4">
                <h3 className="text-sm font-semibold mb-3">量本利分析（CVP）</h3>
                <CvpChart result={result} />
              </GlowingCard>
            </motion.div>
            <motion.div variants={item}>
              <GlowingCard className="p-4">
                <h3 className="text-sm font-semibold mb-3">利润瀑布</h3>
                <ProfitWaterfall result={result} />
              </GlowingCard>
            </motion.div>
            <motion.div variants={item}>
              <GlowingCard className="p-4">
                <h3 className="text-sm font-semibold mb-3">收入结构</h3>
                <RevenuePieChart result={result} />
              </GlowingCard>
            </motion.div>
            <motion.div variants={item}>
              <GlowingCard className="p-4">
                <h3 className="text-sm font-semibold mb-3">费用构成</h3>
                <CostStackChart result={result} />
              </GlowingCard>
            </motion.div>
          </motion.div>
        </>
      )}

      {/* 多品类图表 */}
      {multiResult && (
        <motion.div variants={item}>
          <GlowingCard className="p-4">
            <h3 className="text-sm font-semibold mb-3">多品类阶梯图</h3>
            <StepChartMulti data={multiResult.stepChartData} result={multiResult} />
          </GlowingCard>
        </motion.div>
      )}
    </motion.div>
  )
}
