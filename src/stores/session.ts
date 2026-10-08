import { create } from 'zustand'
import type { AppError, LoadStatus, Panel, Place, ProvinceAverage, Station } from '../types/domain'

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
  setOrigin: (origin: Place) => void
  setLoading: (clearStations: boolean) => void
  setStations: (stations: Station[]) => void
  setError: (error: AppError) => void
  selectStation: (id: number | null) => void
  setPanel: (panel: Panel) => void
  toggleCompare: (id: number) => void
  clearCompare: () => void
  setProvinceAverage: (provinceName: string | null, average: ProvinceAverage | null) => void
  setSearchHere: (point: { latitude: number; longitude: number } | null) => void
  retry: () => void
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
  setOrigin: (origin) => set({ origin, searchHere: null, panel: 'browse', selectedId: null }),
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
  selectStation: (id) => set({ selectedId: id, panel: id === null ? 'browse' : 'detail' }),
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
  clearCompare: () => set({ compareIds: [], panel: 'browse' }),
  setProvinceAverage: (provinceName, provinceAverage) => set({ provinceName, provinceAverage }),
  setSearchHere: (searchHere) => set({ searchHere }),
  retry: () => set((state) => ({ retryToken: state.retryToken + 1 })),
}))
