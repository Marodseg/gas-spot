import { BadgeCheck, Navigation } from 'lucide-react'
import { memo } from 'react'
import { BandBadge } from '../../components/ui/BandBadge'
import { Price } from '../../components/ui/Price'
import { describeUpdate } from '../../utils/datetime'
import { formatDetour, formatDistance } from '../../utils/format'
import { goToStation } from './directions'
import type { RankedStation } from '../../utils/ranking'

interface StationCardProps {
  item: RankedStation
  selected: boolean
  /** Why the recommended station is recommended, shown only on that card. */
  bestReason: string | null
  now: Date
  onSelect: (id: number) => void
}

export const StationCard = memo(function StationCard({ item, selected, bestReason, now, onSelect }: StationCardProps) {
  const { station } = item
  const update = describeUpdate(station.updatedAt, now)
  const stale = update?.freshness === 'stale'
  const place = station.locality || station.municipality

  return (
    <article
      id={`station-${station.id}`}
      aria-current={selected || undefined}
      className={`relative rounded-md border bg-surface transition-[border-color,box-shadow] duration-200 ${
        selected
          ? 'border-ink shadow-md'
          : item.isBest
            ? 'border-accent/40 shadow-sm hover:border-accent/70'
            : 'border-line shadow-sm hover:border-line-strong'
      }`}
    >
      <button
        type="button"
        className="w-full rounded-md p-4 text-left"
        onClick={() => onSelect(station.id)}
      >
        {item.isBest ? (
          <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-accent">
            <BadgeCheck aria-hidden className="size-4" />
            Recomendada
            {bestReason ? <span className="truncate font-medium text-muted">· {bestReason}</span> : null}
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Price value={item.price} className={stale ? 'opacity-70' : ''} />
            <p className="mt-0.5 truncate text-title font-semibold">{station.brand}</p>
          </div>
          {station.routeKm === undefined ? (
            <div className="shrink-0 pt-1 text-right">
              <p className="tabular text-title font-semibold">{formatDistance(station.distanceKm)}</p>
              {place ? <p className="max-w-32 truncate text-body-sm text-muted">{place}</p> : null}
            </div>
          ) : (
            <div className="shrink-0 pt-1 text-right">
              <p className="tabular text-title font-semibold">km {Math.round(station.routeKm)}</p>
              <p className="tabular text-body-sm text-muted">{formatDetour(station.distanceKm)}</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 pr-12">
          <BandBadge band={item.band} label={item.bandLabel} />
          <p className="text-caption text-muted">
            {item.openStatus === 'open' ? <span className="font-semibold text-cheap">Abierta</span> : null}
            {item.openStatus === 'closed' ? <span className="font-semibold text-high">Cerrada</span> : null}
            {item.openStatus !== 'unknown' && update ? ' · ' : null}
            {update ? <span className={stale ? 'font-semibold text-mid' : ''}>{update.label}</span> : null}
          </p>
        </div>
      </button>
      <button
        type="button"
        aria-label={`Cómo llegar a ${station.brand}`}
        title="Cómo llegar"
        className="absolute right-3 bottom-3 grid size-11 place-items-center rounded-full bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-accent-contrast"
        onClick={() => goToStation(station, 'card')}
      >
        <Navigation aria-hidden className="size-4.5" />
      </button>
    </article>
  )
})

export function StationCardSkeleton() {
  return (
    <div className="rounded-md border border-line bg-surface p-4" aria-hidden>
      <div className="flex items-start justify-between">
        <div>
          <div className="skeleton h-7 w-28" />
          <div className="skeleton mt-2 h-4 w-24" />
        </div>
        <div className="flex flex-col items-end pt-1">
          <div className="skeleton h-4 w-14" />
          <div className="skeleton mt-2 h-3 w-16" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="skeleton h-6 w-28 rounded-full" />
        <div className="skeleton h-3 w-32" />
      </div>
    </div>
  )
}
