import type { FuelField } from '../config/fuels'

export interface Coordinates {
  latitude: number
  longitude: number
}

export type PlaceSource = 'geolocation' | 'search' | 'map'

export interface Place extends Coordinates {
  label: string
  source: PlaceSource
}

export type SaleType = 'public' | 'restricted' | 'unknown'
export type RoadMargin = 'right' | 'left' | 'none' | 'unknown'

export interface Station extends Coordinates {
  id: number
  name: string
  brand: string
  address: string
  locality: string
  municipality: string
  province: string
  postalCode: string
  distanceKm: number
  schedule: string | null
  saleType: SaleType
  margin: RoadMargin
  municipalityId: number | null
  updatedAt: string | null
  prices: Partial<Record<FuelField, number>>
  services: string | null
}

export type SortMode = 'recommended' | 'price' | 'distance'
export type ThemePreference = 'light' | 'dark' | 'system'
export type Panel = 'browse' | 'detail' | 'history' | 'compare' | 'settings'
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export type AppErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'invalid_response'
  | 'server'
  | 'geolocation_denied'
  | 'geolocation_unavailable'

export interface AppError {
  code: AppErrorCode
  message: string
}

export interface Province {
  id: number
  name: string
}

export interface ProvinceAverage {
  provinceId: number
  fuelName: string
  price: number
  calculatedAt: string | null
}

export interface HistoryPoint {
  id: number
  stationId: number
  fuelId: number
  price: number
  timestamp: string
}

export interface HistorySeriesPoint {
  date: string
  price: number | null
}
