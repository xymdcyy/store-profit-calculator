import { app } from 'electron'
import crypto from 'crypto'
import path from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'

const DB_PATH = path.join(app.getPath('userData'), 'scenarios.db')

let db: SqlJsDatabase | null = null

let dbInitPromise: Promise<SqlJsDatabase> | null = null

async function ensureDb(): Promise<SqlJsDatabase> {
  if (db) return db
  if (dbInitPromise) return dbInitPromise

  dbInitPromise = (async () => {
    const SQL = await initSqlJs()
    const dir = path.dirname(DB_PATH)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    if (existsSync(DB_PATH)) {
      const buffer = readFileSync(DB_PATH)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }

    db.run('PRAGMA journal_mode = WAL')
    initTables()
    return db
  })()

  return dbInitPromise
}

function initTables() {
  db!.run(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'single',
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  saveDb()
}

function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}

export { ensureDb }

export async function listScenarios() {
  const d = await ensureDb()
  const results: Array<{ id: string; name: string; mode: string; updated_at: string }> = []
  const stmt = d.prepare('SELECT id, name, mode, updated_at FROM scenarios ORDER BY updated_at DESC')
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as any)
  }
  stmt.free()
  return results
}

export async function getScenario(id: string) {
  const d = await ensureDb()
  const stmt = d.prepare('SELECT * FROM scenarios WHERE id = ?')
  stmt.bind([id])
  if (stmt.step()) {
    const row = stmt.getAsObject() as any
    stmt.free()
    try {
      return { ...row, data: JSON.parse(row.data) }
    } catch {
      throw new Error(`方案 ${id} 数据已损坏，无法读取`)
    }
  }
  stmt.free()
  return null
}

export async function createScenario(scenario: {
  id: string; name: string; mode: string; data: object
  created_at: string; updated_at: string
}) {
  const d = await ensureDb()
  // 去掉10条上限，允许无限方案
  d.run(
    'INSERT INTO scenarios (id, name, mode, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [scenario.id, scenario.name, scenario.mode, JSON.stringify(scenario.data),
      scenario.created_at, scenario.updated_at],
  )
  saveDb()
  return getScenario(scenario.id)
}

export async function updateScenario(id: string, updates: { name?: string; data?: object }) {
  const d = await ensureDb()
  const existing = await getScenario(id)
  if (!existing) throw new Error('方案不存在')
  const name = updates.name ?? existing.name
  const data = updates.data ? JSON.stringify(updates.data) : JSON.stringify(existing.data)
  const now = new Date().toISOString()
  d.run(
    'UPDATE scenarios SET name = ?, data = ?, updated_at = ? WHERE id = ?',
    [name, data, now, id],
  )
  saveDb()
  return getScenario(id)
}

export async function deleteScenario(id: string) {
  const d = await ensureDb()
  const existing = await getScenario(id)
  if (!existing) throw new Error('方案不存在')
  d.run('DELETE FROM scenarios WHERE id = ?', [id])
  saveDb()
}

export async function cloneScenario(id: string) {
  const d = await ensureDb()
  const existing = await getScenario(id)
  if (!existing) throw new Error('方案不存在')

  // 去掉10条上限，允许无限克隆
  const newId = crypto.randomUUID()
  const now = new Date().toISOString()
  d.run(
    'INSERT INTO scenarios (id, name, mode, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [newId, `${existing.name} (副本)`, existing.mode, JSON.stringify(existing.data), now, now],
  )
  saveDb()
  return getScenario(newId)
}
