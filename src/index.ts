import { watchFile } from 'fs'
import { resolve } from 'path'
import { loadConfig } from './config.js'
import { setLogLevel, log } from './logger.js'
import { initOAuth } from './oauth.js'
import { startProxy } from './proxy.js'
import { initAuth } from './auth.js'

const configPath = process.argv[2]

try {
  const config = loadConfig(configPath)
  setLogLevel(config.logging.level)

  log('info', 'CC Gateway starting...')

  // Initialize OAuth — uses existing access token if valid, only refreshes when expired
  await initOAuth(config.oauth)

  startProxy(config)

  // Hot-reload auth.tokens on config changes (poll-based — works with bind mounts)
  const watchPath = resolve(configPath || 'config.yaml')
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
