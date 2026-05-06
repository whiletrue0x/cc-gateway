import { getDb } from './db.js'

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const MINUTES_KEPT = 60
const HOURS_KEPT = 24
const RETENTION_DAYS = 30
const RECENT_LIMIT = 50

export interface RequestRecord {
  ts: number
  client: string
  method: string
  path: string
  status: number
  durationMs: number
}

let startedAt = Date.now()
let cleanupTimer: NodeJS.Timeout | null = null

export function initMetrics() {
  startedAt = Date.now()
  pruneOldRows()
  if (cleanupTimer) clearInterval(cleanupTimer)
  cleanupTimer = setInterval(pruneOldRows, HOUR_MS).unref()
}

function pruneOldRows() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * HOUR_MS
  try {
    getDb().prepare('DELETE FROM request_metrics WHERE ts < ?').run(cutoff)
  } catch {
    // DB may not be initialized yet during early startup
  }
}

export function recordRequest(rec: RequestRecord) {
  try {
    getDb()
      .prepare(
        'INSERT INTO request_metrics (ts, client, method, path, status, duration_ms) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(rec.ts, rec.client, rec.method, rec.path, rec.status, rec.durationMs)
  } catch (err) {
    // Don't break proxying on metrics failures
  }
}

interface ClientRow {
  client: string
  total: number
  errors: number
  total_duration: number
  first_seen: number
  last_seen: number
  s2xx: number
  s3xx: number
  s4xx: number
  s5xx: number
  m_get: number
  m_post: number
  m_put: number
  m_delete: number
  m_other: number
}

export function getMetricsSnapshot() {
  const db = getDb()
  const now = Date.now()
  const currentMinute = Math.floor(now / MINUTE_MS) * MINUTE_MS
  const currentHour = Math.floor(now / HOUR_MS) * HOUR_MS

  const totalsRow = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors
      FROM request_metrics`,
    )
    .get() as { total: number; errors: number | null }

  const totals = {
    total: totalsRow.total || 0,
    errors: totalsRow.errors || 0,
    startedAt,
  }

  const clientRows = db
    .prepare(
      `SELECT
        client,
        COUNT(*) as total,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors,
        SUM(duration_ms) as total_duration,
        MIN(ts) as first_seen,
        MAX(ts) as last_seen,
        SUM(CASE WHEN status >= 200 AND status < 300 THEN 1 ELSE 0 END) as s2xx,
        SUM(CASE WHEN status >= 300 AND status < 400 THEN 1 ELSE 0 END) as s3xx,
        SUM(CASE WHEN status >= 400 AND status < 500 THEN 1 ELSE 0 END) as s4xx,
        SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) as s5xx,
        SUM(CASE WHEN method = 'GET' THEN 1 ELSE 0 END) as m_get,
        SUM(CASE WHEN method = 'POST' THEN 1 ELSE 0 END) as m_post,
        SUM(CASE WHEN method = 'PUT' THEN 1 ELSE 0 END) as m_put,
        SUM(CASE WHEN method = 'DELETE' THEN 1 ELSE 0 END) as m_delete,
        SUM(CASE WHEN method NOT IN ('GET','POST','PUT','DELETE') THEN 1 ELSE 0 END) as m_other
      FROM request_metrics
      GROUP BY client
      ORDER BY total DESC`,
    )
    .all() as ClientRow[]

  const clients = clientRows.map((r) => {
    const byStatus: Record<string, number> = {}
    if (r.s2xx) byStatus['2xx'] = r.s2xx
    if (r.s3xx) byStatus['3xx'] = r.s3xx
    if (r.s4xx) byStatus['4xx'] = r.s4xx
    if (r.s5xx) byStatus['5xx'] = r.s5xx
    const byMethod: Record<string, number> = {}
    if (r.m_get) byMethod['GET'] = r.m_get
    if (r.m_post) byMethod['POST'] = r.m_post
    if (r.m_put) byMethod['PUT'] = r.m_put
    if (r.m_delete) byMethod['DELETE'] = r.m_delete
    if (r.m_other) byMethod['OTHER'] = r.m_other
    return {
      name: r.client,
      total: r.total,
      errors: r.errors,
      totalDurationMs: r.total_duration,
      avgDurationMs: r.total > 0 ? Math.round(r.total_duration / r.total) : 0,
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
      byStatus,
      byMethod,
    }
  })

  const minuteStart = currentMinute - (MINUTES_KEPT - 1) * MINUTE_MS
  const hourStart = currentHour - (HOURS_KEPT - 1) * HOUR_MS

  const minuteRows = db
    .prepare(
      `SELECT client, (ts / ${MINUTE_MS}) * ${MINUTE_MS} as bucket, COUNT(*) as count
       FROM request_metrics
       WHERE ts >= ?
       GROUP BY client, bucket`,
    )
    .all(minuteStart) as Array<{ client: string; bucket: number; count: number }>

  const hourRows = db
    .prepare(
      `SELECT client, (ts / ${HOUR_MS}) * ${HOUR_MS} as bucket, COUNT(*) as count
       FROM request_metrics
       WHERE ts >= ?
       GROUP BY client, bucket`,
    )
    .all(hourStart) as Array<{ client: string; bucket: number; count: number }>

  const minuteSeries: Record<string, Array<{ ts: number; count: number }>> = {}
  const hourSeries: Record<string, Array<{ ts: number; count: number }>> = {}

  for (const c of clients) {
    minuteSeries[c.name] = []
    for (let i = MINUTES_KEPT - 1; i >= 0; i--) {
      minuteSeries[c.name].push({ ts: currentMinute - i * MINUTE_MS, count: 0 })
    }
    hourSeries[c.name] = []
    for (let i = HOURS_KEPT - 1; i >= 0; i--) {
      hourSeries[c.name].push({ ts: currentHour - i * HOUR_MS, count: 0 })
    }
  }
  for (const r of minuteRows) {
    const series = minuteSeries[r.client]
    if (!series) continue
    const point = series.find((p) => p.ts === r.bucket)
    if (point) point.count = r.count
  }
  for (const r of hourRows) {
    const series = hourSeries[r.client]
    if (!series) continue
    const point = series.find((p) => p.ts === r.bucket)
    if (point) point.count = r.count
  }

  const recent = db
    .prepare(
      `SELECT ts, client, method, path, status, duration_ms as durationMs
       FROM request_metrics
       ORDER BY ts DESC
       LIMIT ?`,
    )
    .all(RECENT_LIMIT) as RequestRecord[]

  return {
    now,
    uptimeMs: now - startedAt,
    totals,
    clients,
    minuteSeries,
    hourSeries,
    recent,
  }
}
