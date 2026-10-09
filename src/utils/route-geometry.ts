import type { Coordinates } from '../types/domain'
import { haversineKm } from './distance'

/** [longitude, latitude], the GeoJSON order used by the routing API and MapLibre. */
export type LngLat = [number, number]

const KM_PER_DEGREE = 111.32

/**
 * Local equirectangular projection to kilometres. Accurate enough for
 * distances of a few kilometres around a route, and far cheaper than
 * haversine inside the inner loops below.
 */
function projector(latitude: number) {
  const cos = Math.cos((latitude * Math.PI) / 180)
  return ([lng, lat]: LngLat): [number, number] => [lng * KM_PER_DEGREE * cos, lat * KM_PER_DEGREE]
}

/** Ramer–Douglas–Peucker simplification with a tolerance in kilometres. */
export function simplifyLine(line: readonly LngLat[], toleranceKm: number): LngLat[] {
  if (line.length <= 2) return [...line]
  const first = line[0]
  if (!first) return []
  const project = projector(first[1])
  const points = line.map(project)
  const keep = new Uint8Array(line.length)
  keep[0] = 1
  keep[line.length - 1] = 1
  const stack: [number, number][] = [[0, line.length - 1]]
  while (stack.length > 0) {
    const range = stack.pop()
    if (!range) break
    const [start, end] = range
    let farthest = -1
    let farthestDistance = toleranceKm
    for (let index = start + 1; index < end; index += 1) {
      const distance = segmentDistance(points[index], points[start], points[end]).distance
      if (distance > farthestDistance) {
        farthest = index
        farthestDistance = distance
      }
    }
    if (farthest !== -1) {
      keep[farthest] = 1
      stack.push([start, farthest], [farthest, end])
    }
  }
  return line.filter((_, index) => keep[index] === 1)
}

/** Points every `stepKm` along the line, always including both ends. */
export function samplePoints(line: readonly LngLat[], stepKm: number): Coordinates[] {
  const samples: Coordinates[] = []
  const first = line[0]
  if (!first) return samples
  samples.push(toCoordinates(first))
  let carried = 0
  for (let index = 1; index < line.length; index += 1) {
    const from = line[index - 1]
    const to = line[index]
    if (!from || !to) continue
    const length = haversineKm(toCoordinates(from), toCoordinates(to))
    let position = stepKm - carried
    while (position <= length) {
      const ratio = position / length
      samples.push({ longitude: from[0] + (to[0] - from[0]) * ratio, latitude: from[1] + (to[1] - from[1]) * ratio })
      position += stepKm
    }
    carried = (carried + length) % stepKm
  }
  const last = line[line.length - 1]
  if (last && line.length > 1) samples.push(toCoordinates(last))
  return samples
}

export interface RoutePosition {
  /** Kilometres from the start of the route to the closest point on it. */
  routeKm: number
  /** Straight-line kilometres from the point to the route. */
  offRouteKm: number
}

/** Prepares a line for repeated `locate` calls (cumulative distances, projected points). */
export function indexLine(line: readonly LngLat[]) {
  const first = line[0]
  const project = projector(first ? first[1] : 40)
  const points = line.map(project)
  const cumulative = [0]
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    cumulative.push((cumulative[index - 1] ?? 0) + (a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0))
  }
  return {
    lengthKm: cumulative[cumulative.length - 1] ?? 0,
    locate(point: Coordinates): RoutePosition {
      const p = project([point.longitude, point.latitude])
      let best: RoutePosition = { routeKm: 0, offRouteKm: Number.POSITIVE_INFINITY }
      for (let index = 1; index < points.length; index += 1) {
        const { distance, t } = segmentDistance(p, points[index - 1], points[index])
        if (distance < best.offRouteKm) {
          const start = cumulative[index - 1] ?? 0
          const end = cumulative[index] ?? start
          best = { routeKm: start + (end - start) * t, offRouteKm: distance }
        }
      }
      return best
    },
  }
}

function segmentDistance(
  p: [number, number] | undefined,
  a: [number, number] | undefined,
  b: [number, number] | undefined,
): { distance: number; t: number } {
  if (!p || !a || !b) return { distance: Number.POSITIVE_INFINITY, t: 0 }
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared))
  return { distance: Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)), t }
}

function toCoordinates([longitude, latitude]: LngLat): Coordinates {
  return { latitude, longitude }
}
