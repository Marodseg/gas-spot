import L from 'leaflet'
import type { PriceBand } from '../../utils/price-scale'
import type { RankedStation } from '../../utils/ranking'
import { formatPrice } from '../../utils/format'

// Markers are plain HTML built by the app (L.divIcon), so there are no image
// assets for Vite or GitHub Pages to resolve. Glyphs are Lucide paths inlined.
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

const BAND_GLYPH: Record<PriceBand, string> = {
  cheap: svg('<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>'),
  mid: svg('<path d="M5 12h14"/>'),
  high: svg('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'),
  unknown: svg('<path d="M5 12h14"/>'),
}
const BEST_GLYPH = svg('<path d="M20 6 9 17l-5-5"/>')

export function markerHtml(item: RankedStation, selected: boolean): string {
  const glyph = item.isBest ? BEST_GLYPH : BAND_GLYPH[item.band]
  return `<div class="price-pin" data-band="${item.band}" data-best="${item.isBest}" data-selected="${selected}" data-closed="${item.openStatus === 'closed'}">
    <span class="price-pin__label"><span class="price-pin__band">${glyph}</span>${formatPrice(item.price)}</span>
    <span class="price-pin__stem"></span>
    <span class="price-pin__dot"></span>
  </div>`
}

/** Accessible name for a marker: brand, price, band and whether it is the recommended one. */
export function markerLabel(item: RankedStation): string {
  const parts = [item.station.brand, formatPrice(item.price), item.bandLabel]
  if (item.isBest) parts.push('recomendada')
  if (item.openStatus === 'closed') parts.push('cerrada ahora')
  return parts.join(', ')
}

export function clusterHtml(cheapest: string | null, count: number): string {
  const price = cheapest ? `<span>${cheapest}</span>` : ''
  return `<div class="cluster-pin" role="img" aria-label="${count} gasolineras${cheapest ? `, desde ${cheapest}` : ''}">${price}<span class="cluster-pin__count">${count}</span></div>`
}

export const originIcon = L.divIcon({
  className: 'price-marker-icon',
  html: '<span class="origin-dot"></span>',
  iconSize: L.point(0, 0),
})
