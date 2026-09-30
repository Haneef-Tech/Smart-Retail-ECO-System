/**
 * Minimal structured logger (JSON lines to stdout).
 *
 * Usage: logger.info('orders', 'order created', { orderId, itemCount, total })
 *
 * SAFETY RULES (enforced by convention + `redact` below):
 * - NEVER pass passwords, tokens, session cookies, or full request bodies.
 * - Log scalar summaries only: ids, counts, statuses, totals.
 * - `redact()` drops known-secret keys and truncates long strings as a
 *   second line of defense if an object slips through.
 */

type LogLevel = 'info' | 'warn' | 'error'

// Key names (lowercased, non-alphanumerics stripped) that are never logged.
const SECRET_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'newpassword',
  'token',
  'idtoken',
  'accesstoken',
  'refreshtoken',
  'sessiontoken',
  'confirmtoken',
  'authorization',
  'cookie',
  'cookies',
  'setcookie',
  'secret',
  'apikey',
  'privatekey',
  'clientsecret',
])

const MAX_STRING_LEN = 1000
const MAX_DEPTH = 4

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Deep-clone `value` with secret keys removed and long strings truncated. */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LEN ? `${value.slice(0, MAX_STRING_LEN)}…[truncated]` : value
  }
  if (typeof value !== 'object' || depth >= MAX_DEPTH) {
    return typeof value === 'object' ? '[object]' : value
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message }
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => redact(v, depth + 1))
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(normalizeKey(k))) {
      out[k] = '[redacted]'
      continue
    }
    out[k] = redact(v, depth + 1)
  }
  return out
}

const LEVEL_ORDER: Record<LogLevel, number> = { info: 0, warn: 1, error: 2 }

function minLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase()
  return raw === 'error' ? 'error' : raw === 'warn' ? 'warn' : 'info'
}

function emit(level: LogLevel, scope: string, msg: string, fields?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel()]) return
  // JSON line: easy to ship to any log aggregator. console.* keeps zero deps.
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    msg,
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (scope: string, msg: string, fields?: Record<string, unknown>) =>
    emit('info', scope, msg, fields),
  warn: (scope: string, msg: string, fields?: Record<string, unknown>) =>
    emit('warn', scope, msg, fields),
  error: (scope: string, msg: string, fields?: Record<string, unknown>) =>
    emit('error', scope, msg, fields),
}
