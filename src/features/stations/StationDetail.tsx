import { Navigation } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getStation } from '../../api/precioil/stations'
import { FUELS, findFuel } from '../../config/fuels'
import { analytics } from '../../services/analytics'
import { useSession } from '../../stores/session'
import type { Station } from '../../types/domain'
import { formatDateTime, formatRelativeTime } from '../../utils/datetime'
import { formatDistance, formatMoney, formatPricePerLiter } from '../../utils/format'
import { openDirections } from '../../utils/navigation'
import { openingLabel, openingStatus } from '../../utils/opening-hours'
import type { StationCost } from '../../utils/best-station'
import { Button } from '../../components/ui/Button'

interface StationDetailProps {
  station: Station
  fuelId: number
  cost: StationCost | null
  onBack: () => void
  onHistory: () => void
  onCompare: () => void
  compared: boolean
}

export function StationDetail({ station, fuelId, cost, onBack, onHistory, onCompare, compared }: StationDetailProps) {
  const origin = useSession((state) => state.origin)
  const [fresh, setFresh] = useState<Station | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const fuel = findFuel(fuelId)

  useEffect(() => {
    if (!origin) return undefined
    const controller = new AbortController()
    void getStation(station.id, origin, controller.signal)
      .then((next) => {
        setFresh(next)
        setDetailError(next ? null : 'No hemos podido actualizar la ficha.')
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetailError('Mostramos los datos de la lista. La ficha no se ha podido actualizar.')
      })
    return () => controller.abort()
  }, [station.id, origin])

  const current = fresh ? { ...fresh, distanceKm: station.distanceKm } : station
  const selectedPrice = current.prices[fuel.field]
  const updated = current.updatedAt ? formatRelativeTime(current.updatedAt) : null
  const updatedExact = current.updatedAt ? formatDateTime(current.updatedAt) : null

  return (
    <div className="space-y-4">
      <button type="button" className="text-sm font-semibold text-accent" onClick={onBack}>
        Volver al listado
      </button>
      <header>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{current.brand}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{current.name}</h2>
      </header>
      <section className="rounded-3xl bg-bg p-4" aria-label="Precio oficial">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Precio oficial · {fuel.label}</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
          {selectedPrice !== undefined ? formatPricePerLiter(selectedPrice) : 'No disponible'}
        </p>
        <p className="mt-2 text-sm text-muted">{formatDistance(current.distanceKm)}</p>
      </section>
      {cost?.fuelCostEur !== null && cost?.fuelCostEur !== undefined ? (
        <section className="rounded-3xl border border-dashed border-line p-4" aria-label="Estimación de ahorro">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Estimación, no es un dato oficial</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted">Combustible</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(cost.fuelCostEur)}</dd>
            </div>
            <div>
              <dt className="text-muted">Desvío estimado</dt>
              <dd className="font-semibold tabular-nums">{cost.travelCostEur === null ? '—' : formatMoney(cost.travelCostEur)}</dd>
            </div>
            <div>
              <dt className="text-muted">Coste neto</dt>
              <dd className="font-semibold tabular-nums">{cost.netCostEur === null ? '—' : formatMoney(cost.netCostEur)}</dd>
            </div>
            <div>
              <dt className="text-muted">Frente a la cercana</dt>
              <dd className="font-semibold tabular-nums">
                {cost.netSavingVsBaselineEur === null ? '—' : formatMoney(cost.netSavingVsBaselineEur)}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted">Dirección</dt>
          <dd>
            {current.address}
            {current.postalCode ? `, ${current.postalCode}` : ''}
            {current.locality ? ` · ${current.locality}` : ''}
            {current.province ? ` · ${current.province}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Coordenadas</dt>
          <dd className="tabular-nums">
            {current.latitude.toFixed(5)}, {current.longitude.toFixed(5)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Horario</dt>
          <dd>
            {current.schedule ?? 'No informado'} · {openingLabel(openingStatus(current.schedule))}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Actualización</dt>
          <dd>{updated ? `Actualizado ${updated}` : 'Sin fecha de actualización'}{updatedExact ? ` (${updatedExact})` : ''}</dd>
        </div>
        {marginLabel(current.margin) ? (
          <div>
            <dt className="text-muted">Vía</dt>
            <dd>{marginLabel(current.margin)}</dd>
          </div>
        ) : null}
        {current.saleType === 'restricted' ? (
          <div>
            <dt className="text-muted">Venta</dt>
            <dd>Restringida</dd>
          </div>
        ) : null}
        {current.services ? (
          <div>
            <dt className="text-muted">Servicios</dt>
            <dd>{current.services}</dd>
          </div>
        ) : null}
      </dl>
      <section>
        <h3 className="text-sm font-semibold">Todos los combustibles</h3>
        <ul className="mt-2 divide-y divide-line">
          {FUELS.map((item) => {
            const price = current.prices[item.field]
            if (price === undefined) return null
            const highlighted = item.id === fuelId
            return (
              <li key={item.id} className={`flex items-center justify-between py-2 text-sm ${highlighted ? 'font-semibold' : ''}`}>
                <span>{item.label}</span>
                <span className="tabular-nums">{formatPricePerLiter(price)}</span>
              </li>
            )
          })}
        </ul>
      </section>
      {detailError ? <p className="text-sm text-muted">{detailError}</p> : null}
      <div className="grid gap-2">
        <Button
          onClick={() => {
            analytics.track('directions_open', { stationId: current.id })
            openDirections(current.latitude, current.longitude)
          }}
        >
          <Navigation aria-hidden className="size-4" />
          Cómo llegar
        </Button>
        <Button variant="secondary" onClick={onHistory}>
          Ver histórico
        </Button>
        <Button variant="ghost" aria-pressed={compared} onClick={onCompare}>
          {compared ? 'Quitar de la comparación' : 'Añadir a la comparación'}
        </Button>
      </div>
    </div>
  )
}

function marginLabel(margin: Station['margin']): string | null {
  switch (margin) {
    case 'right':
      return 'Margen derecho'
    case 'left':
      return 'Margen izquierdo'
    case 'none':
    case 'unknown':
      return null
    default: {
      const unreachable: never = margin
      return unreachable
    }
  }
}
