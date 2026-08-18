import { motion } from 'framer-motion'
import type { AppMode } from './ModeContext'
import { FloatingCard } from '../components/aceternity/FloatingCard'
import { GlowingCard } from '../components/aceternity/GlowingCard'
import { AnimatedBackground } from '../components/aceternity/AnimatedBackground'

interface ModeCard {
  mode: AppMode
  title: string
  desc: string
  features: string[]
  icon: string
}

const CARDS: ModeCard[] = [
  {
    mode: 'simple',
    title: '门店简洁模式',
    desc: '面向门店店长和战区经理',
    features: ['智能诊断', '结构调整模拟', '阶梯图分析', '方案对比'],
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    mode: 'professional',
    title: '财务专业模式',
    desc: '面向财务人员与管理层',
    features: ['敏感性分析热力图', '多期间趋势对比', '价值驱动瀑布拆解', '目标反算与可行性评分'],
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
]

export default function Launcher({ onSelect }: { onSelect: (m: AppMode) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] relative overflow-hidden">
      <AnimatedBackground color="rgba(228, 0, 43, 0.02)" density={20} />

      <div className="relative z-10 max-w-4xl w-full px-6">
        {/* Logo & Title */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-3 mb-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E4002B] to-[#B91C3C] flex items-center justify-center shadow-lg shadow-[#E4002B]/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16l4-4 4 4 5-6" />
              </svg>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">TCL门店盈利测算</h1>
              <p className="text-xs text-[var(--muted-foreground)]">Channel Operations Profit Calculator</p>
            </div>
          </motion.div>
          <p className="text-sm text-[var(--muted-foreground)] mt-4">选择适合的模式开始测算</p>
        </motion.div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CARDS.map((card, index) => (
            <motion.div
              key={card.mode}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <FloatingCard className="h-full">
                <GlowingCard
                  className="p-6 cursor-pointer h-full"
                  glowColor="rgba(228, 0, 43, 0.1)"
                >
                  <button
                    onClick={() => onSelect(card.mode)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--secondary)] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-base font-semibold text-[var(--foreground)] mb-1">{card.title}</h2>
                        <p className="text-xs text-[var(--muted-foreground)] mb-4">{card.desc}</p>
                        <ul className="space-y-2">
                          {card.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                </GlowingCard>
              </FloatingCard>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.p
          className="text-center text-[11px] text-[var(--muted-foreground)] mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          TCL Channel Operations · 2026
        </motion.p>
      </div>
    </div>
  )
}
