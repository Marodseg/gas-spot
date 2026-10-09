import { ChevronLeft, Clock, GitCompareArrows, Info, MapPin, Navigation, Route, Store } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { getStation } from '../../api/precioil/stations'
import { BandBadge } from '../../components/ui/BandBadge'
import { Button } from '../../components/ui/Button'
import { Price } from '../../components/ui/Price'
import { FUELS, findFuel } from '../../config/fuels'
import { analytics } from '../../services/analytics'
import { useSession } from '../../stores/session'
import { selectFuel } from '../fuel-selector/select-fuel'
import type { ProvinceAverage, Station } from '../../types/domain'
import { describeUpdate, formatDateTime } from '../../utils/datetime'
import { formatDistance, formatMoney, formatPriceDelta, formatPricePerLiter } from '../../utils/format'
import { openDirections } from '../../utils/navigation'
import { openingLabel, openingStatus } from '../../utils/opening-hours'
import type { RankedStation } from '../../utils/ranking'

const HistorySection = lazy(() => import('../history/HistorySection').then((module) => ({ default: module.HistorySection })))

interface StationDetailProps {
  station: Station
  item: RankedStation | null
  fuelId: number
  liters: number
  average: ProvinceAverage | null
  provinceName: string | null
  now: Date
  compared: boolean
  onBack: () => void
  onCompare: () => void
}

