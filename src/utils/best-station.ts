import { roundMoney } from './numbers'

export interface StationQuote {
  id: number
  pricePerLiter: number | null
  distanceKm: number
}

export interface CostAssumptions {
  liters: number
  consumptionLitersPer100Km: number
  roundTrip: boolean
}

export interface StationCost {
  id: number
  pricePerLiter: number | null
  distanceKm: number
  fuelCostEur: number | null
  extraDistanceKm: number
  travelCostEur: number | null
  netCostEur: number | null
  fuelSavingVsBaselineEur: number | null
  netSavingVsBaselineEur: number | null
}

export interface BestStationResult {
  assumptionsValid: boolean
  baselineId: number | null
  cheapestId: number | null
  bestId: number | null
  rows: StationCost[]
}

/**
 * Coste neto = litros × precio oficial + coste estimado del desvío.
 *
 * El desvío son los kilómetros de más respecto a la gasolinera con precio
 * más cercana. Esos kilómetros se valoran al precio de esa gasolinera de
 * referencia. Con `roundTrip`, el desvío cuenta ida y vuelta.
 *
 * Es una estimación para decidir. No es un peaje, ni un dato oficial.
 */
export function calculateBestStation(
  stations: readonly StationQuote[],
  assumptions: CostAssumptions,
): BestStationResult {
  const assumptionsValid = assumptions.liters > 0 && assumptions.consumptionLitersPer100Km >= 0
  const priced = stations.filter(
    (station): station is StationQuote & { pricePerLiter: number } =>
      station.pricePerLiter !== null && station.distanceKm >= 0,
  )
  const baseline = cheapestDistance(priced)
  const cheapest = lowestPrice(priced)
  const referencePrice = baseline?.pricePerLiter ?? null
  const tripFactor = assumptions.roundTrip ? 2 : 1

  const rows = stations.map((station) => {
    const price = station.pricePerLiter
    const extraDistanceKm =
      baseline && price !== null ? Math.max(0, station.distanceKm - baseline.distanceKm) : 0
    if (!assumptionsValid || price === null || referencePrice === null || baseline === undefined) {
      return emptyCost(station, extraDistanceKm)
    }
    const fuelCostEur = roundMoney(assumptions.liters * price)
    const travelLiters = (extraDistanceKm * tripFactor * assumptions.consumptionLitersPer100Km) / 100
    const travelCostEur = roundMoney(travelLiters * referencePrice)
    const netCostEur = roundMoney(fuelCostEur + travelCostEur)
    const baselineFuel = roundMoney(assumptions.liters * baseline.pricePerLiter)
    return {
      id: station.id,
      pricePerLiter: price,
      distanceKm: station.distanceKm,
      fuelCostEur,
      extraDistanceKm,
      travelCostEur,
      netCostEur,
      fuelSavingVsBaselineEur: roundMoney(baselineFuel - fuelCostEur),
      netSavingVsBaselineEur: roundMoney(baselineFuel - netCostEur),
    }
  })

  const best = rows
    .filter((row) => row.netCostEur !== null)
    .sort(compareCost)[0]

  return {
    assumptionsValid,
    baselineId: baseline?.id ?? null,
    cheapestId: cheapest?.id ?? null,
    bestId: assumptionsValid ? (best?.id ?? null) : (cheapest?.id ?? null),
    rows,
  }
}

export function costById(result: BestStationResult): Map<number, StationCost> {
  return new Map(result.rows.map((row) => [row.id, row]))
}

function emptyCost(station: StationQuote, extraDistanceKm: number): StationCost {
  return {
    id: station.id,
    pricePerLiter: station.pricePerLiter,
    distanceKm: station.distanceKm,
    fuelCostEur: null,
    extraDistanceKm,
    travelCostEur: null,
    netCostEur: null,
    fuelSavingVsBaselineEur: null,
    netSavingVsBaselineEur: null,
  }
}

function cheapestDistance(
  stations: readonly (StationQuote & { pricePerLiter: number })[],
): (StationQuote & { pricePerLiter: number }) | undefined {
  return [...stations].sort((left, right) => {
    if (left.distanceKm !== right.distanceKm) return left.distanceKm - right.distanceKm
    if (left.pricePerLiter !== right.pricePerLiter) return left.pricePerLiter - right.pricePerLiter
    return left.id - right.id
  })[0]
}

function lowestPrice(
  stations: readonly (StationQuote & { pricePerLiter: number })[],
): (StationQuote & { pricePerLiter: number }) | undefined {
  return [...stations].sort((left, right) => {
    if (left.pricePerLiter !== right.pricePerLiter) return left.pricePerLiter - right.pricePerLiter
    if (left.distanceKm !== right.distanceKm) return left.distanceKm - right.distanceKm
    return left.id - right.id
  })[0]
}

function compareCost(left: StationCost, right: StationCost): number {
  const leftNet = left.netCostEur ?? Number.POSITIVE_INFINITY
  const rightNet = right.netCostEur ?? Number.POSITIVE_INFINITY
  if (leftNet !== rightNet) return leftNet - rightNet
  if (left.distanceKm !== right.distanceKm) return left.distanceKm - right.distanceKm
  const leftPrice = left.pricePerLiter ?? Number.POSITIVE_INFINITY
  const rightPrice = right.pricePerLiter ?? Number.POSITIVE_INFINITY
  if (leftPrice !== rightPrice) return leftPrice - rightPrice
  return left.id - right.id
}
