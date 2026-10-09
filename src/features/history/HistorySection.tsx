import { ChartNoAxesCombined, CircleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getStationHistory } from '../../api/precioil/history'
import { isPrecioilError } from '../../api/precioil/errors'
import { Button } from '../../components/ui/Button'
import { findFuel } from '../../config/fuels'
import type { HistorySeriesPoint, Station } from '../../types/domain'
import { addDays, madridDateKey } from '../../utils/datetime'
import { buildDailySeries } from '../../utils/history-series'
import { copyFor } from '../../utils/messages'
import { PriceChart } from './PriceChart'

const PERIODS = [7, 30, 90] as const
type Period = (typeof PERIODS)[number]

interface HistorySectionProps {
  station: Station
  fuelId: number
}

export function HistorySection({ station, fuelId }: HistorySectionProps) {
  const [period, setPeriod] = useState<Period>(30)
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; points: HistorySeriesPoint[] } | null>(null)
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null)
  const fuel = findFuel(fuelId)
  const requestKey = `${station.id}:${fuel.id}:${period}:${attempt}`
  const points = loaded?.key === requestKey ? loaded.points : null
  const error = failed?.key === requestKey ? failed.message : null

  useEffect(() => {
    const to = madridDateKey(new Date())
    const from = addDays(to, -(period - 1))
    const controller = new AbortController()
    void getStationHistory(station.id, fuel.id, from, to, controller.signal)
      .then((history) => {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, points: buildDailySeries(history, from, to) })
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        const message = isPrecioilError(caught) ? copyFor(caught.code).message : 'No hemos podido cargar el histórico.'
        setFailed({ key: requestKey, message })
      })
    return () => controller.abort()
  }, [fuel.id, period, requestKey, station.id])

  return (
    <section className="mt-6" aria-labelledby="history-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="history-title" className="text-title font-semibold">
          Evolución del precio
        </h3>
        <div role="radiogroup" aria-label="Periodo" className="flex rounded-full bg-raised p-0.5">
          {PERIODS.map((days) => (
            <button
              key={days}
              type="button"
              role="radio"
              aria-checked={period === days}
              aria-label={`${days} días`}
              className={`h-8 min-w-11 rounded-full px-2.5 text-caption font-semibold transition-colors duration-150 ${
                period === days ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
              onClick={() => setPeriod(days)}
            >
              {days} d
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 min-h-44">
        {points === null && !error ? <div className="skeleton h-44 w-full rounded-md" aria-label="Cargando histórico" /> : null}
        {error ? (
          <div role="alert" className="flex flex-col items-center gap-3 rounded-md bg-raised px-4 py-6 text-center">
            <CircleAlert aria-hidden className="size-5 text-muted" />
            <p className="text-body-sm text-muted">{error}</p>
            <Button size="sm" variant="secondary" onClick={() => setAttempt((current) => current + 1)}>
              Reintentar
            </Button>
          </div>
        ) : null}
        {points ? (
          <PriceChart
            points={points}
            label={fuel.label}
            empty={
              <div className="flex flex-col items-center gap-2 rounded-md bg-raised px-4 py-8 text-center">
                <ChartNoAxesCombined aria-hidden className="size-5 text-muted" />
                <p className="text-body-sm text-muted">Sin cambios registrados en {period} días.</p>
                {period < 90 ? (
                  <Button size="sm" variant="secondary" onClick={() => setPeriod(90)}>
                    Ver 90 días
                  </Button>
                ) : null}
              </div>
            }
          />
        ) : null}
      </div>
      <p className="mt-2 text-caption text-subtle">Último precio notificado cada día.</p>
    </section>
  )
}