export function StationDetail({
  station,
  item,
  fuelId,
  liters,
  average,
  provinceName,
  now,
  compared,
  onBack,
  onCompare,
}: StationDetailProps) {
  const origin = useSession((state) => state.origin)
  const [fresh, setFresh] = useState<Station | null>(null)
  const [detailFailed, setDetailFailed] = useState(false)
  const fuel = findFuel(fuelId)

  useEffect(() => {
    if (!origin) return undefined
    const controller = new AbortController()
    void getStation(station.id, origin, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return
        setFresh(next)
        setDetailFailed(next === null)
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetailFailed(true)
      })
    return () => controller.abort()
  }, [station.id, origin])

  const current = fresh?.id === station.id ? { ...fresh, distanceKm: station.distanceKm } : station
  const selectedPrice = current.prices[fuel.field]
  const update = describeUpdate(current.updatedAt, now)
  const updatedExact = current.updatedAt ? formatDateTime(current.updatedAt) : null
  const showName = current.name.localeCompare(current.brand, 'es', { sensitivity: 'base' }) !== 0
  const delta = average && selectedPrice !== undefined ? selectedPrice - average.price : null
  const cost = item?.cost ?? null
  const place = [current.locality || current.municipality, current.province].filter(Boolean)
  const uniquePlace = place.filter((value, index) => place.indexOf(value) === index).join(', ')

  return (
    <article className="animate-fade-up" aria-labelledby="station-detail-title">
      <header className="flex items-start gap-2">
        <Button variant="ghost" size="icon" className="-ml-2" aria-label="Volver al listado" onClick={onBack}>
          <ChevronLeft aria-hidden className="size-5" />
        </Button>
        <div className="min-w-0 flex-1 pt-1.5">
          <h2 id="station-detail-title" className="truncate text-heading font-semibold tracking-tight">
            {current.brand}
          </h2>
          {showName ? <p className="truncate text-body-sm text-muted">{current.name}</p> : null}
        </div>
      </header>

      <section className="mt-4" aria-label="Precio">
        <p className="text-body-sm font-medium text-muted">{fuel.label}</p>
        <div className="mt-0.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          {selectedPrice !== undefined ? (
            <Price value={selectedPrice} size="xl" className={update?.freshness === 'stale' ? 'opacity-70' : ''} />
          ) : (
            <p className="text-heading font-semibold text-muted">No disponible</p>
          )}
          {item ? <BandBadge band={item.band} label={item.bandLabel} /> : null}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-body-sm text-muted">
          <span className="tabular font-semibold text-ink">{formatDistance(current.distanceKm)}</span>
          {uniquePlace ? <span>· {uniquePlace}</span> : null}
        </p>
        <p
          className={`mt-1 flex items-center gap-1.5 text-caption ${update?.freshness === 'stale' ? 'font-semibold text-mid' : 'text-muted'}`}
          title={updatedExact ?? undefined}
        >
          <Clock aria-hidden className="size-3.5" />
          {update ? update.label : 'Sin fecha de actualización'}
        </p>
        {delta !== null && provinceName ? (
          <p className="mt-1 text-caption text-muted">
            {formatPriceDelta(delta)} que la media de {provinceName}
          </p>
        ) : null}
      </section>

      <div className="mt-5 flex gap-2">
        <Button
          size="lg"
          className="flex-1"
          onClick={() => {
            analytics.track('directions_open', { stationId: current.id, from: 'detail' })
            openDirections(current.latitude, current.longitude)
          }}
        >
          <Navigation aria-hidden className="size-4.5" />
          Cómo llegar
        </Button>
        <Button
          size="lg"
          variant="secondary"
          aria-pressed={compared}
          className={compared ? 'border-accent text-accent' : ''}
          onClick={onCompare}
        >
          <GitCompareArrows aria-hidden className="size-4.5" />
          {compared ? 'Comparando' : 'Comparar'}
        </Button>
      </div>

      {cost?.netCostEur !== null && cost?.netCostEur !== undefined ? (
        <section className="mt-5 rounded-md bg-raised p-4" aria-label="Estimación">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-body-sm text-muted">Llenar {liters} L te cuesta</p>
            <p className="tabular text-title font-semibold">{formatMoney(cost.netCostEur)}</p>
          </div>
          {cost.netSavingVsBaselineEur !== null && Math.abs(cost.netSavingVsBaselineEur) >= 0.01 ? (
            <p className={`mt-1 text-body-sm font-medium ${cost.netSavingVsBaselineEur > 0 ? 'text-cheap' : 'text-muted'}`}>
              {cost.netSavingVsBaselineEur > 0
                ? `Ahorras ${formatMoney(cost.netSavingVsBaselineEur)} frente a la más cercana`
                : `${formatMoney(-cost.netSavingVsBaselineEur)} más que la más cercana`}
            </p>
          ) : null}
          <p className="mt-2 text-caption text-subtle">
            Incluye {cost.travelCostEur === null ? 'el desvío' : `${formatMoney(cost.travelCostEur)} de desvío`}. Es una estimación.
          </p>
        </section>
      ) : null}

      <dl className="mt-5 divide-y divide-line border-y border-line">
        <InfoRow icon={<MapPin aria-hidden className="size-4" />} label="Dirección">
          {current.address}
          {current.postalCode ? `, ${current.postalCode}` : ''}
        </InfoRow>
        <InfoRow icon={<Clock aria-hidden className="size-4" />} label="Horario">
          <span className="font-medium">{openingLabel(openingStatus(current.schedule, now))}</span>
          {current.schedule ? <span className="text-muted"> · {current.schedule}</span> : null}
        </InfoRow>
        {marginLabel(current.margin) ? (
          <InfoRow icon={<Route aria-hidden className="size-4" />} label="Vía">
            {marginLabel(current.margin)}
          </InfoRow>
        ) : null}
        {current.services ? (
          <InfoRow icon={<Store aria-hidden className="size-4" />} label="Servicios">
            {current.services}
          </InfoRow>
        ) : null}
        {current.saleType === 'restricted' ? (
          <InfoRow icon={<Info aria-hidden className="size-4" />} label="Venta">
            Restringida a socios o flotas
          </InfoRow>
        ) : null}
      </dl>

      <section className="mt-6" aria-labelledby="other-fuels">
        <h3 id="other-fuels" className="text-title font-semibold">
          Precios en esta gasolinera
        </h3>
        <ul className="mt-2">
          {FUELS.map((entry) => {
            const price = current.prices[entry.field]
            if (price === undefined) return null
            const highlighted = entry.id === fuelId
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-current={highlighted || undefined}
                  className={`flex min-h-11 w-full items-center justify-between rounded-sm px-3 text-body transition-colors ${
                    highlighted ? 'bg-accent-soft font-semibold text-ink' : 'hover:bg-raised'
                  }`}
                  onClick={() => selectFuel(entry.id)}
                >
                  <span>{entry.label}</span>
                  <span className="tabular">{formatPricePerLiter(price)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <Suspense fallback={<HistoryFallback />}>
        <HistorySection station={current} fuelId={fuelId} />
      </Suspense>

      {detailFailed ? (
        <p className="mt-4 text-caption text-subtle">Mostramos los datos del listado. La ficha no se ha podido actualizar.</p>
      ) : null}
    </article>
  )
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="text-body">{children}</dd>
      </div>
    </div>
  )
}

function HistoryFallback() {
  return (
    <div className="mt-6" aria-hidden>
      <div className="skeleton h-5 w-40" />
      <div className="skeleton mt-4 h-36 w-full rounded-md" />
    </div>
  )
}

function marginLabel(margin: Station['margin']): string | null {
  switch (margin) {
    case 'right':
      return 'Margen derecho de la vía'
    case 'left':
      return 'Margen izquierdo de la vía'
    case 'none':
    case 'unknown':
      return null
    default: {
      const unreachable: never = margin
      return unreachable
    }
  }
}
