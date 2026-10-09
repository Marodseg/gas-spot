import { analytics } from '../../services/analytics'
import { locate } from '../../services/geolocation'
import { usePreferences } from '../../stores/preferences'
import { useSession } from '../../stores/session'
import type { AppError, Place, SearchMode } from '../../types/domain'
import { appError } from '../../utils/messages'

export function choosePlace(place: Place): void {
  analytics.track('origin_selected', { source: place.source })
  usePreferences.getState().setLastPlace(place)
  useSession.getState().setOrigin(place)
}

/**
 * Asks the browser for the position and hands it to `onPlace` (the nearby
 * search by default). Always ends in a place or a readable error, never a
 * stuck spinner.
 */
export async function requestLocation(onPlace: (place: Place) => void = choosePlace): Promise<void> {
  const session = useSession.getState()
  if (session.locating) return
  session.setLocating(true)
  try {
    const place = await locate()
    useSession.getState().setLocating(false)
    onPlace(place)
  } catch (caught) {
    useSession.getState().setLocating(false, isAppError(caught) ? caught : appError('geolocation_unavailable'))
  }
}

function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && error !== null && 'code' in error && 'title' in error
}

/** Switches between searching around a place and along a route, starting each from a clean slate. */
export function switchMode(mode: SearchMode): void {
  const preferences = usePreferences.getState()
  if (preferences.mode === mode) return
  analytics.track('mode_selected', { mode })
  const current = useSession.getState().origin
  useSession.getState().resetResults()
  preferences.setMode(mode)
  if (mode === 'route') {
    // The place being looked at is the natural start of the trip.
    const from = preferences.routeFrom ?? current
    if (from) chooseRouteFrom(from)
    return
  }
  if (preferences.lastPlace) useSession.getState().setOrigin(preferences.lastPlace)
}

export function chooseRouteFrom(place: Place): void {
  usePreferences.getState().setRouteFrom(place)
  useSession.getState().setOrigin(place)
}

export function chooseRouteTo(place: Place): void {
  analytics.track('route_destination_selected', { source: place.source })
  usePreferences.getState().setRouteTo(place)
}

export function swapRoute(): void {
  const { routeFrom, routeTo } = usePreferences.getState()
  usePreferences.getState().swapRoute()
  if (routeTo) useSession.getState().setOrigin(routeTo)
  else if (routeFrom) useSession.getState().resetResults()
}
