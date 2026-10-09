import { useEffect, useRef } from 'react'
import { describePrecioilError, isPrecioilError } from '../api/precioil/errors'
import { getProvinceFuelAverage } from '../api/precioil/provinces'
import { searchByRadius } from '../api/precioil/stations'
import { usePreferences } from '../stores/preferences'
import { useSession } from '../stores/session'
import { appError } from '../utils/messages'
import { fold } from '../utils/text'

export function useNearbyStations(): void {
  const origin = useSession((state) => state.origin)
  const stations = useSession((state) => state.stations)
  const radiusKm = usePreferences((state) => state.radiusKm)
  const fuelId = usePreferences((state) => state.fuelId)
  const retryToken = useSession((state) => state.retryToken)
  const mode = usePreferences((state) => state.mode)
  const previousOrigin = useRef('')

  useEffect(() => {
    // In route mode the stations come from useRouteStations.
    if (!origin || mode !== 'nearby') return undefined
    const originKey = `${origin.latitude.toFixed(3)}:${origin.longitude.toFixed(3)}`
    const clearStations = previousOrigin.current !== originKey
    previousOrigin.current = originKey
    const controller = new AbortController()
    useSession.getState().setLoading(clearStations)

    void searchByRadius(
      { latitude: origin.latitude, longitude: origin.longitude, radiusKm },
      controller.signal,
    )
      .then((nextStations) => {
        if (!controller.signal.aborted) useSession.getState().setStations(nextStations)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (isPrecioilError(error)) {
          useSession.getState().setError(appError(error.code, describePrecioilError(error)))
          return
        }
        useSession.getState().setError(appError('network', error instanceof Error ? error.message : String(error)))
      })

    return () => controller.abort()
  }, [origin, radiusKm, retryToken, mode])

  useEffect(() => {
    const province = dominantProvince(stations)
    if (!province) {
      useSession.getState().setProvinceAverage(null, null)
      return undefined
    }
    const controller = new AbortController()
    void getProvinceFuelAverage(province, fuelId, controller.signal)
      .then((average) => {
        if (!controller.signal.aborted) useSession.getState().setProvinceAverage(province, average)
      })
      .catch(() => {
        if (!controller.signal.aborted) useSession.getState().setProvinceAverage(province, null)
      })
    return () => controller.abort()
  }, [stations, fuelId])
}

function dominantProvince(stations: readonly { province: string }[]): string | null {
  const counts = new Map<string, { label: string; count: number }>()
  for (const station of stations) {
    if (!station.province) continue
    const key = fold(station.province)
    const current = counts.get(key)
    counts.set(key, { label: current?.label ?? station.province, count: (current?.count ?? 0) + 1 })
  }
  return [...counts.values()].sort((left, right) => right.count - left.count)[0]?.label ?? null
}
