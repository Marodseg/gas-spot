import { CircleAlert, Fuel, GitCompareArrows, LocateFixed, MapPin, MapPinOff, Route, Search, SearchX, Settings, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, type RefObject } from 'react'
import { Button } from '../../components/ui/Button'
import { Price } from '../../components/ui/Price'
import { StateMessage } from '../../components/ui/StateMessage'
import { findFuel } from '../../config/fuels'
import { formatDistance } from '../../utils/format'
import type { VisibleStations } from '../../hooks/useVisibleStations'
import { usePreferences } from '../../stores/preferences'
import { useSession } from '../../stores/session'
import { chooseRouteFrom, requestLocation, switchMode } from '../search/choose-place'
import { RoutePicker } from '../route/RoutePicker'
import { CORRIDOR_KM } from '../../api/precioil/corridor'
import { FilterBar } from '../stations/FilterBar'
import { StationCard, StationCardSkeleton } from '../stations/StationCard'
import { StationDetail } from '../stations/StationDetail'
import { SettingsPanel } from '../settings/SettingsPanel'
import { FuelPicker } from '../fuel-selector/FuelPicker'
import { selectFuel } from '../fuel-selector/select-fuel'

const ComparePanel = lazy(() => import('../comparison/ComparePanel').then((module) => ({ default: module.ComparePanel })))

const RADIUS_STEPS = [2, 5, 10, 20, 30]

/** Fuel chips bound to the preferences store. */
export function FuelSelector({ visible, floating = false }: { visible: VisibleStations; floating?: boolean }) {
  const fuelId = usePreferences((state) => state.fuelId)
  return (
    <FuelPicker
      selectedId={fuelId}
      availableIds={visible.availableFuelIds}
      floating={floating}
      onSelect={(fuel) => selectFuel(fuel.id)}
    />
  )
}

export function SettingsButton({ floating = false }: { floating?: boolean }) {
  return (
    <Button
      variant={floating ? 'secondary' : 'ghost'}
      size="icon"
      className={floating ? 'border-transparent shadow-md' : ''}
      aria-label="Ajustes"
      onClick={() => {
        useSession.getState().setPanel('settings')
        useSession.getState().setSheet('full')
      }}
    >
      <Settings aria-hidden className="size-5" />
    </Button>
  )
}

