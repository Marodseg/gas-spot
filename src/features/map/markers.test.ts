import { describe, expect, it } from 'vitest'
import type { RankedStation } from '../../utils/ranking'
import { clusterHtml, markerHtml, markerLabel } from './markers'

const item = {
  station: { id: 1, brand: 'Repsol' },
  price: 1.429,
  band: 'cheap',
  bandLabel: 'Barato en la zona',
  openStatus: 'closed',
  isBest: true,
} as unknown as RankedStation

describe('marcadores del mapa', () => {
  it('pinta el precio y expone estado sin depender del color', () => {
    const html = markerHtml(item, true)
    expect(html).toContain('1,429 €')
    expect(html).toContain('data-band="cheap"')
    expect(html).toContain('data-selected="true"')
    expect(html).toContain('data-best="true"')
    expect(markerLabel(item)).toBe('Repsol, 1,429 €, Barato en la zona, recomendada, cerrada ahora')
  })

  it('resume un grupo con su precio más barato', () => {
    expect(clusterHtml('1,399 €', 4)).toContain('aria-label="4 gasolineras, desde 1,399 €"')
  })
})
