const priceFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

const moneyFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const distanceFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatPrice(price: number): string {
  return `${priceFormat.format(price)} €`
}

export function formatPricePerLiter(price: number): string {
  return `${priceFormat.format(price)} €/L`
}

export function formatMoney(value: number): string {
  return moneyFormat.format(value)
}

export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.max(1, Math.round(km * 1000))
    return `${new Intl.NumberFormat('es-ES').format(meters)} m`
  }
  return `${distanceFormat.format(km)} km`
}

export function formatSignedPrice(delta: number): string {
  const abs = priceFormat.format(Math.abs(delta))
  if (delta < -0.0005) return `${abs} € por debajo`
  if (delta > 0.0005) return `${abs} € por encima`
  return 'en la media'
}
