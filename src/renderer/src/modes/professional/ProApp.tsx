import { HashRouter, Routes, Route } from 'react-router-dom'
import { ScenarioProvider } from '../../shared/context/ScenarioContext'
import ProLayout from './components/ProLayout'
import CalculatorPage from './pages/CalculatorPage'
import ResultPage from './pages/ResultPage'
import ChartPage from './pages/ChartPage'
import SensitivityPage from './pages/SensitivityPage'
import TrendPage from './pages/TrendPage'
import HistoryPage from './pages/HistoryPage'
import ComparePage from './pages/ComparePage'

export default function ProApp() {
  return (
    <ScenarioProvider>
      <HashRouter>
        <ProLayout>
          <Routes>
            <Route path="/" element={<CalculatorPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/chart" element={<ChartPage />} />
            <Route path="/sensitivity" element={<SensitivityPage />} />
            <Route path="/trend" element={<TrendPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/compare" element={<ComparePage />} />
          </Routes>
        </ProLayout>
      </HashRouter>
    </ScenarioProvider>
  )
}
