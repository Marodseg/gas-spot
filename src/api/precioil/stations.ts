import type { Coordinates, Station } from '../../types/domain'
import { responseCache } from '../cache'
import { precioilGet } from './client'
import { isPrecioilError } from './errors'
import { parseStation, parseStationList } from './normalize'

const SEARCH_TTL_MS = 2 * 60 * 1000
const DETAIL_TTL_MS = 2 * 60 * 1000
const PAGE_SIZE = 100
const MAX_STATIONS = 200

export interface RadiusSearch {
  latitude: number
  longitude: number
  radiusKm: number
}

export async function searchByRadius(search: RadiusSearch, signal?: AbortSignal): Promise<Station[]> {
  const origin = { latitude: roundCoord(search.latitude), longitude: roundCoord(search.longitude) }
  const radiusKm = search.radiusKm
  const key = `radio:${origin.latitude}:${origin.longitude}:${radiusKm}`
  return responseCache.fetch(key, SEARCH_TTL_MS, () => loadRadius(origin, radiusKm, signal))
}

export async function getStation(id: number, origin: Coordinates, signal?: AbortSignal): Promise<Station | null> {
  const key = `detalle:${id}`
  const body = await responseCache.fetch(key, DETAIL_TTL_MS, () => loadDetail(id, signal))
  if (body === null) return null
  return parseStation(body, origin)
}

async function loadDetail(id: number, signal?: AbortSignal): Promise<unknown | null> {
  try {
    return await precioilGet(`/estaciones/detalles/${id}`, undefined, signal)
  } catch (error) {
    if (isPrecioilError(error) && error.code === 'not_found') return null
    throw error
  }
}

async function loadRadius(origin: Coordinates, radiusKm: number, signal?: AbortSignal): Promise<Station[]> {
  const collected: Station[] = []
  for (let page = 1; collected.length < MAX_STATIONS; page += 1) {
    let body: unknown
    try {
      body = await precioilGet(
        '/estaciones/radio',
        {
          latitud: origin.latitude,
          longitud: origin.longitude,
          radio: radiusKm,
          pagina: page,
          limite: PAGE_SIZE,
          fields: 'current',
        },
        signal,
      )
    } catch (error) {
      if (isPrecioilError(error) && error.code === 'not_found') break
      throw error
    }
    const batch = parseStationList(body, origin)
    collected.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  const unique = new Map<number, Station>()
  for (const station of collected) unique.set(station.id, station)
  return [...unique.values()].slice(0, MAX_STATIONS)
}

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000
}
