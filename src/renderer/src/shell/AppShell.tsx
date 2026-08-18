import { useState } from 'react'
import Launcher from './Launcher'
import SimpleApp from '../modes/simple/SimpleApp'
import ProApp from '../modes/professional/ProApp'
import ErrorBoundary from './ErrorBoundary'
import { useMode, type AppMode } from './ModeContext'

export default function AppShell() {
  const { mode, setMode } = useMode()
  // 每次启动都显示 Launcher
  const [launcherVisible, setLauncherVisible] = useState(true)

  const handleSelect = (m: AppMode) => {
    setMode(m)
    setLauncherVisible(false)
  }

  if (launcherVisible) {
    return <Launcher onSelect={handleSelect} />
  }

  if (mode === 'simple') {
    return <ErrorBoundary key="simple"><SimpleApp /></ErrorBoundary>
  }

  return <ErrorBoundary key="pro"><ProApp /></ErrorBoundary>
}
