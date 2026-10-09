import { describe, expect, it } from 'vitest'
import { createCache } from '../cache'
import { buildPrecioilUrl, precioilHeaders } from './client'
import { mapHttpError } from './errors'
import { parseStation, parseStationList } from './normalize'
import { appError, copyFor } from '../../utils/messages'

const origin = { latitude: 37.1773, longitude: -3.5986 }

describe('contrato Precioil', () => {
  it('normaliza una estación de /estaciones/radio con precios numéricos', () => {
    const station = parseStation(
      {
        idEstacion: 5807,
        nombreEstacion: 'REPSOL',
        direccion: 'CL PROLONGACION RECOGIDAS, S/N',
        longitud: -3.605806,
        latitud: 37.170194,
        horario: 'L-D: 24H',
        localidad: 'GRANADA',
        provincia: 'GRANADA',
        marca: 'REPSOL',
        Diesel: 1.919,
        Gasolina95: 1.859,
        distancia: 1.016,
        lastUpdate: '2026-10-08 13:00:00',
        codPostal: 18004,
        tipoVenta: 'P',
        margen: 'D',
      },
      origin,
    )
    expect(station?.brand).toBe('Repsol')
    expect(station?.prices.Diesel).toBe(1.919)
    expect(station?.prices.Gasolina95).toBe(1.859)
    expect(station?.distanceKm).toBe(1.016)
    expect(station?.saleType).toBe('public')
    expect(station?.margin).toBe('right')
  })

  it('acepta el detalle con coordenadas y precios en texto', () => {
    const station = parseStation(
      {
        idEstacion: 1,
        nombreEstacion: 'EUSKOIL-STAR PETROLEUM',
        longitud: '-2.597556',
        latitud: '43.170556',
        direccion: 'CTRA.FORAL BI-633 km 32,3',
        Gasolina95: '1.844',
        Diesel: '1.844',
        marca: 'EUSKOIL-STAR PETROLEUM',
        provincia: 'BIZKAIA',
      },
      origin,
    )
    expect(station?.prices.Gasolina95).toBe(1.844)
    expect(station?.latitude).toBeCloseTo(43.170556)
  })

  it('descarta coordenadas 0,0 y respuestas que no son una lista', () => {
    const stations = parseStationList(
      [
        { idEstacion: 9, latitud: 0, longitud: 0, nombreEstacion: 'Fantasma' },
        {
          idEstacion: 10,
          latitud: 40.4,
          longitud: -3.7,
          nombreEstacion: 'Real',
          marca: 'Real',
          Diesel: 1.5,
        },
      ],
      origin,
    )
    expect(stations.map((station) => station.id)).toEqual([10])
    expect(parseStationList({ error: 'no' }, origin)).toEqual([])
  })
})

describe('cliente', () => {
  it('no coloca la API key en la query', () => {
    const url = buildPrecioilUrl('https://api.precioil.es', '/estaciones/radio', {
      latitud: 40.4,
      longitud: -3.7,
      radio: 5,
    })
    const headers = precioilHeaders('browser-key')
    expect(url.toString()).not.toContain('browser-key')
    expect(url.searchParams.get('latitud')).toBe('40.4')
    expect(headers.get('X-API-Key')).toBe('browser-key')
    expect(precioilHeaders('').has('X-API-Key')).toBe(false)
  })

  it('traduce los errores HTTP a mensajes útiles', () => {
    expect(mapHttpError(401, { error: 'invalid_api_key', message: 'API key no valida.' }, null).code).toBe('unauthorized')
    expect(mapHttpError(429, { message: 'límite' }, '5').code).toBe('rate_limit')
    expect(mapHttpError(404, { message: 'Estación no encontrada.' }, null).message).toMatch(/encontrada/i)
    expect(copyFor('geolocation_denied').message).toMatch(/Busca una ciudad/i)
    expect(copyFor('network').title).toBe('Sin conexión')
    // User copy never leaks API wording; the technical detail travels apart.
    const unauthorized = appError('unauthorized', 'HTTP 403 · api_key_origin_not_allowed')
    expect(unauthorized.message).not.toMatch(/key|clave|API/i)
    expect(unauthorized.detail).toMatch(/403/)
  })
})

describe('caché', () => {
  it('comparte una petición en vuelo y no guarda errores', async () => {
    let calls = 0
    let now = 0
    const cache = createCache(() => now)
    const loader = () => {
      calls += 1
      return Promise.resolve('ok')
    }
    const [first, second] = await Promise.all([cache.fetch('a', 1000, loader), cache.fetch('a', 1000, loader)])
    expect(first).toBe('ok')
    expect(second).toBe('ok')
    expect(calls).toBe(1)
    now = 5000
    await cache.fetch('a', 1000, loader)
    expect(calls).toBe(2)

    const failing = createCache(() => 0)
    await expect(failing.fetch('b', 1000, () => Promise.reject(new Error('fallo')))).rejects.toThrow('fallo')
    await expect(failing.fetch('b', 1000, () => Promise.resolve('recuperado'))).resolves.toBe('recuperado')
  })
})

describe('caché con peticiones canceladas', () => {
  it('reintenta para el segundo interesado si el primero cancela la petición compartida', async () => {
    const cache = createCache(() => 0)
    const aborted = cache.fetch('c', 1000, () => Promise.reject(new DOMException('cancelada', 'AbortError')))
    const second = cache.fetch('c', 1000, () => Promise.resolve('datos'))
    await expect(aborted).rejects.toThrow('cancelada')
    await expect(second).resolves.toBe('datos')
  })
})
