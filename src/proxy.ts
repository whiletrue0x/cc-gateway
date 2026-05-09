import { createServer as createHttpsServer, type ServerOptions } from 'https'
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'http'
import { readFileSync } from 'fs'
import { request as httpsRequest } from 'https'
import { URL } from 'url'
import zlib from 'zlib'
import type { Config } from './config.js'
import { authenticate, initAuth, setAuthTokens } from './auth.js'
import { getAccessToken } from './oauth.js'
import { rewriteBody, rewriteHeaders } from './rewriter.js'
import { audit, log } from './logger.js'
import { getProxyAgent } from './proxy-agent.js'
import { recordRequest, getMetricsSnapshot, getClientCostSince, periodStart } from './metrics.js'
import { SSEUsageParser } from './usage-parser.js'
import { computeCost } from './pricing.js'
import { renderDashboard, renderLogin } from './dashboard.js'
import { authenticateUser } from './users.js'
import {
  createSessionCookie,
  setCookieHeader,
  clearCookieHeader,
  getSessionFromRequest,
} from './session.js'
import { addClient, listClients, removeClient, setClientLimit, buildLauncherScript } from './clients.js'
import type { CostLimitPeriod } from './config.js'

const USER_MESSAGE_MAX = 200

/** Refresh in-memory token map from current config.yaml on disk. */
function reloadAuthFromConfig(): void {
  setAuthTokens(listClients())
}

/**
 * Pull the most recent user-authored text out of a /v1/messages request body.
 * Returns truncated text suitable for a dashboard preview, or '' if not parseable.
 */
function extractLastUserMessage(body: Buffer): string {
  if (!body.length) return ''
  try {
    const obj = JSON.parse(body.toString('utf-8'))
    const msgs = obj?.messages
    if (!Array.isArray(msgs)) return ''
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]
      if (!m || m.role !== 'user') continue
      let text = ''
      if (typeof m.content === 'string') {
        text = m.content
      } else if (Array.isArray(m.content)) {
        const parts: string[] = []
        for (const block of m.content) {
          if (block?.type === 'text' && typeof block.text === 'string') {
            parts.push(block.text)
          } else if (block?.type === 'tool_result') {
            // Skip tool_result blocks — keep walking back for an authored prompt
            continue
          }
        }
        text = parts.join('\n').trim()
      }
      if (text) {
        const flat = text.replace(/\s+/g, ' ').trim()
        return flat.length > USER_MESSAGE_MAX
          ? flat.slice(0, USER_MESSAGE_MAX) + '…'
          : flat
      }
    }
    return ''
  } catch {
    return ''
  }
}

