import { Navigation } from 'lucide-react'
import type { ProvinceAverage } from '../../types/domain'
import type { RankedStation } from '../../utils/ranking'
import { formatDistance, formatPrice, formatSignedPrice } from '../../utils/format'
import { openingLabel } from '../../utils/opening-hours'
import { openDirections } from '../../utils/navigation'
import { analytics } from '../../services/analytics'

interface StationCardProps {
  item: RankedStation
  selected: boolean
  compared: boolean
  average: ProvinceAverage | null
  provinceName: string | null
  onSelect: (id: number) => void
  onCompare: (id: number) => void
}

export function StationCard({
  item,
  selected,
  compared,
  average,
  provinceName,
  onSelect,
  onCompare,
}: StationCardProps) {
  const { station } = item
  const title = station.brand || station.name
  const showName = station.name.localeCompare(title, 'es', { sensitivity: 'base' }) !== 0
  const delta = average ? item.price - average.price : null

  return (
    <article
      id={`station-${station.id}`}
      className={`rounded-3xl border bg-surface p-4 shadow-sm ${selected ? 'border-accent' : 'border-line'}`}
    >
      <button type="button" className="w-full text-left" onClick={() => onSelect(station.id)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{title}</p>
            {showName ? <p className="mt-1 text-sm">{station.name}</p> : null}
          </div>
          {item.isBest ? (
            <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">Mejor opción</span>
          ) : null}
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{formatPrice(item.price)}</p>
        <p className="mt-1 text-sm text-muted">
          <span className={bandClass(item.band)}>{item.bandLabel}</span>
          {delta !== null && provinceName ? (
            <span>
              {' '}
              · {formatSignedPrice(delta)} de la media de {provinceName}
            </span>
          ) : null}
        </p>
        <p className="mt-3 text-sm font-medium">{formatDistance(station.distanceKm)}</p>
        <p className="mt-1 text-sm text-muted">
          {station.address}
          {station.locality ? ` · ${station.locality}` : ''}
        </p>
        <p className="mt-1 text-xs text-muted">{openingLabel(item.openStatus)}</p>
      </button>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold text-accent-contrast"
          onClick={() => {
            analytics.track('directions_open', { stationId: station.id })
            openDirections(station.latitude, station.longitude)
          }}
        >
          <Navigation aria-hidden className="size-4" />
          Cómo llegar
        </button>
        <button
          type="button"
          aria-pressed={compared}
          className="min-h-11 rounded-full border border-line px-3 text-sm font-semibold"
          onClick={() => onCompare(station.id)}
        >
          {compared ? 'En la comparación' : 'Comparar'}
        </button>
      </div>
    </article>
  )
}

function bandClass(band: RankedStation['band']): string {
  switch (band) {
    case 'cheap':
      return 'text-cheap'
    case 'mid':
      return 'text-mid'
    case 'high':
      return 'text-high'
    case 'unknown':
      return 'text-muted'
    default: {
      const unreachable: never = band
      return unreachable
    }
  }
}
