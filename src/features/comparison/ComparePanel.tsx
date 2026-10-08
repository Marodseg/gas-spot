import type { RankedStation } from '../../utils/ranking'
import { formatDistance, formatMoney, formatPricePerLiter } from '../../utils/format'
import { Button } from '../../components/ui/Button'

interface ComparePanelProps {
  items: RankedStation[]
  liters: number
  onClose: () => void
  onOpen: (id: number) => void
}

export function ComparePanel({ items, liters, onClose, onOpen }: ComparePanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Comparación</h2>
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <p className="text-sm text-muted">
        El ahorro de desplazamiento es una estimación con {liters} L. El precio por litro es el oficial.
      </p>
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.station.id} className="rounded-3xl border border-line bg-surface p-4">
            <button type="button" className="w-full text-left" onClick={() => onOpen(item.station.id)}>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{item.station.brand}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPricePerLiter(item.price)}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted">Distancia</dt>
                  <dd>{formatDistance(item.station.distanceKm)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Combustible</dt>
                  <dd className="tabular-nums">{item.cost?.fuelCostEur === null || item.cost?.fuelCostEur === undefined ? '—' : formatMoney(item.cost.fuelCostEur)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Desvío</dt>
                  <dd className="tabular-nums">{item.cost?.travelCostEur === null || item.cost?.travelCostEur === undefined ? '—' : formatMoney(item.cost.travelCostEur)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Ahorro neto</dt>
                  <dd className="tabular-nums">
                    {item.cost?.netSavingVsBaselineEur === null || item.cost?.netSavingVsBaselineEur === undefined
                      ? '—'
                      : formatMoney(item.cost.netSavingVsBaselineEur)}
                  </dd>
                </div>
              </dl>
            </button>
          </article>
        ))}
      </div>
      {items.length < 2 ? <p className="text-sm text-muted">Elige al menos dos gasolineras para compararlas.</p> : null}
    </div>
  )
}
