import { useEffect, useMemo, useState } from 'react'
import { FUELS, findFuel } from '../config/fuels'
import { usePreferences } from '../stores/preferences'
import { useSession } from '../stores/session'
import { calculateBestStation, type CostAssumptions } from '../utils/best-station'
import { openingStatus } from '../utils/opening-hours'
import { availableBrands, rankStations, stationsWithFuel, type RankedStation } from '../utils/ranking'
import { describeRecommendation, type RecommendationCopy } from '../utils/recommendation'
import { fold } from '../utils/text'

export interface VisibleStations {
  ranked: RankedStation[]
  /** Fuels sold by at least one loaded station, for the fuel selector. */
  availableFuelIds: ReadonlySet<number>
  /** Active filters beyond fuel, radius and sort, for the "clear" affordance. */
  activeFilters: number
  brands: string[]
  withFuelCount: number
  recommendation: RecommendationCopy | null
  assumptions: CostAssumptions
  /** Clock used for opening hours and freshness, ticking once a minute. */
  now: Date
}

export function useVisibleStations(): VisibleStations {
  const stations = useSession((state) => state.stations)
  const fuelId = usePreferences((state) => state.fuelId)
  const sort = usePreferences((state) => state.sort)
  const openNow = usePreferences((state) => state.openNow)
  const brand = usePreferences((state) => state.brand)
  const maxPrice = usePreferences((state) => state.maxPrice)
  const liters = usePreferences((state) => state.liters)
  const consumptionLitersPer100Km = usePreferences((state) => state.consumptionLitersPer100Km)
  const roundTrip = usePreferences((state) => state.roundTrip)
  const mode = usePreferences((state) => state.mode)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const availableFuelIds = useMemo(
    () => new Set(FUELS.filter((fuel) => stations.some((station) => station.prices[fuel.field] !== undefined)).map((fuel) => fuel.id)),
    [stations],
  )

  return useMemo(() => {
    const fuel = findFuel(fuelId)
    // Along a route the detour already counts leaving and rejoining it; doubling it again would be wrong.
    const assumptions = { liters, consumptionLitersPer100Km, roundTrip: mode === 'route' ? false : roundTrip }
    const offered = stationsWithFuel(stations, fuel)
    const filtered = offered.filter((station) => {
      const price = station.prices[fuel.field]
      if (price === undefined) return false
      if (maxPrice !== null && price > maxPrice) return false
      if (brand && fold(station.brand) !== fold(brand)) return false
      if (openNow && openingStatus(station.schedule, now) === 'closed') return false
      return true
    })
    const costs = calculateBestStation(
      filtered.map((station) => ({
        id: station.id,
        pricePerLiter: station.prices[fuel.field] ?? null,
        distanceKm: station.distanceKm,
      })),
      assumptions,
    )
    const ranked = rankStations(filtered, {
      fuel,
      sort,
      openNow: false,
      brand: null,
      maxPrice: null,
      now,
      costs,
    })
    return {
      ranked,
      availableFuelIds,
      activeFilters: Number(openNow) + Number(brand !== null) + Number(maxPrice !== null),
      brands: availableBrands(offered),
      withFuelCount: offered.length,
      recommendation: describeRecommendation(
        costs,
        ranked.map((item) => item.station),
        fuel.label,
        liters,
        mode === 'route',
      ),
      assumptions,
      now,
    }
  }, [
    stations,
    mode,
    availableFuelIds,
    fuelId,
    sort,
    openNow,
    brand,
    maxPrice,
    liters,
    consumptionLitersPer100Km,
    roundTrip,
    now,
  ])
}
