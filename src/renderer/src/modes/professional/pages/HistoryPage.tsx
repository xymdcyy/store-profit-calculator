import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useScenario } from '../../../shared/context/ScenarioContext'
import { useToast } from '../../../components/ui/toast'
import { fetchScenarios, deleteScenario, fetchScenario } from '../../simple/services/api'
import { GlowingCard } from '../../../components/aceternity/GlowingCard'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'

interface ScenarioListItem {
  id: string; name: string; mode: string; updated_at: string
}

export default function HistoryPage() {
  const { dispatch } = useScenario()
  const { confirm: toastConfirm } = useToast()
  const [list, setList] = useState<ScenarioListItem[]>([])
  const [filterText, setFilterText] = useState('')

  const load = useCallback(async () => {
    try { setList(await fetchScenarios()) } catch { /* ignore */ }
  }, [])
  useEffect(() => { load() }, [load])

  const handleLoad = async (id: string) => {
    const s = await fetchScenario(id)
    if (s) dispatch({ type: 'LOAD_SCENARIO', scenario: s.data, tab: s.data.mode === 'multi' ? 'multi' : 'single' })
  }
  const handleDelete = async (id: string) => {
    if (await toastConfirm('确定删除此方案？')) { await deleteScenario(id); load() }
  }

  const filtered = list.filter(s => {
    if (filterText && !s.name.includes(filterText)) return false
    return true
  })

  return (
    <motion.div
      className="p-6 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <motion.h1
          className="text-lg font-semibold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          历史记录
        </motion.h1>
        <Button variant="ghost" size="sm" onClick={load}>
          刷新
        </Button>
      </div>

      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Input
          placeholder="筛选方案名"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="max-w-xs text-xs h-8"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <GlowingCard className="overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">方案名称</th>
                <th className="text-left px-4 py-2.5 font-medium">模式</th>
                <th className="text-left px-4 py-2.5 font-medium">更新时间</th>
                <th className="text-right px-4 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--secondary)]/60 transition-all duration-150 relative group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                  >
                    <td className="w-0 relative before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-[var(--primary)] before:rounded-r before:opacity-0 group-hover:before:opacity-100 before:transition-opacity" />
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.mode === 'single' ? 'secondary' : 'default'}>
                        {s.mode === 'single' ? '单品类' : '多品类'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(s.updated_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleLoad(s.id)}>
                        加载
                      </Button>
                      <Button variant="ghost" size="sm" className="text-[var(--negative)] hover:text-[var(--negative)]" onClick={() => handleDelete(s.id)}>
                        删除
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              {filterText ? '没有匹配的方案' : '暂无保存的方案'}
            </div>
          )}
        </GlowingCard>
      </motion.div>
    </motion.div>
  )
}
