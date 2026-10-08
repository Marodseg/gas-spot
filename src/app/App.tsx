import { lazy, Suspense, useCallback, useEffect } from 'react'
import { useNearbyStations } from '../hooks/useNearbyStations'
import { useTheme } from '../hooks/useTheme'
import { geolocationPermission, locate } from '../services/geolocation'
import { usePreferences } from '../stores/preferences'
import { useSession } from '../stores/session'
import { SidePanel } from '../features/layout/SidePanel'
import { choosePlace } from '../features/search/choose-place'

const StationMap = lazy(() => import('../features/map/StationMap').then((module) => ({ default: module.StationMap })))
import { useVisibleStations } from '../hooks/useVisibleStations'
import { Button } from '../components/ui/Button'

export function App() {
  const { dark } = useTheme()
  useNearbyStations()
  const origin = useSession((state) => state.origin)
  const panel = useSession((state) => state.panel)
  const selectedId = useSession((state) => state.selectedId)
  const searchHere = useSession((state) => state.searchHere)
  const radiusKm = usePreferences((state) => state.radiusKm)
  const visible = useVisibleStations()
  const selectStation = useCallback((id: number) => {
    useSession.getState().selectStation(id)
  }, [])
  const setSearchHere = useCallback((point: { latitude: number; longitude: number } | null) => {
    useSession.getState().setSearchHere(point)
  }, [])

  useEffect(() => {
    const saved = usePreferences.getState().lastPlace
    if (saved) {
      useSession.getState().setOrigin(saved)
      return
    }
    void geolocationPermission().then((state) => {
      if (state !== 'granted') return
      void locate()
        .then(choosePlace)
        .catch(() => undefined)
    })
  }, [])

  return (
    <div className="h-dvh bg-bg text-ink">
      <a href="#resultados" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Saltar al listado
      </a>
      <div className="flex h-full flex-col md:flex-row">
        <div className={`relative shrink-0 ${panel === 'browse' ? 'h-[52dvh]' : 'h-[32dvh]'} md:h-auto md:min-h-0 md:flex-1`}>
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-line/40" aria-label="Cargando mapa" />}>
            <StationMap
              origin={origin}
              stations={visible.ranked}
              selectedId={selectedId}
              radiusKm={radiusKm}
              dark={dark}
              onSelect={selectStation}
              onSearchHere={setSearchHere}
            />
          </Suspense>
          {searchHere ? (
            <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
              <Button
                onClick={() =>
                  choosePlace({
                    latitude: searchHere.latitude,
                    longitude: searchHere.longitude,
                    label: 'Zona del mapa',
                    source: 'map',
                  })
                }
              >
                Buscar en esta zona
              </Button>
            </div>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 border-t border-line md:h-dvh md:w-[27rem] md:flex-none md:border-t-0 md:border-l">
          <SidePanel visible={visible} />
        </div>
      </div>
    </div>
  )
}
