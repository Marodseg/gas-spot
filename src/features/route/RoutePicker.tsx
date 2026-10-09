import { useSession } from '../../stores/session'
import { formatDistance, formatDuration } from '../../utils/format'

/** Driving alternatives. Hidden when there is only one. */
export function RoutePicker() {
  const routes = useSession((state) => state.routes)
  const routeIndex = useSession((state) => state.routeIndex)
  if (routes.length < 2) return null
  return (
    <div role="radiogroup" aria-label="Ruta" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:-mx-5 md:px-5">
      {routes.map((route, index) => {
        const checked = index === routeIndex
        return (
          <button
            key={route.id}
            type="button"
            role="radio"
            aria-checked={checked}
            className={`min-w-36 shrink-0 rounded-md border px-3 py-2 text-left transition-colors duration-150 ${
              checked ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:bg-raised'
            }`}
            onClick={() => useSession.getState().selectRoute(index)}
          >
            <span className="tabular block text-body-sm font-semibold">
              {formatDuration(route.durationMinutes)} · {formatDistance(route.distanceKm)}
            </span>
            <span className="block max-w-48 truncate text-caption text-muted">
              {route.viaRoads.length > 0 ? `Por ${route.viaRoads.join(', ')}` : 'Ruta alternativa'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
