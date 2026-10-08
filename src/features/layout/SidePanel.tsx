import { Crosshair, LocateFixed, Settings } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { findFuel } from '../../config/fuels'
import type { VisibleStations } from '../../hooks/useVisibleStations'
import { locate } from '../../services/geolocation'
import { usePreferences } from '../../stores/preferences'
import { useSession } from '../../stores/session'
import type { AppError, ProvinceAverage } from '../../types/domain'
import { formatMoney } from '../../utils/format'
import { choosePlace } from '../search/choose-place'
import { PlaceSearch } from '../search/PlaceSearch'
import { SettingsPanel } from '../settings/SettingsPanel'
import { FilterBar } from '../stations/FilterBar'
import { StationCard } from '../stations/StationCard'
import { StationDetail } from '../stations/StationDetail'

const HistoryPanel = lazy(() => import('../history/HistoryPanel').then((module) => ({ default: module.HistoryPanel })))
const ComparePanel = lazy(() => import('../comparison/ComparePanel').then((module) => ({ default: module.ComparePanel })))

interface SidePanelProps {
  visible: VisibleStations
}

export function SidePanel({ visible }: SidePanelProps) {
  const origin = useSession((state) => state.origin)
  const status = useSession((state) => state.status)
  const error = useSession((state) => state.error)
  const panel = useSession((state) => state.panel)
  const selectedId = useSession((state) => state.selectedId)
  const compareIds = useSession((state) => state.compareIds)
  const provinceAverage = useSession((state) => state.provinceAverage)
  const provinceName = useSession((state) => state.provinceName)
  const stations = useSession((state) => state.stations)
  const fuelId = usePreferences((state) => state.fuelId)
  const radiusKm = usePreferences((state) => state.radiusKm)
  const selected = stations.find((station) => station.id === selectedId) ?? null
  const [locateMessage, setLocateMessage] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (selectedId === null || panel !== 'browse') return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    document.getElementById(`station-${selectedId}`)?.scrollIntoView({
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [selectedId, panel])

  async function requestLocation() {
    setLocating(true)
    setLocateMessage(null)
    try {
      choosePlace(await locate())
    } catch (caught) {
      const appError = isAppError(caught) ? caught : null
      setLocateMessage(appError?.message ?? 'No hemos podido obtener tu ubicación. Puedes buscar una ciudad manualmente.')
    } finally {
      setLocating(false)
    }
  }

  return (
    <section className="flex min-h-0 flex-col bg-bg" aria-label="Resultados">
      <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Reposta</p>
          <h1 className="text-lg font-semibold tracking-tight">Dónde repostar</h1>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Usar mi ubicación" disabled={locating} onClick={() => void requestLocation()}>
            <LocateFixed aria-hidden className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ajustes"
            onClick={() => useSession.getState().setPanel('settings')}
          >
            <Settings aria-hidden className="size-5" />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-6">
        {panel === 'settings' ? <SettingsPanel onClose={() => useSession.getState().setPanel('browse')} /> : null}
        {panel === 'detail' && selected ? (
          <StationDetail
            station={selected}
            fuelId={fuelId}
            cost={visible.ranked.find((item) => item.station.id === selected.id)?.cost ?? null}
            compared={compareIds.includes(selected.id)}
            onBack={() => useSession.getState().setPanel('browse')}
            onHistory={() => useSession.getState().setPanel('history')}
            onCompare={() => useSession.getState().toggleCompare(selected.id)}
          />
        ) : null}
        {panel === 'history' && selected ? (
          <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-line/70" />}>
            <HistoryPanel station={selected} fuelId={fuelId} onBack={() => useSession.getState().setPanel('detail')} />
          </Suspense>
        ) : null}
        {panel === 'compare' ? (
          <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-line/70" />}>
            <ComparePanel
              items={visible.ranked.filter((item) => compareIds.includes(item.station.id))}
              liters={visible.assumptions.liters}
              onClose={() => useSession.getState().setPanel('browse')}
              onOpen={(id) => useSession.getState().selectStation(id)}
            />
          </Suspense>
        ) : null}
        {panel === 'browse' ? (
          <Browse
            originLabel={origin?.label ?? null}
            status={status}
            error={error}
            locateMessage={locateMessage}
            locating={locating}
            stationCount={stations.length}
            fuelLabel={findFuel(fuelId).label}
            radiusKm={radiusKm}
            visible={visible}
            selectedId={selectedId}
            compareIds={compareIds}
            provinceAverage={provinceAverage}
            provinceName={provinceName}
            onLocate={() => void requestLocation()}
          />
        ) : null}
      </div>
    </section>
  )
}

function Browse({
  originLabel,
  status,
  error,
  locateMessage,
  locating,
  stationCount,
  fuelLabel,
  radiusKm,
  visible,
  selectedId,
  compareIds,
  provinceAverage,
  provinceName,
  onLocate,
}: {
  originLabel: string | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: AppError | null
  locateMessage: string | null
  locating: boolean
  stationCount: number
  fuelLabel: string
  radiusKm: number
  visible: VisibleStations
  selectedId: number | null
  compareIds: number[]
  provinceAverage: ProvinceAverage | null
  provinceName: string | null
  onLocate: () => void
}) {
  const best = visible.ranked.find((item) => item.isBest) ?? visible.ranked[0]
  return (
    <div className="space-y-3" id="resultados">
      {originLabel ? (
        <p className="text-sm text-muted">Cerca de {originLabel}</p>
      ) : (
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Encuentra dónde repostar mejor</h2>
          <p className="text-sm text-muted">
            Elige el combustible, mira precio y distancia, y quédate con la que de verdad compensa.
          </p>
        </div>
      )}
      <PlaceSearch />
      <Button className="w-full" disabled={locating} onClick={onLocate}>
        <Crosshair aria-hidden className="size-4" />
        {locating ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
      </Button>
      {locateMessage ? <p className="text-sm text-muted">{locateMessage}</p> : null}
      <FilterBar brands={visible.brands} />
      {visible.recommendation ? (
        <section className="rounded-3xl border border-line bg-surface p-4" aria-label="Recomendación">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">{visible.recommendation.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{visible.recommendation.body}</p>
          {visible.recommendation.estimate ? (
            <p className="mt-2 text-xs text-muted">Estimación con {visible.assumptions.liters} L. No es un precio oficial.</p>
          ) : null}
          {best?.cost?.netCostEur !== null && best?.cost?.netCostEur !== undefined ? (
            <p className="mt-2 text-sm font-semibold tabular-nums">Coste estimado {formatMoney(best.cost.netCostEur)}</p>
          ) : null}
        </section>
      ) : null}
      {compareIds.length > 0 ? (
        <Button variant="secondary" className="w-full" onClick={() => useSession.getState().setPanel('compare')}>
          Ver comparación ({compareIds.length})
        </Button>
      ) : null}
      {status === 'loading' && visible.ranked.length === 0 ? <StationSkeletons /> : null}
      {status === 'error' && error ? (
        <div className="rounded-3xl border border-line bg-surface p-4">
          <p className="text-sm">{error.message}</p>
          <Button className="mt-3" variant="secondary" onClick={() => useSession.getState().retry()}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {status !== 'loading' && originLabel && stationCount === 0 && status !== 'error' ? (
        <EmptyState
          title="No hemos encontrado gasolineras en esta zona."
          action={radiusKm < 30 ? `Ampliar a ${nextRadius(radiusKm)} km` : undefined}
          onAction={() => usePreferences.getState().setRadiusKm(nextRadius(radiusKm))}
        />
      ) : null}
      {status !== 'loading' && stationCount > 0 && visible.withFuelCount === 0 ? (
        <EmptyState title={`Ninguna gasolinera de esta zona publica ${fuelLabel}.`} />
      ) : null}
      {status !== 'loading' && visible.withFuelCount > 0 && visible.ranked.length === 0 ? (
        <EmptyState title="Los filtros dejan fuera todas las gasolineras." action="Quitar filtros" onAction={clearFilters} />
      ) : null}
      <div className="space-y-3" aria-live="polite">
        {visible.ranked.map((item) => (
          <StationCard
            key={item.station.id}
            item={item}
            selected={item.station.id === selectedId}
            compared={compareIds.includes(item.station.id)}
            average={provinceAverage}
            provinceName={provinceName}
            onSelect={(id) => useSession.getState().selectStation(id)}
            onCompare={(id) => useSession.getState().toggleCompare(id)}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-line p-4">
      <p className="text-sm">{title}</p>
      {action && onAction ? (
        <Button className="mt-3" variant="secondary" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </div>
  )
}

function StationSkeletons() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((item) => (
        <div key={item} className="motion-safe:animate-pulse rounded-3xl border border-line bg-surface p-4">
          <div className="h-3 w-20 rounded-full bg-line" />
          <div className="mt-4 h-8 w-32 rounded-full bg-line" />
          <div className="mt-3 h-3 w-40 rounded-full bg-line" />
          <div className="mt-2 h-3 w-full rounded-full bg-line" />
        </div>
      ))}
    </div>
  )
}

function nextRadius(current: number): number {
  if (current < 5) return 5
  if (current < 10) return 10
  if (current < 20) return 20
  return 30
}

function clearFilters() {
  usePreferences.getState().setBrand(null)
  usePreferences.getState().setMaxPrice(null)
  usePreferences.getState().setOpenNow(false)
}

function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error
}