export function startProxy(config: Config) {
  initAuth(config)

  const upstream = new URL(config.upstream.url)
  const useTls = config.server.tls?.cert && config.server.tls?.key

  const handler = (req: IncomingMessage, res: ServerResponse) => {
    handleRequest(req, res, config, upstream)
  }

  let server
  if (useTls) {
    const tlsOptions: ServerOptions = {
      cert: readFileSync(config.server.tls.cert),
      key: readFileSync(config.server.tls.key),
    }
    server = createHttpsServer(tlsOptions, handler)
  } else {
    server = createHttpServer(handler)
    log('warn', 'Running without TLS - only use for local development')
  }

  server.listen(config.server.port, () => {
    log('info', `CC Gateway listening on ${useTls ? 'https' : 'http'}://0.0.0.0:${config.server.port}`)
    log('info', `Upstream: ${config.upstream.url}`)
    log('info', `Canonical device_id: ${config.identity.device_id.slice(0, 8)}...`)
    log('info', `Authorized clients: ${config.auth.tokens.map(t => t.name).join(', ')}`)
  })

  return server
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: Config,
  upstream: URL,
) {
  const method = req.method || 'GET'
  const path = req.url || '/'
  const pathname = path.split('?')[0]
  const clientIp = req.socket.remoteAddress || 'unknown'
  const startedAt = Date.now()

  log('info', `← ${method} ${path} from ${clientIp}`)

  // Health check - no auth required
  if (pathname === '/_health') {
    const oauthOk = !!getAccessToken()
    const status = oauthOk ? 200 : 503
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: oauthOk ? 'ok' : 'degraded',
      oauth: oauthOk ? 'valid' : 'expired/refreshing',
      canonical_device: config.identity.device_id.slice(0, 8) + '...',
      canonical_platform: config.env.platform,
      upstream: config.upstream.url,
      clients: config.auth.tokens.map(t => t.name),
    }))
    return
  }

  // Login page + session-protected dashboard
  if (
    pathname === '/login' ||
    pathname === '/logout' ||
    pathname === '/dashboard' ||
    pathname === '/' ||
    pathname === '/_metrics' ||
    pathname === '/api/clients' ||
    pathname.startsWith('/api/clients/')
  ) {
    await handleDashboardArea(req, res, pathname, method)
    return
  }

  // Dry-run verification - shows what would be rewritten (auth required)
  if (pathname === '/_verify') {
    const entry = authenticate(req)
    if (!entry) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }
    const sample = buildVerificationPayload(config)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(sample, null, 2))
    return
  }

  // Authenticate client (proxy-level auth)
  const tokenEntry = authenticate(req)
  if (!tokenEntry) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unauthorized - provide client token via x-api-key header' }))
    log('warn', `Unauthorized request: ${method} ${path}`)
    return
  }
  const clientName = tokenEntry.name

  // Cost limit enforcement: only gates billable inference (/v1/messages).
  // Health, settings, event_logging, etc. are free and shouldn't be blocked.
  if (pathname.startsWith('/v1/messages') && tokenEntry.cost_limit_usd && tokenEntry.cost_limit_usd > 0) {
    const since = periodStart(tokenEntry.cost_limit_period)
    const used = getClientCostSince(clientName, since)
    if (used >= tokenEntry.cost_limit_usd) {
      const periodLabel = tokenEntry.cost_limit_period || 'lifetime'
      res.writeHead(429, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        error: 'Cost limit reached',
        client: clientName,
        period: periodLabel,
        used_usd: Number(used.toFixed(4)),
        limit_usd: tokenEntry.cost_limit_usd,
      }))
      log('warn', `Client "${clientName}" blocked: ${periodLabel} cost ${used.toFixed(4)} >= limit ${tokenEntry.cost_limit_usd}`)
      recordRequest({
        ts: startedAt,
        client: clientName,
        method,
        path: pathname,
        status: 429,
        durationMs: Date.now() - startedAt,
      })
      if (config.logging.audit) audit(clientName, method, path, 429)
      return
    }
  }

  log('info', `Client "${clientName}" → ${method} ${path}`)

  // Get the real OAuth token (managed by gateway)
  const oauthToken = getAccessToken()
  if (!oauthToken) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'OAuth token not available - gateway is refreshing' }))
    log('error', 'No valid OAuth token available')
    return
  }

  // Collect request body
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  let body = Buffer.concat(chunks)

  // Capture last user message for dashboard preview before rewrite (rewrite
  // doesn't touch authored content, but parsing pre-rewrite avoids re-parsing
  // a serialized JSON we just produced). Best-effort — never blocks the call.
  let userMessage = ''
  if (body.length > 0 && pathname.startsWith('/v1/messages') && method === 'POST') {
    userMessage = extractLastUserMessage(body)
  }

  // Rewrite identity fields in body
  if (body.length > 0) {
    try {
      body = rewriteBody(body, path, config) as Buffer<ArrayBuffer>
    } catch (err) {
      log('error', `Body rewrite failed for ${path}: ${err}`)
    }
  }

  // Rewrite headers (strips client auth, normalizes identity headers)
  const rewrittenHeaders = rewriteHeaders(
    req.headers as Record<string, string | string[] | undefined>,
    config,
  )

  // Inject the OAuth access_token. Anthropic OAuth tokens (sk-ant-oat01-) must
  // be sent via Authorization: Bearer with the anthropic-beta: oauth-2025-04-20
  // flag — sending them via x-api-key returns 401 "Invalid authentication
  // credentials". rewriteHeaders() already stripped any inbound auth headers.
  delete rewrittenHeaders['x-api-key']
  rewrittenHeaders['authorization'] = `Bearer ${oauthToken}`

  const oauthBetaFlag = 'oauth-2025-04-20'
  const existingBeta = rewrittenHeaders['anthropic-beta']
  if (existingBeta) {
    if (!existingBeta.split(',').map((s) => s.trim()).includes(oauthBetaFlag)) {
      rewrittenHeaders['anthropic-beta'] = `${existingBeta},${oauthBetaFlag}`
    }
  } else {
    rewrittenHeaders['anthropic-beta'] = oauthBetaFlag
  }

  // Forward to upstream
  const upstreamUrl = new URL(path, upstream)

  const agent = getProxyAgent()
  const proxyReq = httpsRequest(
    upstreamUrl,
    {
      method,
      headers: {
        ...rewrittenHeaders,
        host: upstream.host,
        'content-length': String(body.length),
      },
      ...(agent && { agent }),
    },
    (proxyRes) => {
      const status = proxyRes.statusCode || 502

      const responseHeaders = { ...proxyRes.headers }
      delete responseHeaders['transfer-encoding']

      res.writeHead(status, responseHeaders)

      // Tee the response: write to client (live streaming preserved) AND feed
      // a parser that pulls token usage out of the SSE / JSON body. Only do
      // this for /v1/messages where Anthropic emits usage; everything else
      // just passes through directly to keep the hot path cheap.
      const isMessages = pathname.startsWith('/v1/messages')
      const parser = isMessages && status >= 200 && status < 300 ? new SSEUsageParser() : null

      let finalized = false
      const finalize = () => {
        if (finalized) return
        finalized = true
        const usage = parser?.result()
        const cost = usage && usage.model
          ? computeCost(usage.model, usage)
          : 0
        recordRequest({
          ts: startedAt,
          client: clientName,
          method,
          path: pathname,
          status,
          durationMs: Date.now() - startedAt,
          model: usage?.model,
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          cacheReadTokens: usage?.cacheReadTokens,
          cacheCreationTokens: usage?.cacheCreationTokens,
          costUsd: cost,
          userMessage,
        })
        if (config.logging.audit) {
          audit(clientName, method, path, status)
        }
      }

      if (parser) {
        // Forward raw upstream bytes to the client untouched so the response
        // is byte-identical to a direct Anthropic call (preserves whatever
        // Content-Encoding upstream chose). For the parser, decompress a
        // local copy in-process so token counts stay readable regardless of
        // gzip/br/deflate.
        const encoding = String(proxyRes.headers['content-encoding'] || '')
          .toLowerCase()
          .trim()
        let decoder: zlib.Gunzip | zlib.BrotliDecompress | zlib.Inflate | null = null
        if (encoding === 'gzip') decoder = zlib.createGunzip()
        else if (encoding === 'br') decoder = zlib.createBrotliDecompress()
        else if (encoding === 'deflate') decoder = zlib.createInflate()

        if (decoder) {
          decoder.on('data', (decoded: Buffer) => parser.feed(decoded))
          decoder.on('error', (err: Error) => {
            log('warn', `Usage decoder failed (${encoding}): ${err.message}`)
          })
        }

        proxyRes.on('data', (chunk: Buffer) => {
          res.write(chunk)
          if (decoder) decoder.write(chunk)
          else parser.feed(chunk)
        })
        proxyRes.on('end', () => {
          if (decoder) decoder.end()
          parser.end()
          res.end()
          finalize()
        })
        proxyRes.on('error', (err) => {
          log('error', `Upstream stream error: ${err.message}`)
          if (decoder) decoder.destroy()
          res.end()
          finalize()
        })
      } else {
        proxyRes.pipe(res)
        proxyRes.on('end', finalize)
        proxyRes.on('close', finalize)
      }
    },
  )

  proxyReq.on('error', (err) => {
    log('error', `Upstream error: ${err.message}`)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Bad gateway', detail: err.message }))
    }
    recordRequest({
      ts: startedAt,
      client: clientName,
      method,
      path: pathname,
      status: 502,
      durationMs: Date.now() - startedAt,
      userMessage,
    })
    if (config.logging.audit) {
      audit(clientName, method, path, 502)
    }
  })

  proxyReq.write(body)
  proxyReq.end()
}

