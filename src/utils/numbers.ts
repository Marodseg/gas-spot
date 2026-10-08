export function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return acceptPrice(value)
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  return acceptPrice(Number(normalized))
}

function acceptPrice(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0 || value >= 10) return null
  return Math.round(value * 1000) / 1000
}

export function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number(value.trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function parseDistance(value: unknown): number | null {
  const parsed = parseCoordinate(value)
  if (parsed === null || parsed < 0 || parsed > 500) return null
  return parsed
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
