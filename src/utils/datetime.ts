const relativeFormat = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

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

export function formatRelativeTime(value: string, now = new Date()): string | null {
  const date = parseApiTimestamp(value)
  if (!date) return null
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diffSeconds)
  if (abs < 60) return relativeFormat.format(Math.round(diffSeconds / 1), 'second')
  if (abs < 3600) return relativeFormat.format(Math.round(diffSeconds / 60), 'minute')
  if (abs < 86400) return relativeFormat.format(Math.round(diffSeconds / 3600), 'hour')
  return relativeFormat.format(Math.round(diffSeconds / 86400), 'day')
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
