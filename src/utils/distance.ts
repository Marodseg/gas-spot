import type { Coordinates } from '../types/domain'

const EARTH_RADIUS_KM = 6371

export function haversineKm(from: Coordinates, to: Coordinates): number {
  const fromLat = toRadians(from.latitude)
  const toLat = toRadians(to.latitude)
  const deltaLat = toRadians(to.latitude - from.latitude)
  const deltaLon = toRadians(to.longitude - from.longitude)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function zoomForRadius(radiusKm: number): number {
  if (radiusKm <= 2) return 14
  if (radiusKm <= 5) return 13
  if (radiusKm <= 10) return 12
  if (radiusKm <= 20) return 11
  return 10
}

export function isPlausibleCoordinate(latitude: number, longitude: number): boolean {
  if (latitude === 0 && longitude === 0) return false
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}