/** "Gasóleo A · 18 gasolineras · desde 1,749 €/L" — what the list shows, at a glance. */
export function ResultsSummary({ visible }: { visible: VisibleStations }) {
  const origin = useSession((state) => state.origin)
  const status = useSession((state) => state.status)
  const fuelId = usePreferences((state) => state.fuelId)
  const radiusKm = usePreferences((state) => state.radiusKm)
  const mode = usePreferences((state) => state.mode)
  const route = useSession((state) => state.routes[state.routeIndex] ?? null)
  const progress = useSession((state) => state.corridorProgress)
  const fuel = findFuel(fuelId)
  const cheapest = visible.ranked.reduce<number | null>((min, item) => (min === null || item.price < min ? item.price : min), null)
  const count = visible.ranked.length
  const alongRoute = mode === 'route'

  // Without a place (or a route) or with a failed load the body already explains the state.
  if (!origin || status === 'error' || (alongRoute && !route)) return null
  const counted = `${count} ${count === 1 ? 'gasolinera' : 'gasolineras'}${alongRoute ? ' en el camino' : ''}`
  return (
    <div className="flex items-end justify-between gap-3" aria-live="polite">
      <div className="min-w-0 flex-1">
        <p className="truncate text-caption font-semibold tracking-wide text-muted uppercase">
          {fuel.label} · {alongRoute && route ? `Ruta de ${formatDistance(route.distanceKm)}` : `${radiusKm} km`}
        </p>
        <p className="text-title font-semibold">
          {status === 'loading' && count === 0
            ? alongRoute && progress
              ? `Buscando en la ruta · ${progress.done}/${progress.total}`
              : 'Buscando gasolineras…'
            : counted}
        </p>
        {alongRoute && progress ? (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      {cheapest !== null ? (
        <p className="shrink-0 text-right text-body-sm text-muted">
          desde <Price value={cheapest} size="md" className="text-cheap" />
        </p>
      ) : null}
    </div>
  )
}

interface PanelContentProps {
  visible: VisibleStations
  scrollRef: RefObject<HTMLDivElement | null>
}

/** Body of the results panel: list, detail, comparison or settings. */
export function PanelContent({ visible, scrollRef }: PanelContentProps) {
  const panel = useSession((state) => state.panel)
  const selectedId = useSession((state) => state.selectedId)
  const compareIds = useSession((state) => state.compareIds)
  const stations = useSession((state) => state.stations)
  const provinceAverage = useSession((state) => state.provinceAverage)
  const provinceName = useSession((state) => state.provinceName)
  const fuelId = usePreferences((state) => state.fuelId)
  const selected = stations.find((station) => station.id === selectedId) ?? null

  // Detail and other panels open at the top; going back to the list brings the active card into view.
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    if (panel !== 'browse') {
      scroller.scrollTop = 0
      return
    }
    if (selectedId === null) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    document.getElementById(`station-${selectedId}`)?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [panel, selectedId, scrollRef])

  const back = useCallback(() => useSession.getState().setPanel('browse'), [])

  // Escape closes detail, comparison and settings, unless it is closing a field's own popup.
  useEffect(() => {
    if (panel === 'browse') return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea')) return
      back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, back])

  if (panel === 'settings') return <SettingsPanel onClose={back} />
  if (panel === 'detail' && selected) {
    return (
      <StationDetail
        key={selected.id}
        station={selected}
        item={visible.ranked.find((item) => item.station.id === selected.id) ?? null}
        fuelId={fuelId}
        liters={visible.assumptions.liters}
        average={provinceAverage}
        provinceName={provinceName}
        now={visible.now}
        compared={compareIds.includes(selected.id)}
        onBack={back}
        onCompare={() => useSession.getState().toggleCompare(selected.id)}
      />
    )
  }
  if (panel === 'compare') {
    return (
      <Suspense fallback={<ListSkeleton count={2} />}>
        <ComparePanel
          items={visible.ranked.filter((item) => compareIds.includes(item.station.id))}
          liters={visible.assumptions.liters}
          onClose={back}
          onOpen={(id) => useSession.getState().selectStation(id)}
          onRemove={(id) => useSession.getState().toggleCompare(id)}
        />
      </Suspense>
    )
  }
  return <Browse visible={visible} />
}

function Browse({ visible }: { visible: VisibleStations }) {
  const origin = useSession((state) => state.origin)
  const status = useSession((state) => state.status)
  const error = useSession((state) => state.error)
  const selectedId = useSession((state) => state.selectedId)
  const compareIds = useSession((state) => state.compareIds)
  const stationCount = useSession((state) => state.stations.length)
  const locating = useSession((state) => state.locating)
  const locateError = useSession((state) => state.locateError)
  const fuelId = usePreferences((state) => state.fuelId)
  const radiusKm = usePreferences((state) => state.radiusKm)
  const fuel = findFuel(fuelId)
  const select = useCallback((id: number) => useSession.getState().selectStation(id), [])
  const loading = status === 'loading'
  const mode = usePreferences((state) => state.mode)
  const routeTo = usePreferences((state) => state.routeTo)
  const routeStatus = useSession((state) => state.routeStatus)
  const routeError = useSession((state) => state.routeError)
  const routeCount = useSession((state) => state.routes.length)
  const corridorGaps = useSession((state) => state.corridorGaps)
  const alongRoute = mode === 'route'

  if (alongRoute && (!origin || !routeTo)) {
    return (
      <StateMessage
        icon={Route}
        title="Planifica tu ruta"
        description="Elige origen y destino y te enseñamos dónde repostar por el camino."
      >
        {origin ? null : (
          <Button loading={locating} onClick={() => void requestLocation(chooseRouteFrom)}>
            {locating ? null : <LocateFixed aria-hidden className="size-4" />}
            Salir desde mi ubicación
          </Button>
        )}
        <Button variant={origin ? 'primary' : 'secondary'} onClick={() => focusSearch(origin ? 'route-to' : 'route-from')}>
          <Search aria-hidden className="size-4" />
          {origin ? 'Elegir destino' : 'Elegir origen'}
        </Button>
      </StateMessage>
    )
  }
  if (alongRoute && routeStatus === 'error' && routeError) {
    return (
      <StateMessage
        icon={CircleAlert}
        tone="error"
        title={routeError.title}
        description={routeError.message}
        detail={routeError.detail}
      >
        {routeError.code === 'rate_limit' ? null : (
          <Button variant="secondary" onClick={() => useSession.getState().retry()}>
            Reintentar
          </Button>
        )}
        <Button variant={routeError.code === 'rate_limit' ? 'primary' : 'ghost'} onClick={() => switchMode('nearby')}>
          Buscar cerca
        </Button>
      </StateMessage>
    )
  }
  if (alongRoute && routeStatus === 'loading') return <ListSkeleton count={4} />

  if (!origin) {
    return locateError ? (
      <StateMessage icon={MapPinOff} title={locateError.title} description={locateError.message}>
        <Button onClick={() => focusSearch()}>
          <Search aria-hidden className="size-4" />
          Buscar un lugar
        </Button>
        <Button variant="secondary" loading={locating} onClick={() => void requestLocation()}>
          Reintentar
        </Button>
      </StateMessage>
    ) : (
      <StateMessage
        icon={MapPin}
        title="Encuentra dónde repostar"
        description="Te enseñamos las gasolineras cercanas, su precio y cuál compensa más."
      >
        <Button loading={locating} onClick={() => void requestLocation()}>
          {locating ? null : <LocateFixed aria-hidden className="size-4" />}
          {locating ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
        </Button>
        <Button variant="secondary" onClick={() => focusSearch()}>
          Buscar un lugar
        </Button>
      </StateMessage>
    )
  }

  const nextRadius = RADIUS_STEPS.find((radius) => radius > radiusKm)
  const otherFuel = [...visible.availableFuelIds].find((id) => id !== fuelId)

  return (
    <div id="resultados" className="space-y-3">
      {locateError ? (
        <div role="alert" className="flex items-start gap-3 rounded-md bg-raised p-3 text-body-sm">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          <p className="flex-1">
            <span className="font-semibold">{locateError.title}.</span> <span className="text-muted">{locateError.message}</span>
          </p>
          <button
            type="button"
            aria-label="Cerrar aviso"
            className="-m-1 grid size-8 place-items-center rounded-full text-muted hover:bg-ink/6"
            onClick={() => useSession.getState().setLocating(false)}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}

      {alongRoute && corridorGaps > 0 && !loading ? (
        <div role="status" className="flex items-start gap-3 rounded-md bg-raised p-3 text-body-sm">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          <p className="flex-1 text-muted">
            Algunos tramos de la ruta no se han podido consultar. Puede faltar alguna gasolinera.
          </p>
          <button
            type="button"
            className="-my-1 shrink-0 rounded-full px-2 py-1 font-semibold text-accent hover:bg-accent-soft"
            onClick={() => useSession.getState().retry()}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {compareIds.length > 0 ? (
        <Button variant="secondary" size="sm" className="w-full" onClick={() => useSession.getState().setPanel('compare')}>
          <GitCompareArrows aria-hidden className="size-4" />
          Comparar {compareIds.length} {compareIds.length === 1 ? 'gasolinera' : 'gasolineras'}
        </Button>
      ) : null}

      {status === 'error' && error ? (
        <StateMessage icon={CircleAlert} tone="error" title={error.title} description={error.message} detail={error.detail}>
          <Button variant="secondary" onClick={() => useSession.getState().retry()}>
            Reintentar
          </Button>
        </StateMessage>
      ) : null}

      {loading && visible.ranked.length === 0 ? <ListSkeleton count={5} /> : null}

      {alongRoute && !loading && status !== 'error' && stationCount === 0 ? (
        <StateMessage
          icon={MapPinOff}
          title="Sin gasolineras en el camino"
          description={`No hay gasolineras a menos de ${CORRIDOR_KM} km de esta ruta.`}
        >
          {routeCount > 1 ? (
            <Button
              variant="secondary"
              onClick={() => {
                const { routeIndex } = useSession.getState()
                useSession.getState().selectRoute((routeIndex + 1) % routeCount)
              }}
            >
              Probar otra ruta
            </Button>
          ) : null}
        </StateMessage>
      ) : null}

      {!alongRoute && !loading && status !== 'error' && stationCount === 0 ? (
        <StateMessage
          icon={MapPinOff}
          title={`Sin gasolineras a ${radiusKm} km`}
          description={nextRadius ? 'Amplía la distancia o busca otra zona.' : 'Prueba a buscar otra zona.'}
        >
          {nextRadius ? (
            <Button variant="secondary" onClick={() => usePreferences.getState().setRadiusKm(nextRadius)}>
              Ampliar a {nextRadius} km
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => focusSearch()}>
              Buscar otra zona
            </Button>
          )}
        </StateMessage>
      ) : null}

      {!loading && stationCount > 0 && visible.withFuelCount === 0 ? (
        <StateMessage
          icon={Fuel}
          title={`Nadie vende ${fuel.label} ${alongRoute ? 'en el camino' : 'aquí'}`}
          description={alongRoute ? 'Prueba con otro combustible.' : 'Cambia de combustible o amplía la distancia.'}
        >
          {otherFuel !== undefined ? (
            <Button variant="secondary" onClick={() => selectFuel(otherFuel)}>
              Ver {findFuel(otherFuel).label}
            </Button>
          ) : null}
          {nextRadius && !alongRoute ? (
            <Button variant="secondary" onClick={() => usePreferences.getState().setRadiusKm(nextRadius)}>
              Ampliar a {nextRadius} km
            </Button>
          ) : null}
        </StateMessage>
      ) : null}

      {!loading && visible.withFuelCount > 0 && visible.ranked.length === 0 ? (
        <StateMessage icon={SearchX} title="Ningún resultado con estos filtros" description="Quita algún filtro para ver más gasolineras.">
          <Button variant="secondary" onClick={() => usePreferences.getState().clearFilters()}>
            Quitar filtros
          </Button>
        </StateMessage>
      ) : null}

      {visible.ranked.length > 0 ? (
        <ol
          aria-label="Gasolineras"
          aria-busy={loading}
          className={`space-y-3 transition-opacity duration-200 ${loading ? 'opacity-60' : ''}`}
        >
          {visible.ranked.map((item) => (
            <li key={item.station.id}>
              <StationCard
                item={item}
                selected={item.station.id === selectedId}
                bestReason={item.isBest ? (visible.recommendation?.short ?? null) : null}
                now={visible.now}
                onSelect={select}
              />
            </li>
          ))}
        </ol>
      ) : null}

      {visible.ranked.length > 0 && visible.recommendation?.estimate ? (
        <p className="px-1 pt-1 text-caption text-subtle">
          Recomendación estimada con {visible.assumptions.liters} L y el coste del desvío. Puedes ajustarlo en Ajustes.
        </p>
      ) : null}
    </div>
  )
}

/** Filters row, shown only while browsing the list. */
export function BrowseControls({ visible }: { visible: VisibleStations }) {
  const origin = useSession((state) => state.origin)
  const mode = usePreferences((state) => state.mode)
  const hasRoute = useSession((state) => state.routes.length > 0)
  if (!origin || (mode === 'route' && !hasRoute)) return null
  return (
    <>
      {mode === 'route' ? <RoutePicker /> : null}
      <FilterBar brands={visible.brands} activeFilters={visible.activeFilters} alongRoute={mode === 'route'} />
    </>
  )
}

function ListSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando gasolineras">
      {Array.from({ length: count }, (_, index) => (
        <StationCardSkeleton key={index} />
      ))}
    </div>
  )
}

function focusSearch(name?: string) {
  if (useSession.getState().sheet === 'full') useSession.getState().setSheet('half')
  const selector = name ? `input[name="${name}"]` : 'input[role="combobox"]'
  document.querySelector<HTMLInputElement>(selector)?.focus()
}
