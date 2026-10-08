import { describe, expect, it } from 'vitest'
import type { Station } from '../types/domain'
import { haversineKm } from './distance'
import { buildDailySeries } from './history-series'
import { openingStatus } from './opening-hours'
import { priceScale } from './price-scale'
import { rankStations } from './ranking'
import { describeRecommendation } from './recommendation'
import { calculateBestStation } from './best-station'
import { findFuel } from '../config/fuels'

describe('distancia', () => {
  it('calcula unos 1,0 km entre dos puntos de Granada', () => {
    const km = haversineKm(
      { latitude: 37.1773, longitude: -3.5986 },
      { latitude: 37.170194, longitude: -3.605806 },
    )
    expect(km).toBeGreaterThan(0.9)
    expect(km).toBeLessThan(1.2)
  })
})

describe('horario', () => {
  const schedule = 'L-V: 07:30-22:00; S: 08:00-22:00; D: 09:00-21:00'
  it('está abierta un jueves al mediodía en España', () => {
    expect(openingStatus(schedule, new Date('2026-10-08T10:00:00Z'))).toBe('open')
  })
  it('está cerrada un jueves por la noche', () => {
    expect(openingStatus(schedule, new Date('2026-10-08T21:30:00Z'))).toBe('closed')
  })
  it('trata el 24H como abierta y un texto ilegible como desconocido', () => {
    expect(openingStatus('L-D: 24H', new Date('2026-10-08T10:00:00Z'))).toBe('open')
    expect(openingStatus('consultar en tienda', new Date('2026-10-08T10:00:00Z'))).toBe('unknown')
  })
})

describe('escala de precios', () => {
  it('marca el mínimo como barato y el máximo como caro dentro del conjunto visible', () => {
    const scale = priceScale([1.4, 1.5, 1.6, 1.7, 1.8])
    expect(scale(1.4).band).toBe('cheap')
    expect(scale(1.8).band).toBe('high')
    expect(scale(1.6).label.length).toBeGreaterThan(0)
  })
  it('no separa precios casi idénticos', () => {
    const scale = priceScale([1.5, 1.501, 1.502])
    expect(scale(1.5).band).toBe('mid')
    expect(scale(1.502).label).toMatch(/similar/i)
  })
})

describe('histórico diario', () => {
  it('arrastra el último precio conocido a los días siguientes', () => {
    const series = buildDailySeries(
      [
        { id: 1, stationId: 9, fuelId: 6, price: 1.5, timestamp: '2026-10-01T10:00:00.000Z' },
        { id: 2, stationId: 9, fuelId: 6, price: 1.45, timestamp: '2026-10-03T10:00:00.000Z' },
      ],
      '2026-10-01',
      '2026-10-04',
    )
    expect(series.map((point) => point.price)).toEqual([1.5, 1.5, 1.45, 1.45])
  })
})

describe('filtros y orden', () => {
  const stations = [makeStation(1, 'Repsol', 1.7, 1), makeStation(2, 'Cepsa', 1.5, 8, 'L-D: 24H')]
  const fuel = findFuel(6)
  const costs = calculateBestStation(
    stations.map((station) => ({ id: station.id, pricePerLiter: station.prices.Diesel ?? null, distanceKm: station.distanceKm })),
    { liters: 40, consumptionLitersPer100Km: 6.5, roundTrip: false },
  )

  it('ordena por precio', () => {
    const ranked = rankStations(stations, {
      fuel,
      sort: 'price',
      openNow: false,
      brand: null,
      maxPrice: null,
      now: new Date('2026-10-08T10:00:00Z'),
      costs,
    })
    expect(ranked.map((item) => item.station.id)).toEqual([2, 1])
  })

  it('filtra por marca y por precio máximo', () => {
    const ranked = rankStations(stations, {
      fuel,
      sort: 'distance',
      openNow: false,
      brand: 'Repsol',
      maxPrice: 1.6,
      now: new Date('2026-10-08T10:00:00Z'),
      costs,
    })
    expect(ranked).toHaveLength(0)
  })
})

describe('recomendación', () => {
  it('explica que la más barata no compensa el desplazamiento', () => {
    const stations = [makeStation(1, 'Cerca', 1.469, 3), makeStation(2, 'Lejos', 1.419, 14)]
    const result = calculateBestStation(
      stations.map((station) => ({
        id: station.id,
        pricePerLiter: station.prices.Diesel ?? null,
        distanceKm: station.distanceKm,
      })),
      { liters: 15, consumptionLitersPer100Km: 14, roundTrip: true },
    )
    const copy = describeRecommendation(result, stations, 'Gasóleo A', 15)
    expect(result.bestId).toBe(1)
    expect(copy?.title).toMatch(/no compensa/i)
    expect(copy?.estimate).toBe(true)
  })
})

describe('combustible', () => {
  it('recupera gasóleo A por defecto y conserva un id conocido', () => {
    expect(findFuel(999).id).toBe(6)
    expect(findFuel(10).label).toBe('Gasolina 95')
  })
})

function makeStation(id: number, brand: string, price: number, distanceKm: number, schedule: string | null = null): Station {
  return {
    id,
    name: brand,
    brand,
    address: 'Calle 1',
    locality: 'Granada',
    municipality: 'Granada',
    province: 'Granada',
    postalCode: '18001',
    latitude: 37.17,
    longitude: -3.6,
    distanceKm,
    schedule,
    saleType: 'public',
    margin: 'unknown',
    municipalityId: 1,
    updatedAt: null,
    prices: { Diesel: price },
    services: null,
  }
}
