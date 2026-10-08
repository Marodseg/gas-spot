export function directionsUrl(latitude: number, longitude: number, userAgent: string): string {
  const destination = `${latitude},${longitude}`
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return `https://maps.apple.com/?daddr=${destination}&dirflg=d`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`
}

export function openDirections(latitude: number, longitude: number): void {
  const url = directionsUrl(latitude, longitude, navigator.userAgent)
  window.open(url, '_blank', 'noopener,noreferrer')
}
