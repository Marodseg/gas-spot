import { z } from 'zod'
import type { Place, RouteOption } from '../../types/domain'
import { simplifyLine } from '../../utils/route-geometry'
import { precioilPost } from './client'

const routesSchema = z.object({
  routes: z.array(
    z.object({
      id: z.string(),
      distanceKm: z.number(),
      durationMinutes: z.number(),
      viaRoads: z.array(z.string()).optional(),
      geometry: z.object({ coordinates: z.array(z.tuple([z.number(), z.number()])) }),
    }),
  ),
})

/** Routes cost 5 of the account's daily route points, so results are kept for a while. */
const TTL_MS = 6 * 60 * 60 * 1000
const STORAGE_KEY = 'reposta.routes.v1'
const MAX_ENTRIES = 6
/** ~25 m: invisible on the map, keeps a 400 km route to a few hundred points. */
const SIMPLIFY_KM = 0.025

interface StoredRoutes {
  savedAt: number
  routes: RouteOption[]
}

/** Driving alternatives between two places (POST /v1/rutas/recorridos). */
export async function searchRoutes(origin: Place, destination: Place, signal?: AbortSignal): Promise<RouteOption[]> {
  const key = routeKey(origin, destination)
  const cached = readCache()[key]
  if (cached && Date.now() - cached.savedAt < TTL_MS) return cached.routes

  const body = await precioilPost(
    '/v1/rutas/recorridos',
    {
      origin: { lat: origin.latitude, lon: origin.longitude, label: origin.label },
      destination: { lat: destination.latitude, lon: destination.longitude, label: destination.label },
      route: { alternatives: 3 },
    },
    signal,
  )
  const parsed = routesSchema.safeParse(body)
  if (!parsed.success) return []
  const routes = parsed.data.routes.map((route) => ({
    id: route.id,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    viaRoads: route.viaRoads ?? [],
    line: simplifyLine(route.geometry.coordinates, SIMPLIFY_KM),
  }))
  writeCache(key, { savedAt: Date.now(), routes })
  return routes
}

function routeKey(origin: Place, destination: Place): string {
  const point = (place: Place) => `${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}`
  return `${point(origin)}>${point(destination)}`
}

function readCache(): Record<string, StoredRoutes> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, StoredRoutes>) : {}
  } catch {
    return {}
  }
}

function writeCache(key: string, entry: StoredRoutes): void {
  try {
    const entries = Object.entries({ ...readCache(), [key]: entry })
      .filter(([, value]) => Date.now() - value.savedAt < TTL_MS)
      .sort(([, left], [, right]) => right.savedAt - left.savedAt)
      .slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // Storage full or blocked: the route still works, it just is not reused.
  }
}
