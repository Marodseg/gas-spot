import type { HistoryPoint } from '../../types/domain'
import { parsePrice } from '../../utils/numbers'
import { responseCache } from '../cache'
import { precioilGet } from './client'
import { z } from 'zod'

const historySchema = z.object({
  estacionId: z.number().int(),
  periodo: z.object({
    inicio: z.string(),
    fin: z.string(),
  }),
  data: z.array(
    z.object({
      idPrecio: z.number().int(),
      idEstacion: z.number().int(),
      idFuelType: z.number().int(),
      precio: z.union([z.string(), z.number()]),
      timestamp: z.string(),
    }),
  ),
})

const TTL_MS = 10 * 60 * 1000

export async function getStationHistory(
  stationId: number,
  fuelId: number,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<HistoryPoint[]> {
  const key = `historico:${stationId}:${fuelId}:${from}:${to}`
  return responseCache.fetch(key, TTL_MS, async () => {
    const body = await precioilGet(
      `/estaciones/historico/${stationId}`,
      { fechaInicio: from, fechaFin: to },
      signal,
    )
    const parsed = historySchema.safeParse(body)
    if (!parsed.success) return []
    const points: HistoryPoint[] = []
    for (const row of parsed.data.data) {
      if (row.idFuelType !== fuelId) continue
      const price = parsePrice(row.precio)
      if (price === null) continue
      points.push({
        id: row.idPrecio,
        stationId: row.idEstacion,
        fuelId: row.idFuelType,
        price,
        timestamp: row.timestamp,
      })
    }
    return points
  })
}
