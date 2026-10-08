import { analytics } from '../../services/analytics'
import { usePreferences } from '../../stores/preferences'
import { useSession } from '../../stores/session'
import type { Place } from '../../types/domain'

export function choosePlace(place: Place): void {
  analytics.track('origin_selected', { source: place.source })
  usePreferences.getState().setLastPlace(place)
  useSession.getState().setOrigin(place)
}
