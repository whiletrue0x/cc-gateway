import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getDb } from './db.js'

const SCRYPT_N = 16384
const SCRYPT_r = 8
const SCRYPT_p = 1
const KEY_LEN = 64
const SALT_LEN = 16

export interface User {
  id: number
  username: string
  password_hash: string
  created_at: number
}

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN)
  const derived = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p })
  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString('hex')}$${derived.toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const N = parseInt(parts[1], 10)
  const r = parseInt(parts[2], 10)
  const p = parseInt(parts[3], 10)
  const salt = Buffer.from(parts[4], 'hex')
  const expected = Buffer.from(parts[5], 'hex')
  const derived = scryptSync(password, salt, expected.length, { N, r, p })
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

export function createUser(username: string, password: string): User {
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    throw new Error('username must be 3-32 chars, [a-zA-Z0-9_.-]')
  }
  if (password.length < 8) {
    throw new Error('password must be at least 8 characters')
  }
  const db = getDb()
  const hash = hashPassword(password)
  const now = Date.now()
  const result = db
    .prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
    .run(username, hash, now)
  return { id: Number(result.lastInsertRowid), username, password_hash: hash, created_at: now }
}

export function findUser(username: string): User | null {
  const row = getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined
  return row ?? null
}

export function authenticateUser(username: string, password: string): User | null {
  const user = findUser(username)
  if (!user) {
    // Constant-time-ish: still run a hash to avoid leaking existence via timing
    scryptSync(password, randomBytes(SALT_LEN), KEY_LEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p })
    return null
  }
  return verifyPassword(password, user.password_hash) ? user : null
}

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  return row.c
}
