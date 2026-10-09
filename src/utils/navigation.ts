import type { Coordinates, Place } from '../types/domain'

export function directionsUrl(latitude: number, longitude: number, userAgent: string): string {
  const destination = `${latitude},${longitude}`
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return `https://maps.apple.com/?daddr=${destination}&dirflg=d`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`
}

/**
 * Whole trip with the station as a stop. Google Maps is used on every platform
 * because Apple Maps URLs do not support intermediate stops. A start that is
 * the user's own position is left out so the app uses the live location.
 */
export function routeDirectionsUrl(from: Place, stop: Coordinates, to: Place): string {
  const point = (place: Coordinates) => `${place.latitude},${place.longitude}`
  const params = new URLSearchParams({ api: '1', destination: point(to), waypoints: point(stop), travelmode: 'driving' })
  if (from.source !== 'geolocation') params.set('origin', point(from))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function openDirections(latitude: number, longitude: number): void {
  openUrl(directionsUrl(latitude, longitude, navigator.userAgent))
}

export function openUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}
