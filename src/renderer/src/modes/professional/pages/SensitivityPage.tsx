import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useScenario } from '../../../shared/context/ScenarioContext'
import { buildSensitivityMatrix } from '../../../shared/calc/sensitivity'
import SensitivityHeatmap from '../components/SensitivityHeatmap'
import { GlowingCard } from '../../../components/aceternity/GlowingCard'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function SensitivityPage() {
  const { state } = useScenario()
  const result = state.result

  const matrix = useMemo(() => {
    if (!result) return null
    return buildSensitivityMatrix(result)
  }, [result])

  if (!result) {
    return (
      <div className="p-6 text-sm text-[var(--muted-foreground)]">
        请先输入测算数据
      </div>
    )
  }

  // 生成简要文字分析
  const analysis = useMemo(() => {
    if (!matrix) return ''
    const { salesChanges, cmrChanges, cells, baseProfit } = matrix
    // 找到盈亏平衡最近的CMR变动
    const baseSalesIdx = salesChanges.indexOf(0)
    const row = cells[baseSalesIdx]
    let breakEvenCMR: string | null = null
    for (let i = 0; i < cmrChanges.length; i++) {
      if (row[i].status === 'breakeven' || (i > 0 && row[i - 1].status !== row[i].status)) {
        breakEvenCMR = `${cmrChanges[i]}pp`
        break
      }
    }

    // 行 = 销售额变动（索引 0 最小），列 = CMR 变动（索引 0 最小）
    // 最悲观 = 销售额最小变动 × CMR 最小变动；最乐观 = 两者最大
    const worstCell = cells[0][0]
    const bestCell = cells[cells.length - 1][cells[0].length - 1]

    let text = `当前利润基准：¥${Math.round(baseProfit).toLocaleString()}。`
    text += `在销售额不变的情况下，`
    if (breakEvenCMR) {
      text += `综合扣率变动约 ${breakEvenCMR} 时触及盈亏平衡。`
    } else {
      const baseStatus = cells[baseSalesIdx][Math.floor(cmrChanges.length / 2)].status
      text += baseStatus === 'profit'
        ? '当前综合扣率下仍保持盈利。'
        : '当前综合扣率下处于亏损状态。'
    }
    text += `最悲观情景（销售额下降${Math.abs(salesChanges[0])}%、扣率下降${Math.abs(cmrChanges[0])}pp）利润为 ¥${Math.round(worstCell.profit).toLocaleString()}；`
    text += `最乐观情景（销售额上升${salesChanges[salesChanges.length - 1]}%、扣率上升${cmrChanges[cmrChanges.length - 1]}pp）利润为 ¥${Math.round(bestCell.profit).toLocaleString()}。`
    return text
  }, [matrix])

  return (
    <motion.div
      className="p-6 space-y-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.h1 className="text-lg font-semibold" variants={item}>
        敏感性分析
      </motion.h1>

      <motion.div variants={item}>
        <GlowingCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                What-if 矩阵
              </h2>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                分析销售额与综合扣率同时变动对利润的影响
              </p>
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded">
              行 = 销售额变动 | 列 = CMR变动
            </div>
          </div>

          <SensitivityHeatmap matrix={matrix!} />
        </GlowingCard>
      </motion.div>

      <motion.div variants={item}>
        <GlowingCard className="p-5">
          <h3 className="text-sm font-semibold mb-2">分析摘要</h3>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            {analysis}
          </p>
        </GlowingCard>
      </motion.div>
    </motion.div>
  )
}
