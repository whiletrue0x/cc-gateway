import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { randomBytes } from 'crypto'

let db: Database.Database | null = null

export function initDb(path: string): Database.Database {
  const absPath = resolve(path)
  mkdirSync(dirname(absPath), { recursive: true })

  db = new Database(absPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  migrate(db)
  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized — call initDb() first')
  return db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS request_metrics (
      ts INTEGER NOT NULL,
      client TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rm_ts ON request_metrics(ts);
    CREATE INDEX IF NOT EXISTS idx_rm_client_ts ON request_metrics(client, ts);
  `)

  // ── 2026-05 schema bump: per-request token usage + cost ──
  const cols = db.prepare('PRAGMA table_info(request_metrics)').all() as Array<{ name: string }>
  const has = (n: string) => cols.some((c) => c.name === n)
  const addCol = (sql: string) => db.exec(`ALTER TABLE request_metrics ADD COLUMN ${sql}`)
  if (!has('model')) addCol("model TEXT NOT NULL DEFAULT ''")
  if (!has('input_tokens')) addCol('input_tokens INTEGER NOT NULL DEFAULT 0')
  if (!has('output_tokens')) addCol('output_tokens INTEGER NOT NULL DEFAULT 0')
  if (!has('cache_read_tokens')) addCol('cache_read_tokens INTEGER NOT NULL DEFAULT 0')
  if (!has('cache_creation_tokens')) addCol('cache_creation_tokens INTEGER NOT NULL DEFAULT 0')
  if (!has('cost_usd')) addCol('cost_usd REAL NOT NULL DEFAULT 0')

  db.exec('CREATE INDEX IF NOT EXISTS idx_rm_model_ts ON request_metrics(model, ts)')
}

export function getOrCreateMeta(key: string, factory: () => string): string {
  const db = getDb()
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined
  if (row) return row.value
  const value = factory()
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run(key, value)
  return value
}

export function getSessionSecret(): Buffer {
  const hex = getOrCreateMeta('session_secret', () => randomBytes(32).toString('hex'))
  return Buffer.from(hex, 'hex')
}
