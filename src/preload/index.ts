import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  listScenarios: () => ipcRenderer.invoke('scenarios:list'),
  getScenario: (id: string) => ipcRenderer.invoke('scenarios:get', id),
  createScenario: (body: { name: string; mode: string; data: object }) =>
    ipcRenderer.invoke('scenarios:create', body),
  updateScenario: (id: string, updates: { name?: string; data?: object }) =>
    ipcRenderer.invoke('scenarios:update', id, updates),
  deleteScenario: (id: string) => ipcRenderer.invoke('scenarios:delete', id),
  cloneScenario: (id: string) => ipcRenderer.invoke('scenarios:clone', id),
  downloadTemplate: (mode: 'single' | 'multi', cost: 'modeA' | 'modeB') =>
    ipcRenderer.invoke('template:download', mode, cost),
  importExcel: (mode: 'single' | 'multi' = 'single') =>
    ipcRenderer.invoke('excel:import', mode),
  exportScenario: (id: string) => ipcRenderer.invoke('scenarios:export', id),
  batchImport: () => ipcRenderer.invoke('batch:import'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
