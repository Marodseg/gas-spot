import { findFuel } from '../../config/fuels'
import type { Province, ProvinceAverage } from '../../types/domain'
import { parsePrice } from '../../utils/numbers'
import { fold } from '../../utils/text'
import { responseCache } from '../cache'
import { precioilGet } from './client'
import { z } from 'zod'

const provinceSchema = z.object({
  idProvincia: z.number().int(),
  nombreProvincia: z.string(),
})

const averageSchema = z.object({
  idProvincia: z.number().int(),
  fuelTypeName: z.string(),
  averagePrice: z.union([z.number(), z.string()]),
  lastCalculated: z.string().nullable().optional(),
})

const PROVINCE_TTL_MS = 12 * 60 * 60 * 1000
const AVERAGE_TTL_MS = 30 * 60 * 1000

export async function listProvinces(signal?: AbortSignal): Promise<Province[]> {
  return responseCache.fetch('provincias', PROVINCE_TTL_MS, async () => {
    const body = await precioilGet('/provincias', undefined, signal)
    const parsed = z.array(provinceSchema).safeParse(body)
    if (!parsed.success) return []
    return parsed.data.map((province) => ({ id: province.idProvincia, name: province.nombreProvincia }))
  })
}

export async function findSpanishProvince(name: string, signal?: AbortSignal): Promise<Province | null> {
  const target = fold(name)
  if (!target) return null
  const provinces = await listProvinces(signal)
  const matches = provinces.filter((province) => fold(province.name) === target)
  return matches.sort((left, right) => spanishRank(left.id) - spanishRank(right.id))[0] ?? null
}

export async function getProvinceFuelAverage(
  provinceName: string,
  fuelId: number,
  signal?: AbortSignal,
): Promise<ProvinceAverage | null> {
  const province = await findSpanishProvince(provinceName, signal)
  if (!province) return null
  const fuel = findFuel(fuelId)
  const averages = await responseCache.fetch(`media:${province.id}`, AVERAGE_TTL_MS, () => loadAverages(province.id, signal))
  const match = averages.find((average) => fold(average.fuelName) === fold(fuel.averageName))
  return match ?? null
}

async function loadAverages(provinceId: number, signal?: AbortSignal): Promise<ProvinceAverage[]> {
  const body = await precioilGet(`/precios/medios/provincia/${provinceId}`, undefined, signal)
  const parsed = z.array(averageSchema).safeParse(body)
  if (!parsed.success) return []
  const averages: ProvinceAverage[] = []
  for (const row of parsed.data) {
    const price = parsePrice(row.averagePrice)
    if (price === null) continue
    averages.push({
      provinceId: row.idProvincia,
      fuelName: row.fuelTypeName,
      price,
      calculatedAt: row.lastCalculated ?? null,
    })
  }
  return averages
}

function spanishRank(id: number): number {
  return id > 0 && id <= 52 ? id : 1000 + id
}
