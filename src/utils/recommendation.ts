import type { Station } from '../types/domain'
import type { BestStationResult } from './best-station'
import { formatMoney } from './format'

export interface RecommendationCopy {
  title: string
  /** One-line reason shown next to the "Recomendada" label. */
  short: string
  body: string
  estimate: boolean
}

export function describeRecommendation(
  result: BestStationResult,
  stations: readonly Station[],
  fuelLabel: string,
  liters: number,
): RecommendationCopy | null {
  if (result.bestId === null) return null
  const best = stations.find((station) => station.id === result.bestId)
  const nearest = stations.find((station) => station.id === result.baselineId)
  const cheapest = stations.find((station) => station.id === result.cheapestId)
  if (!best || !nearest || !cheapest) return null

  const bestName = displayName(best)
  const cheapestName = displayName(cheapest)
  const bestRow = result.rows.find((row) => row.id === best.id)
  const saving = bestRow?.netSavingVsBaselineEur

  if (best.id === nearest.id && cheapest.id === nearest.id) {
    return {
      title: 'La más cercana también es la más barata',
      short: 'La más barata y la más cercana',
      body: `${bestName} publica el menor precio de ${fuelLabel} y es la que menos desvío pide.`,
      estimate: false,
    }
  }

  if (best.id === nearest.id && cheapest.id !== nearest.id) {
    return {
      title: 'No compensa ir más lejos',
      short: 'Ir más lejos no compensa',
      body: `${cheapestName} es más barata por litro, pero con ${liters} L de ${fuelLabel} el desplazamiento se come el ahorro.`,
      estimate: true,
    }
  }

  if (best.id === cheapest.id && saving !== null && saving !== undefined && saving >= 0.15) {
    return {
      title: 'Merece la pena el desvío',
      short: `Ahorras ${formatMoney(saving)} con ${liters} L`,
      body: `${bestName} está más lejos y, con ${liters} L, el ahorro estimado frente a la más cercana es ${formatMoney(saving)}.`,
      estimate: true,
    }
  }

  if (saving !== null && saving !== undefined && saving >= 0.15) {
    return {
      title: 'Esta equilibra precio y distancia',
      short: `Ahorras ${formatMoney(saving)} con ${liters} L`,
      body: `${bestName} no es ni la más barata ni la más cercana, pero con ${liters} L deja un ahorro estimado de ${formatMoney(saving)}.`,
      estimate: true,
    }
  }

  return {
    title: 'La diferencia es pequeña',
    short: 'Mejor equilibrio precio-distancia',
    body: `Con ${liters} L de ${fuelLabel}, ${bestName} sale parecida a las alternativas. El precio oficial manda más que el desvío.`,
    estimate: true,
  }
}

function displayName(station: Station): string {
  return station.brand || station.name
}
