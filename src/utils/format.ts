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

/** "1,749" — the bare number, for layouts that render the unit separately. */
export function formatPriceValue(price: number): string {
  return priceFormat.format(price)
}

/** "1,749 €" — compact form for map pins and charts. */
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

/** "3,6 cént. menos" / "1,2 cént. más" / "En la media" for a per-litre difference. */
export function formatPriceDelta(delta: number): string {
  const cents = Math.abs(delta) * 100
  if (cents < 0.05) return 'En la media'
  const value = distanceFormat.format(cents)
  return delta < 0 ? `${value} cént. menos` : `${value} cént. más`
}
