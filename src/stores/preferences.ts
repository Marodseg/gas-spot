import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_FUEL_ID } from '../config/fuels'
import type { Place, SearchMode, SortMode, ThemePreference } from '../types/domain'
import { clamp } from '../utils/numbers'

interface PreferencesState {
  theme: ThemePreference
  fuelId: number
  radiusKm: number
  sort: SortMode
  openNow: boolean
  brand: string | null
  maxPrice: number | null
  liters: number
  consumptionLitersPer100Km: number
  roundTrip: boolean
  lastPlace: Place | null
  mode: SearchMode
  routeFrom: Place | null
  routeTo: Place | null
  setTheme: (theme: ThemePreference) => void
  setFuelId: (fuelId: number) => void
  setRadiusKm: (radiusKm: number) => void
  setSort: (sort: SortMode) => void
  setOpenNow: (openNow: boolean) => void
  setBrand: (brand: string | null) => void
  setMaxPrice: (maxPrice: number | null) => void
  setLiters: (liters: number) => void
  setConsumption: (value: number) => void
  setRoundTrip: (roundTrip: boolean) => void
  setLastPlace: (place: Place) => void
  clearFilters: () => void
  setMode: (mode: SearchMode) => void
  setRouteFrom: (place: Place | null) => void
  setRouteTo: (place: Place | null) => void
  swapRoute: () => void
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      fuelId: DEFAULT_FUEL_ID,
      radiusKm: 5,
      sort: 'recommended',
      openNow: false,
      brand: null,
      maxPrice: null,
      liters: 40,
      consumptionLitersPer100Km: 6.5,
      roundTrip: false,
      lastPlace: null,
      mode: 'nearby',
      routeFrom: null,
      routeTo: null,
      setTheme: (theme) => set({ theme }),
      setFuelId: (fuelId) => set({ fuelId }),
      setRadiusKm: (radiusKm) => set({ radiusKm: clamp(Math.round(radiusKm), 1, 30) }),
      setSort: (sort) => set({ sort }),
      setOpenNow: (openNow) => set({ openNow }),
      setBrand: (brand) => set({ brand }),
      setMaxPrice: (maxPrice) => set({ maxPrice: maxPrice !== null && maxPrice > 0 ? maxPrice : null }),
      setLiters: (liters) => set({ liters: clamp(Math.round(liters), 5, 150) }),
      setConsumption: (value) => set({ consumptionLitersPer100Km: clamp(value, 2, 20) }),
      setRoundTrip: (roundTrip) => set({ roundTrip }),
      setLastPlace: (place) => set({ lastPlace: place }),
      clearFilters: () => set({ brand: null, maxPrice: null, openNow: false }),
      setMode: (mode) => set({ mode }),
      setRouteFrom: (routeFrom) => set({ routeFrom }),
      setRouteTo: (routeTo) => set({ routeTo }),
      swapRoute: () => set((state) => ({ routeFrom: state.routeTo, routeTo: state.routeFrom })),
    }),
    { name: 'reposta.preferences.v1' },
  ),
)
