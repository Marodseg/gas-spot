import { describe, expect, it } from 'vitest'
import { describeUpdate } from './datetime'
import { formatDistance, formatPrice, formatPriceDelta, formatPricePerLiter } from './format'

describe('formato de precios y distancias', () => {
  it('usa un único formato español en toda la interfaz', () => {
    expect(formatPricePerLiter(1.429)).toBe('1,429 €/L')
    expect(formatPrice(1.429)).toBe('1,429 €')
    expect(formatDistance(1)).toBe('1,0 km')
    expect(formatDistance(0.35)).toBe('350 m')
  })

  it('expresa la diferencia por litro en céntimos', () => {
    expect(formatPriceDelta(-0.036)).toBe('3,6 cént. menos')
    expect(formatPriceDelta(0.012)).toBe('1,2 cént. más')
    expect(formatPriceDelta(0.0001)).toBe('En la media')
  })
})

describe('actualización del precio', () => {
  const now = new Date('2026-10-08T12:00:00Z')

  it('habla en minutos, horas o días y baja la confianza con la antigüedad', () => {
    expect(describeUpdate('2026-10-08T11:59:40Z', now)).toEqual({ label: 'Actualizado ahora', freshness: 'fresh' })
    expect(describeUpdate('2026-10-08T11:46:00Z', now)).toEqual({ label: 'Actualizado hace 14 min', freshness: 'fresh' })
    expect(describeUpdate('2026-10-08T09:00:00Z', now)).toEqual({ label: 'Actualizado hace 3 h', freshness: 'recent' })
    expect(describeUpdate('2026-10-07T12:25:00Z', now)).toEqual({ label: 'Actualizado hace 1 día', freshness: 'stale' })
    expect(describeUpdate('2026-10-06T12:00:00Z', now)).toEqual({ label: 'Actualizado hace 2 días', freshness: 'stale' })
  })

  it('no inventa una fecha si falta o es ilegible', () => {
    expect(describeUpdate(null, now)).toBeNull()
    expect(describeUpdate('ayer', now)).toBeNull()
  })
})
