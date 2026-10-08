import type { HistorySeriesPoint } from '../../types/domain'
import { formatPrice } from '../../utils/format'

interface PriceChartProps {
  points: HistorySeriesPoint[]
  label: string
}

export function PriceChart({ points, label }: PriceChartProps) {
  const priced = points.flatMap((point) => (point.price === null ? [] : [{ ...point, price: point.price }]))
  if (priced.length === 0) {
    return <p className="text-sm text-muted">No hay precios registrados en este periodo.</p>
  }
  const min = Math.min(...priced.map((point) => point.price))
  const max = Math.max(...priced.map((point) => point.price))
  const span = Math.max(0.01, max - min)
  const width = 320
  const height = 148
  const pad = 18
  const coordinates = points.flatMap((point, index) => {
    if (point.price === null) return []
    const x = pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (point.price - min) / span) * (height - pad * 2)
    return [{ x, y }]
  })
  const path = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
  const last = coordinates[coordinates.length - 1]

  return (
    <div>
      <svg role="img" aria-label={`Evolución del precio de ${label}`} viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent" />
        {last ? <circle cx={last.x} cy={last.y} r="4" className="fill-accent" /> : null}
      </svg>
      <div className="flex justify-between text-xs text-muted tabular-nums">
        <span>Mín. {formatPrice(min)}</span>
        <span>Máx. {formatPrice(max)}</span>
      </div>
      <table className="sr-only">
        <caption>Precios diarios de {label}</caption>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Precio</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{point.price === null ? 'Sin dato' : formatPrice(point.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
