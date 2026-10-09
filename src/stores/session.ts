import { create } from 'zustand'
import type { AppError, LoadStatus, Panel, Place, ProvinceAverage, RouteOption, Station } from '../types/domain'

/** Mobile bottom sheet positions. Ignored by the desktop sidebar. */
export type SheetSnap = 'collapsed' | 'half' | 'full'

interface SessionState {
  origin: Place | null
  stations: Station[]
  status: LoadStatus
  error: AppError | null
  selectedId: number | null
  panel: Panel
  compareIds: number[]
  provinceAverage: ProvinceAverage | null
  provinceName: string | null
  searchHere: { latitude: number; longitude: number } | null
  retryToken: number
  sheet: SheetSnap
  locating: boolean
  locateError: AppError | null
  routes: RouteOption[]
  routeIndex: number
  routeStatus: LoadStatus
  routeError: AppError | null
  /** Radius searches done / planned while collecting the stations along the route. */
  corridorProgress: { done: number; total: number } | null
  /** Route stretches whose stations could not be loaded. */
  corridorGaps: number
  setOrigin: (origin: Place) => void
  setLoading: (clearStations: boolean) => void
  setStations: (stations: Station[]) => void
  setError: (error: AppError) => void
  selectStation: (id: number | null) => void
  setPanel: (panel: Panel) => void
  toggleCompare: (id: number) => void
  setProvinceAverage: (provinceName: string | null, average: ProvinceAverage | null) => void
  setSearchHere: (point: { latitude: number; longitude: number } | null) => void
  retry: () => void
  setSheet: (sheet: SheetSnap) => void
  setLocating: (locating: boolean, error?: AppError | null) => void
  /** Leaves the current results, selection and panels when switching between nearby and route. */
  resetResults: () => void
  setRoutesLoading: () => void
  setRoutes: (routes: RouteOption[]) => void
  setRouteError: (error: AppError) => void
  selectRoute: (index: number) => void
  setCorridorProgress: (progress: { done: number; total: number } | null, gaps?: number) => void
}

const COMPARE_LIMIT = 3

export const useSession = create<SessionState>((set) => ({
  origin: null,
  stations: [],
  status: 'idle',
  error: null,
  selectedId: null,
  panel: 'browse',
  compareIds: [],
  provinceAverage: null,
  provinceName: null,
  searchHere: null,
  retryToken: 0,
  sheet: 'half',
  locating: false,
  locateError: null,
  routes: [],
  routeIndex: 0,
  routeStatus: 'idle',
  routeError: null,
  corridorProgress: null,
  corridorGaps: 0,
  setOrigin: (origin) =>
    set({ origin, searchHere: null, panel: 'browse', selectedId: null, locateError: null }),
  setLoading: (clearStations) =>
    set((state) => ({
      status: 'loading',
      error: null,
      stations: clearStations ? [] : state.stations,
    })),
  setStations: (stations) =>
    set((state) => {
      const selectedRemains = stations.some((station) => station.id === state.selectedId)
      const keepPanel =
        selectedRemains || state.panel === 'browse' || state.panel === 'settings' || state.panel === 'compare'
      return {
        stations,
        status: 'ready',
        error: null,
        selectedId: selectedRemains ? state.selectedId : null,
        panel: keepPanel ? state.panel : 'browse',
        compareIds: state.compareIds.filter((id) => stations.some((station) => station.id === id)),
      }
    }),
  setError: (error) => set({ status: 'error', error }),
  selectStation: (id) =>
    set((state) => ({
      selectedId: id,
      panel: id === null ? 'browse' : 'detail',
      // Opening a station from a collapsed sheet raises it so the detail is readable.
      sheet: id !== null && state.sheet === 'collapsed' ? 'half' : state.sheet,
    })),
  setPanel: (panel) => set({ panel }),
  toggleCompare: (id) =>
    set((state) => {
      if (state.compareIds.includes(id)) {
        const compareIds = state.compareIds.filter((item) => item !== id)
        return { compareIds, panel: compareIds.length === 0 ? 'browse' : state.panel }
      }
      if (state.compareIds.length >= COMPARE_LIMIT) return state
      return { compareIds: [...state.compareIds, id] }
    }),
  setProvinceAverage: (provinceName, provinceAverage) => set({ provinceName, provinceAverage }),
  setSearchHere: (searchHere) => set({ searchHere }),
  retry: () => set((state) => ({ retryToken: state.retryToken + 1 })),
  setSheet: (sheet) => set({ sheet }),
  setLocating: (locating, error = null) => set({ locating, locateError: error }),
  resetResults: () =>
    set({
      stations: [],
      status: 'idle',
      error: null,
      selectedId: null,
      panel: 'browse',
      searchHere: null,
      compareIds: [],
      routes: [],
      routeIndex: 0,
      routeStatus: 'idle',
      routeError: null,
      corridorProgress: null,
      corridorGaps: 0,
    }),
  setRoutesLoading: () => set({ routeStatus: 'loading', routeError: null, routes: [], routeIndex: 0, stations: [], status: 'idle' }),
  setRoutes: (routes) => set({ routes, routeIndex: 0, routeStatus: 'ready', routeError: null }),
  setRouteError: (routeError) => set({ routeStatus: 'error', routeError }),
  selectRoute: (routeIndex) => set({ routeIndex, selectedId: null, panel: 'browse' }),
  setCorridorProgress: (corridorProgress, gaps) =>
    set((state) => ({ corridorProgress, corridorGaps: gaps ?? state.corridorGaps })),
}))
