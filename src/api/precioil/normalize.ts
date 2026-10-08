import { FUELS, type FuelField } from '../../config/fuels'
import type { Coordinates, RoadMargin, SaleType, Station } from '../../types/domain'
import { haversineKm, isPlausibleCoordinate } from '../../utils/distance'
import { parseCoordinate, parseDistance, parsePrice } from '../../utils/numbers'
import { titleCase } from '../../utils/text'
import { z } from 'zod'

const rawStationSchema = z.looseObject({
  idEstacion: z.number().int(),
  nombreEstacion: z.string().optional(),
  marca: z.string().optional(),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  nombreMunicipio: z.string().optional(),
  provincia: z.string().optional(),
  codPostal: z.union([z.string(), z.number()]).optional(),
  latitud: z.union([z.number(), z.string()]),
  longitud: z.union([z.number(), z.string()]),
  distancia: z.union([z.number(), z.string()]).optional(),
  horario: z.string().optional(),
  tipoVenta: z.string().optional(),
  margen: z.string().optional(),
  idMunicipio: z.number().int().optional(),
  lastUpdate: z.string().optional(),
  updatedAt: z.string().optional(),
  servicios: z.string().optional(),
})

export function parseStation(input: unknown, origin: Coordinates): Station | null {
  const parsed = rawStationSchema.safeParse(input)
  const record = z.record(z.string(), z.unknown()).safeParse(input)
  if (!parsed.success || !record.success) return null
  const latitude = parseCoordinate(parsed.data.latitud)
  const longitude = parseCoordinate(parsed.data.longitud)
  if (latitude === null || longitude === null || !isPlausibleCoordinate(latitude, longitude)) return null

  const reportedDistance = parseDistance(parsed.data.distancia)
  const distanceKm =
    reportedDistance ??
    haversineKm(origin, { latitude, longitude })

  const name = cleanLabel(parsed.data.nombreEstacion) || cleanLabel(parsed.data.marca) || 'Gasolinera'
  const brand = cleanLabel(parsed.data.marca) || name

  return {
    id: parsed.data.idEstacion,
    name,
    brand,
    address: cleanLabel(parsed.data.direccion) || 'Dirección no disponible',
    locality: cleanLabel(parsed.data.localidad),
    municipality: cleanLabel(parsed.data.nombreMunicipio),
    province: cleanLabel(parsed.data.provincia),
    postalCode: parsed.data.codPostal === undefined ? '' : String(parsed.data.codPostal),
    latitude,
    longitude,
    distanceKm,
    schedule: parsed.data.horario?.trim() || null,
    saleType: saleType(parsed.data.tipoVenta),
    margin: roadMargin(parsed.data.margen),
    municipalityId: parsed.data.idMunicipio ?? null,
    updatedAt: parsed.data.lastUpdate ?? parsed.data.updatedAt ?? null,
    prices: readPrices(record.data),
    services: parsed.data.servicios?.trim() || null,
  }
}

export function parseStationList(input: unknown, origin: Coordinates): Station[] {
  const list = z.array(z.unknown()).safeParse(input)
  if (!list.success) return []
  const stations = new Map<number, Station>()
  for (const item of list.data) {
    const station = parseStation(item, origin)
    if (station) stations.set(station.id, station)
  }
  return [...stations.values()]
}

function readPrices(record: Record<string, unknown>): Partial<Record<FuelField, number>> {
  const prices: Partial<Record<FuelField, number>> = {}
  for (const fuel of FUELS) {
    const price = parsePrice(record[fuel.field])
    if (price !== null) prices[fuel.field] = price
  }
  return prices
}

function cleanLabel(value: string | undefined): string {
  if (!value?.trim()) return ''
  return titleCase(value)
}

function saleType(value: string | undefined): SaleType {
  switch (value?.toUpperCase()) {
    case 'P':
      return 'public'
    case 'R':
      return 'restricted'
    default:
      return 'unknown'
  }
}

function roadMargin(value: string | undefined): RoadMargin {
  switch (value?.toUpperCase()) {
    case 'D':
      return 'right'
    case 'I':
      return 'left'
    case 'N':
      return 'none'
    default:
      return 'unknown'
  }
}
