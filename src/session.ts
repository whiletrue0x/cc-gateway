import { createHmac, timingSafeEqual } from 'crypto'
import type { IncomingMessage } from 'http'
import { getSessionSecret } from './db.js'

const COOKIE_NAME = 'ccg_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days

interface SessionPayload {
  u: string  // username
  e: number  // expiry timestamp ms
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function sign(payload: string): string {
  return b64url(createHmac('sha256', getSessionSecret()).update(payload).digest())
}

export function createSessionCookie(username: string): string {
  const payload: SessionPayload = { u: username, e: Date.now() + SESSION_TTL_MS }
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf-8'))
  const sig = sign(body)
  return `${body}.${sig}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  const dot = token.indexOf('.')
  if (dot === -1) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(body)
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf-8')) as SessionPayload
    if (typeof payload.u !== 'string' || typeof payload.e !== 'number') return null
    if (payload.e < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function getSessionFromRequest(req: IncomingMessage): SessionPayload | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';').map(s => s.trim())
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const name = part.slice(0, eq)
    if (name !== COOKIE_NAME) continue
    const value = part.slice(eq + 1)
    return verifySessionToken(value)
  }
  return null
}

export function setCookieHeader(token: string, secure: boolean): string {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (secure) attrs.push('Secure')
  return attrs.join('; ')
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}
