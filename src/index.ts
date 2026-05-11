import { watchFile } from 'fs'
import { resolve } from 'path'
import { loadConfig } from './config.js'
import { setLogLevel, log } from './logger.js'
import { initOAuth, setOnTokensUpdated } from './oauth.js'
import { startProxy } from './proxy.js'
import { initAuth } from './auth.js'
import { initDb } from './db.js'
import { initMetrics } from './metrics.js'
import { countUsers } from './users.js'
import {
  bootstrapConfigIfMissing,
  syncOAuthFromCredentialsIfChanged,
  updateConfigOAuth,
} from './bootstrap-config.js'

// Resolve the config path: explicit arg > CCG_CONFIG_PATH env > /app/data/config.yaml.
// /app/data is the persistent volume so the auto-generated config survives restarts.
const configPath =
  process.argv[2] ||
  process.env.CCG_CONFIG_PATH ||
  '/app/data/config.yaml'

try {
  if (!bootstrapConfigIfMissing(configPath)) {
    process.exit(1)
  }

  // If a credentials.json is mounted and its refresh_token differs from the
  // one persisted in config.yaml (e.g. host did `claude` and rotated the
  // token), refresh the config before we load it.
  syncOAuthFromCredentialsIfChanged(configPath)

  const config = loadConfig(configPath)
  setLogLevel(config.logging.level)

  log('info', 'CC Gateway starting...')
  log('info', `Config: ${resolve(configPath)}`)

  // Whenever OAuth refreshes (immediately or on the schedule), persist the
  // rotated refresh_token back to config.yaml so container restarts pick up
  // the latest valid token instead of replaying a consumed one.
  setOnTokensUpdated((tokens) => {
    updateConfigOAuth(configPath, tokens)
  })

  const dbPath = config.db?.path || './data/ccg.db'
  initDb(dbPath)
  initMetrics()
  log('info', `SQLite database: ${resolve(dbPath)}`)
  if (countUsers() === 0) {
    log('warn', 'No dashboard users yet. Create one with: npm run add-user <username>')
  }

  // Initialize OAuth — uses existing access token if valid, only refreshes when expired
  await initOAuth(config.oauth)

  startProxy(config)

  // Hot-reload auth.tokens on config changes (poll-based — works with bind mounts)
  const watchPath = resolve(configPath)
  let lastTokenSig = JSON.stringify(config.auth.tokens)
  watchFile(watchPath, { interval: 2000 }, () => {
    try {
      const next = loadConfig(configPath)
      const sig = JSON.stringify(next.auth.tokens)
      if (sig === lastTokenSig) return
      initAuth(next)
      lastTokenSig = sig
      log('info', `Reloaded auth.tokens (${next.auth.tokens.length} entries: ${next.auth.tokens.map(t => t.name).join(', ')})`)
    } catch (err) {
      log('error', `Config reload failed, keeping existing tokens: ${err instanceof Error ? err.message : err}`)
    }
  })
} catch (err) {
  console.error(`Fatal: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
}
