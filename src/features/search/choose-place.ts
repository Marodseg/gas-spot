import { analytics } from '../../services/analytics'
import { locate } from '../../services/geolocation'
import { usePreferences } from '../../stores/preferences'
import { useSession } from '../../stores/session'
import type { AppError, Place } from '../../types/domain'
import { appError } from '../../utils/messages'

export function choosePlace(place: Place): void {
  analytics.track('origin_selected', { source: place.source })
  usePreferences.getState().setLastPlace(place)
  useSession.getState().setOrigin(place)
}

/** Asks the browser for the position. Always ends in a place or a readable error, never a stuck spinner. */
export async function requestLocation(): Promise<void> {
  const session = useSession.getState()
  if (session.locating) return
  session.setLocating(true)
  try {
    const place = await locate()
    useSession.getState().setLocating(false)
    choosePlace(place)
  } catch (caught) {
    useSession.getState().setLocating(false, isAppError(caught) ? caught : appError('geolocation_unavailable'))
  }
}

function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && error !== null && 'code' in error && 'title' in error
}
