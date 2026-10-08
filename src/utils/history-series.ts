import type { HistoryPoint, HistorySeriesPoint } from '../types/domain'
import { eachDate, madridDateKey } from './datetime'

export function buildDailySeries(
  points: readonly HistoryPoint[],
  from: string,
  to: string,
): HistorySeriesPoint[] {
  const ordered = [...points].sort((left, right) => left.timestamp.localeCompare(right.timestamp))
  const days = eachDate(from, to)
  let cursor = 0
  let current: number | null = null
  return days.map((date) => {
    while (cursor < ordered.length) {
      const point = ordered[cursor]
      if (!point || madridDateKey(new Date(point.timestamp)) > date) break
      current = point.price
      cursor += 1
    }
    return { date, price: current }
  })
}
