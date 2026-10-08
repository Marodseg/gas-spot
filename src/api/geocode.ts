import type { Place } from '../types/domain'
import { responseCache } from './cache'
import { z } from 'zod'

const SPAIN_BBOX = '-18.2,27.6,4.4,43.8'
const TTL_MS = 60 * 60 * 1000

const photonSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({
        coordinates: z.tuple([z.number(), z.number()]),
      }),
      properties: z.looseObject({
        name: z.string().optional(),
        street: z.string().optional(),
        housenumber: z.string().optional(),
        city: z.string().optional(),
        locality: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        countrycode: z.string().optional(),
      }),
    }),
  ),
})

export async function searchPlaces(query: string, bias?: { latitude: number; longitude: number }, signal?: AbortSignal): Promise<Place[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  const key = `photon:${trimmed.toLocaleLowerCase('es-ES')}:${bias ? `${bias.latitude.toFixed(1)},${bias.longitude.toFixed(1)}` : 'es'}`
  return responseCache.fetch(key, TTL_MS, () => loadPlaces(trimmed, bias, signal))
}

async function loadPlaces(
  query: string,
  bias: { latitude: number; longitude: number } | undefined,
  signal?: AbortSignal,
): Promise<Place[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '6')
  url.searchParams.set('lang', 'default')
  url.searchParams.set('bbox', SPAIN_BBOX)
  if (bias) {
    url.searchParams.set('lat', String(bias.latitude))
    url.searchParams.set('lon', String(bias.longitude))
  }
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('geocode_failed')
  const body: unknown = JSON.parse(await response.text()) as unknown
  const parsed = photonSchema.safeParse(body)
  if (!parsed.success) return []
  const places: Place[] = []
  for (const feature of parsed.data.features) {
    if (feature.properties.countrycode && feature.properties.countrycode !== 'ES') continue
    const [longitude, latitude] = feature.geometry.coordinates
    const label = placeLabel(feature.properties)
    if (!label) continue
    places.push({ label, latitude, longitude, source: 'search' })
  }
  return places
}

function placeLabel(properties: {
  name?: string
  street?: string
  housenumber?: string
  city?: string
  locality?: string
  state?: string
  postcode?: string
}): string {
  const street = [properties.street, properties.housenumber].filter(Boolean).join(' ')
  const city = properties.city || properties.locality
  if (street && city) return [street, city, properties.postcode].filter(Boolean).join(', ')
  return [properties.name, city, properties.state, properties.postcode].filter(Boolean).join(', ')
}
