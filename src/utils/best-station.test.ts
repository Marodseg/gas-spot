import { describe, expect, it } from 'vitest'
import { calculateBestStation } from './best-station'

const assumptions = { liters: 40, consumptionLitersPer100Km: 6.5, roundTrip: false }

describe('calculateBestStation', () => {
  it('elige la estación más lejana cuando el ahorro de combustible supera el desvío', () => {
    const result = calculateBestStation(
      [
        { id: 1, pricePerLiter: 1.469, distanceKm: 3 },
        { id: 2, pricePerLiter: 1.419, distanceKm: 14 },
      ],
      assumptions,
    )
    expect(result.baselineId).toBe(1)
    expect(result.cheapestId).toBe(2)
    expect(result.bestId).toBe(2)
    const farther = result.rows.find((row) => row.id === 2)
    expect(farther?.fuelCostEur).toBe(56.76)
    expect(farther?.extraDistanceKm).toBe(11)
    expect(farther?.travelCostEur).toBeCloseTo(1.05, 2)
    expect(farther?.netSavingVsBaselineEur).toBeGreaterThan(0)
  })

  it('se queda con la cercana si el consumo del desvío se come el ahorro', () => {
    const result = calculateBestStation(
      [
        { id: 1, pricePerLiter: 1.469, distanceKm: 3 },
        { id: 2, pricePerLiter: 1.449, distanceKm: 20 },
      ],
      { liters: 20, consumptionLitersPer100Km: 12, roundTrip: true },
    )
    expect(result.bestId).toBe(1)
    expect(result.cheapestId).toBe(2)
  })

  it('ignora estaciones sin precio y desempata por distancia', () => {
    const result = calculateBestStation(
      [
        { id: 3, pricePerLiter: null, distanceKm: 1 },
        { id: 2, pricePerLiter: 1.5, distanceKm: 4 },
        { id: 1, pricePerLiter: 1.5, distanceKm: 2 },
      ],
      assumptions,
    )
    expect(result.bestId).toBe(1)
    expect(result.baselineId).toBe(1)
    expect(result.rows.find((row) => row.id === 3)?.netCostEur).toBeNull()
  })

  it('no presenta una estimación si los litros no son válidos', () => {
    const result = calculateBestStation(
      [{ id: 1, pricePerLiter: 1.5, distanceKm: 2 }],
      { liters: 0, consumptionLitersPer100Km: 6, roundTrip: false },
    )
    expect(result.assumptionsValid).toBe(false)
    expect(result.rows[0]?.netCostEur).toBeNull()
    expect(result.bestId).toBe(1)
  })
})
