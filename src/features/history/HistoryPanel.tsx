import { useEffect, useState } from 'react'
import { getStationHistory } from '../../api/precioil/history'
import { isPrecioilError } from '../../api/precioil/errors'
import { findFuel } from '../../config/fuels'
import type { HistorySeriesPoint, Station } from '../../types/domain'
import { addDays, madridDateKey } from '../../utils/datetime'
import { messageFor } from '../../utils/messages'
import { buildDailySeries } from '../../utils/history-series'
import { Button } from '../../components/ui/Button'
import { PriceChart } from './PriceChart'

const PERIODS = [7, 30, 90] as const
type Period = (typeof PERIODS)[number]

interface HistoryPanelProps {
  station: Station
  fuelId: number
  onBack: () => void
}

export function HistoryPanel({ station, fuelId, onBack }: HistoryPanelProps) {
  const [period, setPeriod] = useState<Period>(7)
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
        const message = isPrecioilError(caught) ? messageFor(caught.code) : 'No hemos podido cargar el histórico.'
        setFailed({ key: requestKey, message })
      })
    return () => controller.abort()
  }, [fuel.id, period, requestKey, station.id])

  return (
    <div className="space-y-4">
      <button type="button" className="text-sm font-semibold text-accent" onClick={onBack}>
        Volver a la ficha
      </button>
      <header>
        <h2 className="text-xl font-semibold">Histórico · {fuel.label}</h2>
        <p className="text-sm text-muted">{station.brand}</p>
      </header>
      <div role="radiogroup" aria-label="Periodo" className="flex gap-2">
        {PERIODS.map((days) => (
          <button
            key={days}
            type="button"
            role="radio"
            aria-checked={period === days}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${period === days ? 'bg-ink text-bg' : 'border border-line'}`}
            onClick={() => setPeriod(days)}
          >
            {days} días
          </button>
        ))}
      </div>
      {points === null && !error ? <div className="h-40 animate-pulse rounded-3xl bg-line/70" /> : null}
      {error ? (
        <div className="space-y-3">
          <p className="text-sm">{error}</p>
          <Button variant="secondary" onClick={() => setAttempt((current) => current + 1)}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {points ? <PriceChart points={points} label={fuel.label} /> : null}
      <p className="text-xs text-muted">
        Cada punto es el último precio notificado ese día. No es una cotización financiera.
      </p>
    </div>
  )
}
