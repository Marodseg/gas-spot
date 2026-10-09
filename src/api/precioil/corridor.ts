import type { RouteOption, Station } from '../../types/domain'
import { indexLine, samplePoints } from '../../utils/route-geometry'
import { searchByRadius } from './stations'

/** Stations farther than this from the route are not "on the way". */
export const CORRIDOR_KM = 3
/** Road kilometres per straight-line kilometre when leaving and rejoining the route. */
const ROAD_FACTOR = 1.3
/** Under this, the station is on the route itself (service area, roadside). */
const ON_ROUTE_KM = 0.15
const MAX_SAMPLES = 60
const MIN_STEP_KM = 8
const CONCURRENCY = 4

export interface CorridorProgress {
  done: number
  total: number
}

export interface CorridorResult {
  stations: Station[]
  /** Route stretches that could not be searched; the list is then partial. */
  failedStretches: number
}

/**
 * Stations along a route, found with radius searches spaced along it (they do
 * not use the account's route points). Each station gets its kilometre on the
 * route and, as `distanceKm`, the estimated extra road distance to visit it,
 * so the existing ranking and savings logic apply unchanged.
 */
export async function searchAlongRoute(
  route: RouteOption,
  onProgress: (progress: CorridorProgress) => void,
  signal?: AbortSignal,
): Promise<CorridorResult> {
  const line = indexLine(route.line)
  const stepKm = Math.max(MIN_STEP_KM, line.lengthKm / MAX_SAMPLES)
  // Circles of radius 0.65 × step overlap enough to cover the whole corridor width.
  const radiusKm = Math.min(30, Math.max(CORRIDOR_KM + 2, Math.ceil(stepKm * 0.65)))
  const samples = samplePoints(route.line, stepKm)
  const found = new Map<number, Station>()
  let done = 0
  let failed = 0
  let lastError: unknown = null
  onProgress({ done, total: samples.length })

  const queue = [...samples]
  const worker = async () => {
    for (let sample = queue.shift(); sample; sample = queue.shift()) {
      try {
        for (const station of await searchByRadius({ ...sample, radiusKm }, signal)) found.set(station.id, station)
      } catch (error) {
        if (signal?.aborted) throw error
        failed += 1
        lastError = error
      }
      done += 1
      onProgress({ done, total: samples.length })
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, samples.length) }, worker))
  if (failed === samples.length && lastError) throw lastError

  const stations: Station[] = []
  for (const station of found.values()) {
    const position = line.locate(station)
    if (position.offRouteKm > CORRIDOR_KM) continue
    const detourKm = position.offRouteKm < ON_ROUTE_KM ? 0 : 2 * position.offRouteKm * ROAD_FACTOR
    stations.push({ ...station, distanceKm: Math.round(detourKm * 10) / 10, routeKm: position.routeKm })
  }
  return { stations, failedStretches: failed }
}