/**
 * Build a sample payload showing what the rewriter produces.
 * Used by /_verify endpoint for admin validation.
 */
function buildVerificationPayload(config: Config) {
  // Simulate a /v1/messages request body
  const sampleInput = {
    metadata: {
      user_id: JSON.stringify({
        device_id: 'REAL_DEVICE_ID_FROM_CLIENT_abc123',
        account_uuid: 'shared-account-uuid',
        session_id: 'session-xxx',
      }),
    },
    system: [
      {
        type: 'text',
        text: `x-anthropic-billing-header: cc_version=2.1.81.a1b; cc_entrypoint=cli;`,
      },
      {
        type: 'text',
        text: `Here is useful information about the environment:\n<env>\nWorking directory: /home/bob/myproject\nPlatform: linux\nShell: bash\nOS Version: Linux 6.5.0-generic\n</env>`,
      },
    ],
    messages: [{ role: 'user', content: 'hello' }],
  }

  const rewritten = JSON.parse(
    rewriteBody(Buffer.from(JSON.stringify(sampleInput)), '/v1/messages', config).toString('utf-8'),
  )

  return {
    _info: 'This shows how the gateway rewrites a sample request',
    before: {
      'metadata.user_id': JSON.parse(sampleInput.metadata.user_id),
      billing_header: sampleInput.system[0].text,
      system_prompt_env: sampleInput.system[1].text,
      system_block_count: sampleInput.system.length,
    },
    after: {
      'metadata.user_id': JSON.parse(rewritten.metadata.user_id),
      billing_header: '(stripped)',
      system_prompt_env: rewritten.system[0]?.text ?? '(empty)',
      system_block_count: rewritten.system.length,
    },
  }
}

