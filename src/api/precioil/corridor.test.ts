import { describe, expect, it, vi } from 'vitest'
import type { RouteOption, Station } from '../../types/domain'
import { searchAlongRoute } from './corridor'

const station = (id: number, latitude: number, longitude: number): Station => ({
  id,
  name: `Estación ${id}`,
  brand: `Marca ${id}`,
  address: '',
  locality: '',
  municipality: '',
  province: '',
  postalCode: '',
  latitude,
  longitude,
  distanceKm: 99,
  schedule: null,
  saleType: 'public',
  margin: 'unknown',
  municipalityId: null,
  updatedAt: null,
  prices: { Diesel: 1.5 },
  services: null,
})

vi.mock('./stations', () => ({
  // Every radius search returns the same three stations: on the road, 1 km off, 10 km off.
  searchByRadius: vi.fn(async () => [station(1, 37.2, -3.6), station(2, 37.25, -3.5887), station(3, 37.25, -3.48)]),
}))

const route: RouteOption = {
  id: 'route_0',
  distanceKm: 22,
  durationMinutes: 20,
  viaRoads: [],
  line: [
    [-3.6, 37.1],
    [-3.6, 37.3],
  ],
}

describe('gasolineras en el camino', () => {
  it('se queda con las del corredor, con su kilómetro y el desvío estimado', async () => {
    const progress = vi.fn()
    const result = await searchAlongRoute(route, progress)
    const byId = new Map(result.stations.map((item) => [item.id, item]))

    expect(byId.has(3)).toBe(false)
    expect(byId.get(1)?.distanceKm).toBe(0)
    expect(byId.get(1)?.routeKm).toBeCloseTo(11.1, 0)
    // 1 km off the road, there and back, with the road factor: about 2.6 km extra.
    expect(byId.get(2)?.distanceKm).toBeCloseTo(2.6, 0)
    expect(result.failedStretches).toBe(0)
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ done: expect.any(Number), total: expect.any(Number) }))
  })
})
