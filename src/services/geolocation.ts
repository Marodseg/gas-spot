import type { Place } from '../types/domain'
import { appError } from '../utils/messages'

export async function geolocationPermission(): Promise<PermissionState | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown'
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state
  } catch {
    return 'unknown'
  }
}

export function locate(): Promise<Place> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(appError('geolocation_unavailable'))
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          label: 'Tu ubicación',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: 'geolocation',
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) reject(appError('geolocation_denied'))
        else reject(appError('geolocation_unavailable'))
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}
