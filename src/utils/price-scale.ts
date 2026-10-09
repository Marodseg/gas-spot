export type PriceBand = 'cheap' | 'mid' | 'high' | 'unknown'

export interface PriceReading {
  band: PriceBand
  label: string
}

export function priceScale(prices: readonly number[]): (price: number) => PriceReading {
  const sorted = prices.filter((price) => Number.isFinite(price)).sort((left, right) => left - right)
  const lowest = sorted[0]
  const highest = sorted[sorted.length - 1]
  if (lowest === undefined || highest === undefined) {
    return () => ({ band: 'unknown', label: 'Sin referencia' })
  }
  if (highest - lowest < 0.005) {
    return () => ({ band: 'mid', label: 'Precio similar en la zona' })
  }
  const lowCut = quantile(sorted, 0.33)
  const highCut = quantile(sorted, 0.66)
  return (price: number) => {
    if (price <= lowCut) return { band: 'cheap', label: 'Barato en la zona' }
    if (price >= highCut) return { band: 'high', label: 'Caro en la zona' }
    return { band: 'mid', label: 'Precio medio' }
  }
}

function quantile(sorted: readonly number[], ratio: number): number {
  const index = (sorted.length - 1) * ratio
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const left = sorted[lower]
  const right = sorted[upper]
  if (left === undefined || right === undefined) return sorted[0] ?? 0
  return left + (right - left) * (index - lower)
}
