/// <reference types="vite/client" />

interface ElectronAPI {
  listScenarios(): Promise<{ id: string; name: string; mode: string; updated_at: string }[]>
  getScenario(id: string): Promise<any>
  createScenario(body: { name: string; mode: string; data: object }): Promise<any>
  updateScenario(id: string, updates: { name?: string; data?: object }): Promise<any>
  deleteScenario(id: string): Promise<void>
  cloneScenario(id: string): Promise<any>
  downloadTemplate(mode: 'single' | 'multi', cost: 'modeA' | 'modeB'): Promise<void>
  importExcel(mode?: 'single' | 'multi' | 'auto'): Promise<{ success: boolean; data?: any; error?: string }>
  exportScenario(id: string): Promise<{ success: boolean; error?: string }>
  batchImport(): Promise<{ success: boolean; stores?: any[]; error?: string }>
}

interface Window {
  electronAPI: ElectronAPI
}
