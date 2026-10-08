export type OpenStatus = 'open' | 'closed' | 'unknown'

const DAY_INDEX: Record<string, number> = {
  L: 1,
  M: 2,
  X: 3,
  J: 4,
  V: 5,
  S: 6,
  D: 0,
}

export function openingStatus(schedule: string | null, now = new Date()): OpenStatus {
  if (!schedule?.trim()) return 'unknown'
  const segments = schedule
    .split(';')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
  if (segments.length === 0) return 'unknown'

  const clock = madridClock(now)
  let parsed = false
  let open = false

  for (const segment of segments) {
    const match = segment.match(/^([A-Za-z])(?:\s*-\s*([A-Za-z]))?\s*:\s*(.+)$/)
    if (!match?.[1] || !match[3]) continue
    const start = DAY_INDEX[match[1].toUpperCase()]
    const end = match[2] ? DAY_INDEX[match[2].toUpperCase()] : start
    if (start === undefined || end === undefined) continue
    parsed = true
    if (!dayInRange(clock.weekday, start, end)) continue
    if (hoursCover(match[3], clock.minutes)) open = true
  }

  if (!parsed) return 'unknown'
  return open ? 'open' : 'closed'
}

export function openingLabel(status: OpenStatus): string {
  switch (status) {
    case 'open':
      return 'Abierta ahora'
    case 'closed':
      return 'Cerrada ahora'
    case 'unknown':
      return 'Horario sin confirmar'
    default: {
      const unreachable: never = status
      return unreachable
    }
  }
}

function hoursCover(hours: string, minutesNow: number): boolean {
  if (/24\s*H/i.test(hours)) return true
  const ranges = hours.split(',')
  for (const range of ranges) {
    const match = range.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
    if (!match) continue
    const start = Number(match[1]) * 60 + Number(match[2])
    const end = Number(match[3]) * 60 + Number(match[4])
    if (end === start) return true
    if (end > start && minutesNow >= start && minutesNow < end) return true
    if (end < start && (minutesNow >= start || minutesNow < end)) return true
  }
  return false
}

function dayInRange(day: number, start: number, end: number): boolean {
  const current = mondayFirst(day)
  const from = mondayFirst(start)
  const to = mondayFirst(end)
  if (from <= to) return current >= from && current <= to
  return current >= from || current <= to
}

function mondayFirst(day: number): number {
  return day === 0 ? 7 : day
}

function madridClock(now: Date): { weekday: number; minutes: number } {
  const weekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
  }).format(now)
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now)
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const [hourText, minuteText] = time.split(':')
  const weekday = weekdayMap[weekdayName]
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (weekday === undefined || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { weekday: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() }
  }
  return { weekday, minutes: hour * 60 + minute }
}
