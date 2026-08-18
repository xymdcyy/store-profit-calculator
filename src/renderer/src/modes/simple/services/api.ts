export function fetchScenarios(): Promise<{ id: string; name: string; mode: string; updated_at: string }[]> {
  return window.electronAPI.listScenarios()
}

export function fetchScenario(id: string): Promise<any> {
  return window.electronAPI.getScenario(id)
}

export function createScenario(body: { name: string; mode: string; data: any }) {
  return window.electronAPI.createScenario(body)
}

export function updateScenario(id: string, body: { name?: string; data?: any }) {
  return window.electronAPI.updateScenario(id, body)
}

export function deleteScenario(id: string) {
  return window.electronAPI.deleteScenario(id)
}

export function cloneScenario(id: string) {
  return window.electronAPI.cloneScenario(id)
}

export async function importExcel(mode: 'single' | 'multi' | 'auto' = 'auto'): Promise<{
  success: boolean; count?: number; data?: any; error?: string
}> {
  return window.electronAPI.importExcel(mode)
}

export async function exportScenario(id: string) {
  return window.electronAPI.exportScenario(id)
}

export async function batchImport(): Promise<{ success: boolean; stores?: any[]; error?: string }> {
  return window.electronAPI.batchImport()
}
