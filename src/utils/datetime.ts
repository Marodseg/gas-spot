export function parseApiTimestamp(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.includes('T')) {
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? '0')
  return madridWallTimeToUtc(year, month, day, hour, minute, second)
}

export type Freshness = 'fresh' | 'recent' | 'stale'

export interface UpdateInfo {
  label: string
  freshness: Freshness
}

const STALE_AFTER_HOURS = 24
const RECENT_AFTER_HOURS = 3

/** "Actualizado hace 14 min", "hace 3 h", "hace 2 días". Older prices read as less reliable. */
export function describeUpdate(value: string | null, now = new Date()): UpdateInfo | null {
  if (!value) return null
  const date = parseApiTimestamp(value)
  if (!date) return null
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000))
  // Rounded first so the label and the freshness never disagree ("hace 24 h" but still fresh).
  const hours = Math.round(minutes / 60)
  const freshness: Freshness = hours >= STALE_AFTER_HOURS ? 'stale' : hours >= RECENT_AFTER_HOURS ? 'recent' : 'fresh'
  if (minutes < 1) return { label: 'Actualizado ahora', freshness }
  if (minutes < 60) return { label: `Actualizado hace ${minutes} min`, freshness }
  if (hours < 24) return { label: `Actualizado hace ${hours} h`, freshness }
  const days = Math.max(1, Math.round(hours / 24))
  return { label: `Actualizado hace ${days} ${days === 1 ? 'día' : 'días'}`, freshness }
}

export function formatDateTime(value: string): string | null {
  const date = parseApiTimestamp(value)
  if (!date) return null
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function madridDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1))
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

export function eachDate(from: string, to: string): string[] {
  const days: string[] = []
  let cursor = from
  while (cursor <= to) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
    if (days.length > 400) break
  }
  return days
}

function madridWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date | null {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  const asMadrid = new Date(utcGuess.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))
  const offset = utcGuess.getTime() - asMadrid.getTime()
  const result = new Date(utcGuess.getTime() + offset)
  return Number.isNaN(result.getTime()) ? null : result
}
