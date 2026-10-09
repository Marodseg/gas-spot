import { useId, type ReactNode } from 'react'
import type { HistorySeriesPoint } from '../../types/domain'
import { formatPrice, formatPriceDelta } from '../../utils/format'

interface PriceChartProps {
  points: HistorySeriesPoint[]
  label: string
  /** Rendered when the period has no prices. */
  empty: ReactNode
}

const WIDTH = 320
const HEIGHT = 140
const PAD_X = 6
const PAD_Y = 14

const dayFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export function PriceChart({ points, label, empty }: PriceChartProps) {
  const gradientId = `price-area${useId().replace(/[^\w-]/g, '')}`
  const priced = points.flatMap((point) => (point.price === null ? [] : [{ ...point, price: point.price }]))
  const first = priced[0]
  const last = priced[priced.length - 1]
  if (!first || !last) return <>{empty}</>

  const min = Math.min(...priced.map((point) => point.price))
  const max = Math.max(...priced.map((point) => point.price))
  const span = Math.max(0.01, max - min)
  const coordinates = points.flatMap((point, index) => {
    if (point.price === null) return []
    const x = PAD_X + (index / Math.max(1, points.length - 1)) * (WIDTH - PAD_X * 2)
    const y = PAD_Y + (1 - (point.price - min) / span) * (HEIGHT - PAD_Y * 2)
    return [{ x, y }]
  })
  const line = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const head = coordinates[0]
  const tail = coordinates[coordinates.length - 1]
  const area = head && tail ? `${line} L${tail.x.toFixed(1)} ${HEIGHT} L${head.x.toFixed(1)} ${HEIGHT} Z` : ''
  const change = last.price - first.price

  return (
    <figure>
      <figcaption className="mb-2 flex items-baseline justify-between gap-3 text-body-sm">
        <span className="text-muted">
          {Math.abs(change) < 0.0005 ? 'Sin cambios en el periodo' : `${formatPriceDelta(change)} que al inicio`}
        </span>
        <span className="tabular text-caption text-subtle">
          {formatPrice(min)} – {formatPrice(max)}
        </span>
      </figcaption>
      <svg
        role="img"
        aria-label={`Evolución del precio de ${label}: de ${formatPrice(first.price)} a ${formatPrice(last.price)}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible text-accent"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={WIDTH} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} stroke="var(--line)" />
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {tail ? <circle cx={tail.x} cy={tail.y} r="3.5" className="fill-accent" stroke="var(--surface)" strokeWidth="2" /> : null}
      </svg>
      <div className="tabular mt-1 flex justify-between text-caption text-subtle">
        <span>{dayFormat.format(new Date(`${points[0]?.date ?? first.date}T00:00:00Z`))}</span>
        <span>Hoy · {formatPrice(last.price)}</span>
      </div>
      {/* A table ignores the 1px box of sr-only and would stretch the scroll area; the wrapper clips it. */}
      <div className="sr-only">
        <table>
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
    </figure>
  )
}
