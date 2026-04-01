import { loadConfig } from './config.js'
import { setLogLevel, log } from './logger.js'
import { initOAuth } from './oauth.js'
import { initVersion } from './version.js'
import { startProxy } from './proxy.js'

const configPath = process.argv[2]

try {
  const config = loadConfig(configPath)
  setLogLevel(config.logging.level)

  log('info', 'CC Gateway starting...')

  // Initialize OAuth first - gateway manages the token lifecycle
  await initOAuth(config.oauth.refresh_token)

  // Sync version from npm registry (+ hourly auto-refresh)
  await initVersion(config)

  startProxy(config)
} catch (err) {
  console.error(`Fatal: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
}
