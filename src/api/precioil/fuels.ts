import { responseCache } from '../cache'
import { precioilGet } from './client'
import { z } from 'zod'

const fuelTypeSchema = z.object({
  idFuelType: z.number().int(),
  fuelTypeName: z.string(),
})

export interface FuelType {
  id: number
  name: string
}

const TTL_MS = 12 * 60 * 60 * 1000

export async function listFuelTypes(signal?: AbortSignal): Promise<FuelType[]> {
  return responseCache.fetch('fuel-types', TTL_MS, async () => {
    const body = await precioilGet('/fuel-types', undefined, signal)
    const parsed = z.array(fuelTypeSchema).safeParse(body)
    if (!parsed.success) return []
    return parsed.data.map((fuel) => ({ id: fuel.idFuelType, name: fuel.fuelTypeName }))
  })
}
