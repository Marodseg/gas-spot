import { describe, expect, it } from 'vitest'
import { indexLine, samplePoints, simplifyLine, type LngLat } from './route-geometry'

// About 22 km due north from Granada, with a slight kink in the middle.
const line: LngLat[] = [
  [-3.6, 37.1],
  [-3.6, 37.2],
  [-3.6001, 37.2001],
  [-3.6, 37.3],
]

describe('geometría de la ruta', () => {
  it('simplifica puntos redundantes sin perder los extremos', () => {
    const simplified = simplifyLine(line, 0.05)
    expect(simplified[0]).toEqual(line[0])
    expect(simplified[simplified.length - 1]).toEqual(line[3])
    expect(simplified.length).toBeLessThan(line.length)
  })

  it('reparte puntos de búsqueda a intervalos regulares', () => {
    const samples = samplePoints(line, 5)
    // 22 km at 5 km intervals: start, 5, 10, 15, 20 and the end.
    expect(samples).toHaveLength(6)
    expect(samples[0]).toEqual({ longitude: -3.6, latitude: 37.1 })
    expect(samples[samples.length - 1]).toEqual({ longitude: -3.6, latitude: 37.3 })
  })

  it('sitúa una estación en el kilómetro de la ruta y mide lo que se aparta', () => {
    const route = indexLine(line)
    expect(route.lengthKm).toBeGreaterThan(22)
    expect(route.lengthKm).toBeLessThan(22.5)
    // 1 km east of the route, halfway along.
    const position = route.locate({ latitude: 37.2, longitude: -3.5887 })
    expect(position.routeKm).toBeGreaterThan(10.8)
    expect(position.routeKm).toBeLessThan(11.4)
    expect(position.offRouteKm).toBeGreaterThan(0.9)
    expect(position.offRouteKm).toBeLessThan(1.1)
  })
})
