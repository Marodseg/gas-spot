import { analytics } from '../../services/analytics'
import { usePreferences } from '../../stores/preferences'

export function selectFuel(id: number): void {
  analytics.track('fuel_selected', { fuelId: id })
  usePreferences.getState().setFuelId(id)
}