function isSecureRequest(req: IncomingMessage): boolean {
  const proto = req.headers['x-forwarded-proto']
  if (typeof proto === 'string' && proto.split(',')[0].trim() === 'https') return true
  return (req.socket as { encrypted?: boolean }).encrypted === true
}

async function readBody(req: IncomingMessage, limit = 64 * 1024): Promise<Buffer> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    total += buf.length
    if (total > limit) throw new Error('body too large')
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}

async function handleDashboardArea(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
) {
  const secure = isSecureRequest(req)

  // Root → redirect to dashboard or login
  if (pathname === '/') {
    const session = getSessionFromRequest(req)
    res.writeHead(302, { Location: session ? '/dashboard' : '/login' })
    res.end()
    return
  }

  // Login: GET shows form, POST authenticates
  if (pathname === '/login') {
    if (method === 'GET') {
      // If already logged in, send to dashboard
      if (getSessionFromRequest(req)) {
        res.writeHead(302, { Location: '/dashboard' })
        res.end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderLogin())
      return
    }
    if (method === 'POST') {
      let body: Buffer
      try {
        body = await readBody(req)
      } catch {
        res.writeHead(413, { 'Content-Type': 'text/plain' })
        res.end('Payload too large')
        return
      }
      const params = new URLSearchParams(body.toString('utf-8'))
      const username = (params.get('username') || '').trim()
      const password = params.get('password') || ''
      if (!username || !password) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(renderLogin('Username and password required'))
        return
      }
      const user = authenticateUser(username, password)
      if (!user) {
        log('warn', `Failed login for "${username}" from ${req.socket.remoteAddress}`)
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(renderLogin('Invalid username or password'))
        return
      }
      const cookie = createSessionCookie(user.username)
      log('info', `User "${user.username}" logged in`)
      res.writeHead(302, {
        Location: '/dashboard',
        'Set-Cookie': setCookieHeader(cookie, secure),
      })
      res.end()
      return
    }
    res.writeHead(405, { Allow: 'GET, POST' })
    res.end()
    return
  }

  // Logout: clear cookie, redirect to login
  if (pathname === '/logout') {
    res.writeHead(302, {
      Location: '/login',
      'Set-Cookie': clearCookieHeader(),
    })
    res.end()
    return
  }

  // Session-protected: dashboard + metrics
  const session = getSessionFromRequest(req)
  if (!session) {
    if (pathname === '/_metrics') {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
    } else {
      res.writeHead(302, { Location: '/login' })
      res.end()
    }
    return
  }

  if (pathname === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderDashboard())
    return
  }

  if (pathname === '/_metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(getMetricsSnapshot()))
    return
  }

  if (pathname === '/api/clients') {
    if (method === 'GET') {
      const clients = listClients().map((c) => {
        const since = periodStart(c.cost_limit_period)
        const used = c.cost_limit_usd ? getClientCostSince(c.name, since) : 0
        return {
          name: c.name,
          token_preview: c.token.slice(0, 8) + '…' + c.token.slice(-4),
          cost_limit_usd: c.cost_limit_usd ?? null,
          cost_limit_period: c.cost_limit_period ?? null,
          cost_used_usd: c.cost_limit_usd ? Number(used.toFixed(4)) : null,
        }
      })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ clients }))
      return
    }
    if (method === 'POST') {
      let body: Buffer
      try {
        body = await readBody(req)
      } catch {
        res.writeHead(413, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Payload too large' }))
        return
      }
      let payload: {
        name?: string
        gateway_addr?: string
        scheme?: string
        format?: string
        cost_limit_usd?: number | null
        cost_limit_period?: CostLimitPeriod | null
      }
      try {
        payload = JSON.parse(body.toString('utf-8'))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
        return
      }
      const name = (payload.name || '').trim()
      const scheme = payload.scheme === 'http' ? 'http' : 'https'
      const gatewayAddr =
        (payload.gateway_addr || '').trim() ||
        (typeof req.headers.host === 'string' ? req.headers.host : 'localhost:8443')
      if (!name) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'name required' }))
        return
      }
      let entry
      try {
        entry = addClient(name, {
          cost_limit_usd: payload.cost_limit_usd ?? undefined,
          cost_limit_period: payload.cost_limit_period ?? undefined,
        })
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'failed' }))
        return
      }
      reloadAuthFromConfig()
      log('info', `User "${session.u}" added client "${entry.name}"`)
      const script = buildLauncherScript({
        name: entry.name,
        token: entry.token,
        gatewayAddr,
        scheme,
      })
      if (payload.format === 'json') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ name: entry.name, token: entry.token, script }))
        return
      }
      res.writeHead(200, {
        'Content-Type': 'application/x-shellscript; charset=utf-8',
        'Content-Disposition': `attachment; filename="cc-${entry.name}"`,
        'X-Client-Token': entry.token,
      })
      res.end(script)
      return
    }
    res.writeHead(405, { Allow: 'GET, POST' })
    res.end()
    return
  }

  if (pathname.startsWith('/api/clients/')) {
    const name = decodeURIComponent(pathname.slice('/api/clients/'.length))
    if (method === 'DELETE') {
      let removed = false
      try {
        removed = removeClient(name)
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'failed' }))
        return
      }
      if (!removed) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'not found' }))
        return
      }
      reloadAuthFromConfig()
      log('info', `User "${session.u}" removed client "${name}"`)
      res.writeHead(204)
      res.end()
      return
    }
    if (method === 'PATCH') {
      let body: Buffer
      try {
        body = await readBody(req)
      } catch {
        res.writeHead(413, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Payload too large' }))
        return
      }
      let payload: { cost_limit_usd?: number | null; cost_limit_period?: CostLimitPeriod | null }
      try {
        payload = JSON.parse(body.toString('utf-8'))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
        return
      }
      let updated
      try {
        updated = setClientLimit(name, {
          cost_limit_usd: payload.cost_limit_usd ?? null,
          cost_limit_period: payload.cost_limit_period ?? null,
        })
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'failed' }))
        return
      }
      reloadAuthFromConfig()
      log('info', `User "${session.u}" updated limit on client "${name}"`)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        name: updated.name,
        cost_limit_usd: updated.cost_limit_usd ?? null,
        cost_limit_period: updated.cost_limit_period ?? null,
      }))
      return
    }
    res.writeHead(405, { Allow: 'DELETE, PATCH' })
    res.end()
    return
  }
}
