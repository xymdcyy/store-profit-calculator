import { ModeProvider } from './shell/ModeContext'
import { UnitProvider } from './shell/UnitContext'
import { ToastProvider } from './components/ui/toast'
import AppShell from './shell/AppShell'

export default function App() {
  return (
    <ModeProvider>
      <UnitProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </UnitProvider>
    </ModeProvider>
  )
}
