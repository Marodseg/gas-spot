import { ArrowUpDown, MapPin } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { usePreferences } from '../../stores/preferences'
import { chooseRouteFrom, chooseRouteTo, swapRoute } from '../search/choose-place'
import { PlaceSearch } from '../search/PlaceSearch'

/** Origin and destination of the trip, as one card with a swap button. */
export function RoutePlanner({ floating = false }: { floating?: boolean }) {
  const from = usePreferences((state) => state.routeFrom)
  const to = usePreferences((state) => state.routeTo)
  return (
    <div
      className={`flex items-center rounded-lg border bg-surface pr-1 ${
        floating ? 'border-transparent shadow-md' : 'border-line-strong'
      }`}
    >
      <div className="min-w-0 flex-1 divide-y divide-line">
        <PlaceSearch
          bare
          value={from}
          onChoose={chooseRouteFrom}
          name="route-from"
          label="Origen de la ruta"
          placeholder="Origen"
          icon={<span aria-hidden className="mx-1 size-2.5 shrink-0 rounded-full border-2 border-accent" />}
        />
        <PlaceSearch
          bare
          value={to}
          onChoose={chooseRouteTo}
          name="route-to"
          label="Destino de la ruta"
          placeholder="¿A dónde vas?"
          locate={false}
          icon={<MapPin aria-hidden className="size-4.5 shrink-0 text-high" />}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Intercambiar origen y destino"
        disabled={!from && !to}
        onClick={swapRoute}
      >
        <ArrowUpDown aria-hidden className="size-4.5" />
      </Button>
    </div>
  )
}
