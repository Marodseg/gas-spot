import { analytics } from '../../services/analytics'
import { usePreferences } from '../../stores/preferences'
import type { Station } from '../../types/domain'
import { openDirections, openUrl, routeDirectionsUrl } from '../../utils/navigation'

/** "Cómo llegar": straight to the station, or the whole trip with it as a stop in route mode. */
export function goToStation(station: Station, from: 'card' | 'detail'): void {
  analytics.track('directions_open', { stationId: station.id, from })
  const { mode, routeFrom, routeTo } = usePreferences.getState()
  if (mode === 'route' && station.routeKm !== undefined && routeFrom && routeTo) {
    openUrl(routeDirectionsUrl(routeFrom, station, routeTo))
    return
  }
  openDirections(station.latitude, station.longitude)
}
