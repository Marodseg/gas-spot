import { ChevronLeft, GitCompareArrows, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Price } from '../../components/ui/Price'
import { StateMessage } from '../../components/ui/StateMessage'
import type { RankedStation } from '../../utils/ranking'
import { formatDistance, formatMoney } from '../../utils/format'

interface ComparePanelProps {
  items: RankedStation[]
  liters: number
  onClose: () => void
  onOpen: (id: number) => void
  onRemove: (id: number) => void
}

export function ComparePanel({ items, liters, onClose, onOpen, onRemove }: ComparePanelProps) {
  const cheapestNet = Math.min(...items.map((item) => item.cost?.netCostEur ?? Number.POSITIVE_INFINITY))

  return (
    <section className="animate-fade-up" aria-labelledby="compare-title">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="-ml-2" aria-label="Volver al listado" onClick={onClose}>
          <ChevronLeft aria-hidden className="size-5" />
        </Button>
        <h2 id="compare-title" className="text-heading font-semibold tracking-tight">
          Comparar
        </h2>
      </header>
      <p className="mt-1 text-body-sm text-muted">Coste estimado de llenar {liters} L, desvío incluido.</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const net = item.cost?.netCostEur ?? null
          const winner = net !== null && net === cheapestNet && items.length > 1
          return (
            <li
              key={item.station.id}
              className={`relative rounded-md border bg-surface ${winner ? 'border-accent/50' : 'border-line'}`}
            >
              <button type="button" className="w-full rounded-md p-4 pr-14 text-left" onClick={() => onOpen(item.station.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Price value={item.price} size="md" />
                    <p className="truncate text-body font-semibold">{item.station.brand}</p>
                    <p className="tabular text-body-sm text-muted">{formatDistance(item.station.distanceKm)}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-title font-semibold">{net === null ? '—' : formatMoney(net)}</p>
                    {winner ? <p className="text-caption font-semibold text-accent">La que menos cuesta</p> : null}
                  </div>
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3 text-muted"
                aria-label={`Quitar ${item.station.brand} de la comparación`}
                onClick={() => onRemove(item.station.id)}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </li>
          )
        })}
      </ul>
      {items.length < 2 ? (
        <StateMessage
          icon={GitCompareArrows}
          title="Añade otra gasolinera"
          description="Abre una gasolinera y pulsa Comparar. Puedes comparar hasta tres."
        >
          <Button variant="secondary" onClick={onClose}>
            Ver listado
          </Button>
        </StateMessage>
      ) : null}
    </section>
  )
}
