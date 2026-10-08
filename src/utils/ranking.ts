import type { FuelDefinition } from '../config/fuels'
import type { SortMode, Station } from '../types/domain'
import type { BestStationResult, StationCost } from './best-station'
import { costById } from './best-station'
import type { OpenStatus } from './opening-hours'
import { openingStatus } from './opening-hours'
import type { PriceBand } from './price-scale'
import { priceScale } from './price-scale'
import { fold } from './text'

export interface RankedStation {
  station: Station
  price: number
  band: PriceBand
  bandLabel: string
  cost: StationCost | null
  openStatus: OpenStatus
  isBest: boolean
  isCheapest: boolean
  isNearest: boolean
}

export interface RankOptions {
  fuel: FuelDefinition
  sort: SortMode
  openNow: boolean
  brand: string | null
  maxPrice: number | null
  now: Date
  costs: BestStationResult
}

export function stationsWithFuel(stations: readonly Station[], fuel: FuelDefinition): Station[] {
  return stations.filter((station) => station.prices[fuel.field] !== undefined)
}

export function availableBrands(stations: readonly Station[]): string[] {
  const counts = new Map<string, { label: string; count: number }>()
  for (const station of stations) {
    const label = station.brand.trim()
    if (!label) continue
    const key = fold(label)
    const current = counts.get(key)
    counts.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + 1 })
  }
  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'es'))
    .map((entry) => entry.label)
}

export function rankStations(stations: readonly Station[], options: RankOptions): RankedStation[] {
  const filtered = stations.filter((station) => matches(station, options))
  const scale = priceScale(filtered.map((station) => station.prices[options.fuel.field] ?? 0))
  const costs = costById(options.costs)
  const ranked = filtered.map((station) => {
    const price = station.prices[options.fuel.field] ?? 0
    const reading = scale(price)
    return {
      station,
      price,
      band: reading.band,
      bandLabel: reading.label,
      cost: costs.get(station.id) ?? null,
      openStatus: openingStatus(station.schedule, options.now),
      isBest: station.id === options.costs.bestId,
      isCheapest: station.id === options.costs.cheapestId,
      isNearest: station.id === options.costs.baselineId,
    }
  })
  ranked.sort((left, right) => compareRanked(left, right, options.sort))
  return ranked
}

function matches(station: Station, options: RankOptions): boolean {
  const price = station.prices[options.fuel.field]
  if (price === undefined) return false
  if (options.maxPrice !== null && price > options.maxPrice) return false
  if (options.brand && fold(station.brand) !== fold(options.brand)) return false
  if (options.openNow && openingStatus(station.schedule, options.now) === 'closed') return false
  return true
}

function compareRanked(left: RankedStation, right: RankedStation, sort: SortMode): number {
  switch (sort) {
    case 'price':
      return left.price - right.price || left.station.distanceKm - right.station.distanceKm
    case 'distance':
      return left.station.distanceKm - right.station.distanceKm || left.price - right.price
    case 'recommended': {
      const leftNet = left.cost?.netCostEur ?? Number.POSITIVE_INFINITY
      const rightNet = right.cost?.netCostEur ?? Number.POSITIVE_INFINITY
      return leftNet - rightNet || left.station.distanceKm - right.station.distanceKm || left.price - right.price
    }
    default: {
      const unreachable: never = sort
      return unreachable
    }
  }
}
