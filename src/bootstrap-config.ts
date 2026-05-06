import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
import { dirname, resolve } from 'path'
import { randomBytes } from 'crypto'
import { log } from './logger.js'

interface ClaudeCredentials {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}

function readCredentialsFile(path: string): ClaudeCredentials | null {
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw)
    const c = parsed.claudeAiOauth || parsed
    if (typeof c.refreshToken !== 'string') return null
    return {
      accessToken: typeof c.accessToken === 'string' ? c.accessToken : undefined,
      refreshToken: c.refreshToken,
      expiresAt: typeof c.expiresAt === 'number' ? c.expiresAt : undefined,
    }
  } catch (err) {
    log('warn', `Failed to read credentials from ${path}: ${err instanceof Error ? err.message : err}`)
    return null
  }
}

function gatherSeedCredentials(): ClaudeCredentials | null {
  // 1. File path (explicit env)
  const credPath = process.env.CCG_CREDENTIALS_PATH
  if (credPath) {
    const fromFile = readCredentialsFile(credPath)
    if (fromFile) return fromFile
    log('warn', `CCG_CREDENTIALS_PATH set but file unreadable or missing required fields: ${credPath}`)
  }

  // 2. Common default file locations (when user mounts credentials.json into container)
  for (const p of ['/app/data/claude-credentials.json', '/run/secrets/claude-credentials.json']) {
    const fromFile = readCredentialsFile(p)
    if (fromFile) return fromFile
  }

  // 3. Env vars
  if (process.env.CCG_REFRESH_TOKEN) {
    return {
      refreshToken: process.env.CCG_REFRESH_TOKEN,
      accessToken: process.env.CCG_ACCESS_TOKEN || undefined,
      expiresAt: process.env.CCG_EXPIRES_AT ? Number(process.env.CCG_EXPIRES_AT) : undefined,
    }
  }

  return null
}

function buildConfigYaml(creds: ClaudeCredentials, opts: {
  clientName: string
  clientToken: string
  deviceId: string
  email: string
  dbPath: string
}): string {
  const { clientName, clientToken, deviceId, email, dbPath } = opts
  return `server:
  port: 8443

upstream:
  url: https://api.anthropic.com

oauth:
  access_token: "${creds.accessToken || ''}"
  refresh_token: "${creds.refreshToken}"
  expires_at: ${creds.expiresAt || 0}

auth:
  tokens:
    - name: ${clientName}
      token: ${clientToken}

identity:
  device_id: "${deviceId}"
  email: "${email}"

env:
  platform: darwin
  platform_raw: darwin
  arch: arm64
  node_version: v22.0.0
  terminal: iTerm2.app
  package_managers: npm,pnpm
  runtimes: node
  is_running_with_bun: false
  is_ci: false
  is_claude_ai_auth: true
  version: "2.1.81"
  version_base: "2.1.81"
  build_time: "2026-03-20T21:26:18Z"
  deployment_environment: unknown-darwin
  vcs: git

prompt_env:
  platform: darwin
  shell: zsh
  os_version: "Darwin 24.4.0"
  working_dir: /Users/jack/projects

process:
  constrained_memory: 34359738368
  rss_range: [300000000, 500000000]
  heap_total_range: [40000000, 80000000]
  heap_used_range: [100000000, 200000000]

logging:
  level: info
  audit: true

db:
  path: ${dbPath}
`
}

/**
 * Ensure a config file exists at the given path. If missing, attempt to
 * auto-generate one from environment / mounted credentials. Returns true if
 * a config now exists at the path (whether it was already there or just
 * created). Returns false (and logs why) if bootstrap was needed but failed.
 */
export function bootstrapConfigIfMissing(configPath: string): boolean {
  const absPath = resolve(configPath)
  if (existsSync(absPath)) return true

  log('info', `No config found at ${absPath} — attempting auto-bootstrap`)

  const creds = gatherSeedCredentials()
  if (!creds || !creds.refreshToken) {
    log('error', 'Cannot bootstrap config: no OAuth credentials available.')
    log('error', '  Set CCG_REFRESH_TOKEN env var, or mount a credentials.json at')
    log('error', '  CCG_CREDENTIALS_PATH (or /app/data/claude-credentials.json).')
    return false
  }

  const dbPath = resolve(dirname(absPath), 'ccg.db')
  const yaml = buildConfigYaml(creds, {
    clientName: process.env.CCG_SEED_CLIENT_NAME || 'seed',
    clientToken: process.env.CCG_SEED_CLIENT_TOKEN || randomBytes(32).toString('hex'),
    deviceId: process.env.CCG_DEVICE_ID || randomBytes(32).toString('hex'),
    email: process.env.CCG_EMAIL || 'user@example.com',
    dbPath,
  })

  mkdirSync(dirname(absPath), { recursive: true })
  writeFileSync(absPath, yaml, { encoding: 'utf-8' })
  try {
    chmodSync(absPath, 0o600)
  } catch {
    // chmod may fail on some mounted filesystems — non-fatal
  }

  log('info', `Generated ${absPath} (seed client + fresh device_id)`)
  log('info', '  Edit identity/env/prompt_env if you need a specific fingerprint.')
  return true
}
