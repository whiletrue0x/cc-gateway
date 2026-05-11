// Anthropic public list prices in USD per 1M tokens, as of 2026-05.
// When a request reports a model id we don't recognise, we fall back to the
// most specific family match (sonnet/opus/haiku) and finally to sonnet rates.

export interface Pricing {
  input: number          // per 1M input tokens
  output: number         // per 1M output tokens
  cacheRead: number      // per 1M cache-read input tokens
  cacheWrite: number     // per 1M cache-creation input tokens
}

const RATES: Record<string, Pricing> = {
  // Claude 4.x family (current)
  'claude-opus-4-7':       { input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
  'claude-opus-4-6':       { input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
  'claude-opus-4-5':       { input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
  'claude-sonnet-4-7':     { input:  3.00, output: 15.00, cacheRead: 0.30, cacheWrite:  3.75 },
  'claude-sonnet-4-6':     { input:  3.00, output: 15.00, cacheRead: 0.30, cacheWrite:  3.75 },
  'claude-sonnet-4-5':     { input:  3.00, output: 15.00, cacheRead: 0.30, cacheWrite:  3.75 },
  'claude-haiku-4-5':      { input:  0.80, output:  4.00, cacheRead: 0.08, cacheWrite:  1.00 },
  // 3.x family (older but may still appear)
  'claude-3-7-sonnet':     { input:  3.00, output: 15.00, cacheRead: 0.30, cacheWrite:  3.75 },
  'claude-3-5-sonnet':     { input:  3.00, output: 15.00, cacheRead: 0.30, cacheWrite:  3.75 },
  'claude-3-5-haiku':      { input:  0.80, output:  4.00, cacheRead: 0.08, cacheWrite:  1.00 },
  'claude-3-opus':         { input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
}

function lookupRate(model: string): Pricing {
  const key = model.toLowerCase()
  // Exact match by stripping date suffix: "claude-sonnet-4-5-20250929" → "claude-sonnet-4-5"
  for (const id of Object.keys(RATES)) {
    if (key === id || key.startsWith(id + '-')) return RATES[id]
  }
  // Family fallback
  if (key.includes('opus'))   return RATES['claude-opus-4-7']
  if (key.includes('haiku'))  return RATES['claude-haiku-4-5']
  return RATES['claude-sonnet-4-7']
}

export interface UsageBreakdown {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
}

export function computeCost(model: string, u: UsageBreakdown): number {
  const r = lookupRate(model || '')
  return (
    (u.inputTokens          / 1_000_000) * r.input +
    (u.outputTokens         / 1_000_000) * r.output +
    (u.cacheReadTokens      / 1_000_000) * r.cacheRead +
    (u.cacheCreationTokens  / 1_000_000) * r.cacheWrite
  )
}

export function formatCost(usd: number): string {
  if (usd < 0.0001) return '$0.0000'
  if (usd < 1) return '$' + usd.toFixed(4)
  if (usd < 100) return '$' + usd.toFixed(2)
  return '$' + Math.round(usd).toLocaleString()
}

export function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return (n / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M'
}
