import { Fuel, LoaderCircle, Search } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Button } from '../components/ui/Button'
import {
  BrowseControls,
  FuelSelector,
  PanelContent,
  ResultsSummary,
  SettingsButton,
} from '../features/layout/SidePanel'
import { choosePlace, requestLocation } from '../features/search/choose-place'
import { PlaceSearch } from '../features/search/PlaceSearch'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useNearbyStations } from '../hooks/useNearbyStations'
import { useTheme } from '../hooks/useTheme'
import { useVisibleStations } from '../hooks/useVisibleStations'
import { geolocationPermission } from '../services/geolocation'
import { usePreferences } from '../stores/preferences'
import { useSession, type SheetSnap } from '../stores/session'

const StationMap = lazy(() => import('../features/map/StationMap').then((module) => ({ default: module.StationMap })))

export function App() {
  const { dark } = useTheme()
  useNearbyStations()
  const desktop = useMediaQuery('(min-width: 768px)')
  const origin = useSession((state) => state.origin)
  const selectedId = useSession((state) => state.selectedId)
  const searchHere = useSession((state) => state.searchHere)
  const status = useSession((state) => state.status)
  const sheet = useSession((state) => state.sheet)
  const panel = useSession((state) => state.panel)
  const radiusKm = usePreferences((state) => state.radiusKm)
  const visible = useVisibleStations()
  const scrollRef = useRef<HTMLDivElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const [topBarHeight, setTopBarHeight] = useState(0)
  const [sheetHeight, setSheetHeight] = useState(0)

  const selectStation = useCallback((id: number) => useSession.getState().selectStation(id), [])
  const setSearchHere = useCallback(
    (point: { latitude: number; longitude: number } | null) => useSession.getState().setSearchHere(point),
    [],
  )
  const setSnap = useCallback((snap: SheetSnap) => useSession.getState().setSheet(snap), [])

  useEffect(() => {
    const saved = usePreferences.getState().lastPlace
    if (saved) useSession.getState().setOrigin(saved)
    // A saved search stays; a saved "Tu ubicación" may be stale, so refresh it when allowed.
    // Without permission the user decides, nothing is asked on load.
    if (saved && saved.source !== 'geolocation') return
    void geolocationPermission().then((state) => {
      if (state === 'granted') void requestLocation()
    })
  }, [])

  useEffect(() => {
    const bar = topBarRef.current
    if (!bar) return undefined
    const observer = new ResizeObserver(() => setTopBarHeight(bar.offsetHeight))
    observer.observe(bar)
    return () => observer.disconnect()
  }, [desktop])

  const insets = useMemo(
    () => (desktop ? { top: 0, bottom: 0 } : { top: topBarHeight, bottom: sheet === 'full' ? 0 : sheetHeight }),
    [desktop, topBarHeight, sheet, sheetHeight],
  )

  const map = (
    <Suspense fallback={<MapFallback />}>
      <StationMap
        origin={origin}
        stations={visible.ranked}
        selectedId={selectedId}
        radiusKm={radiusKm}
        dark={dark}
        insets={insets}
        insetsReady={desktop || (topBarHeight > 0 && sheetHeight > 0)}
        showZoom={desktop}
        onSelect={selectStation}
        onSearchHere={setSearchHere}
      />
    </Suspense>
  )

  const searchHereButton = searchHere ? (
    <Button
      variant="secondary"
      size="sm"
      className="animate-fade-up pointer-events-auto border-transparent shadow-md"
      onClick={() =>
        choosePlace({
          latitude: searchHere.latitude,
          longitude: searchHere.longitude,
          label: 'Zona del mapa',
          source: 'map',
        })
      }
    >
      <Search aria-hidden className="size-4" />
      Buscar en esta zona
    </Button>
  ) : null

  const loadingPill =
    status === 'loading' && visible.ranked.length > 0 ? (
      <span className="pointer-events-none inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3 text-body-sm font-medium text-muted shadow-md">
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        Actualizando
      </span>
    ) : null

  if (desktop) {
    return (
      <div className="flex h-dvh bg-bg text-ink">
        <SkipLink />
        <PageTitle />
        <main className="relative isolate min-w-0 flex-1" aria-label="Mapa">
          {map}
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center gap-2">
            {searchHereButton ?? loadingPill}
          </div>
        </main>
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-line bg-bg lg:w-[420px]" aria-label="Resultados">
          <div className="space-y-4 border-b border-line bg-surface px-5 pt-5 pb-4">
            <div className="flex items-center justify-between">
              <Logo />
              <SettingsButton />
            </div>
            <PlaceSearch />
            <FuelSelector visible={visible} />
            {panel === 'browse' ? (
              <>
                <ResultsSummary visible={visible} />
                <BrowseControls visible={visible} />
              </>
            ) : null}
          </div>
          <div ref={scrollRef} className="scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <PanelContent visible={visible} scrollRef={scrollRef} />
          </div>
        </aside>
      </div>
    )
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-bg text-ink">
      <SkipLink />
      <PageTitle />
      <main className="absolute inset-0 isolate" aria-label="Mapa">
        {map}
      </main>
      <div
        ref={topBarRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]"
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <PlaceSearch floating />
          </div>
          <SettingsButton floating />
        </div>
        <div className="pointer-events-auto">
          <FuelSelector visible={visible} floating />
        </div>
        <div className="flex justify-center">{searchHereButton ?? loadingPill}</div>
      </div>
      <BottomSheet
        label="Resultados"
        snap={sheet}
        onSnapChange={setSnap}
        onVisibleHeightChange={setSheetHeight}
        scrollRef={scrollRef}
        header={
          panel === 'browse' ? (
            <div className="space-y-3 px-4 pb-3">
              <ResultsSummary visible={visible} />
              <BrowseControls visible={visible} />
            </div>
          ) : null
        }
      >
        <div className="px-4 pt-1">
          <PanelContent visible={visible} scrollRef={scrollRef} />
        </div>
      </BottomSheet>
    </div>
  )
}

function Logo() {
  return (
    <p className="flex items-center gap-2 text-title font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-sm bg-accent text-accent-contrast">
        <Fuel aria-hidden className="size-4.5" />
      </span>
      Reposta
    </p>
  )
}

function PageTitle() {
  return <h1 className="sr-only">Reposta: gasolineras cercanas y dónde compensa repostar</h1>
}

function SkipLink() {
  return (
    <a
      href="#resultados"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[2000] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-md"
    >
      Saltar al listado
    </a>
  )
}

function MapFallback() {
  return <div className="h-full w-full bg-[var(--map-bg)]" role="status" aria-label="Cargando mapa" />
}
