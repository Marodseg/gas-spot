/**
 * Fuels the station endpoint reports as fixed price fields. `id` matches the
 * API's fuel-type id (used for history and provincial averages) and `field`
 * the price key in station responses. Labels are ours: the API's names are
 * unaccented and mixed with other countries' fuels.
 */
export const FUELS = [
  {
    id: 6,
    field: 'Diesel',
    averageName: 'Gasoleo A',
    label: 'Gasóleo A',
    primary: true,
  },
  {
    id: 10,
    field: 'Gasolina95',
    averageName: 'Gasolina 95 E5',
    label: 'Gasolina 95',
    primary: true,
  },
  {
    id: 13,
    field: 'Gasolina98',
    averageName: 'Gasolina 98 E5',
    label: 'Gasolina 98',
    primary: true,
  },
  {
    id: 5,
    field: 'GLP',
    averageName: 'Gases licuados del petróleo',
    label: 'GLP',
    primary: true,
  },
  {
    id: 8,
    field: 'DieselPremium',
    averageName: 'Gasoleo Premium',
    label: 'Gasóleo Premium',
    primary: false,
  },
  {
    id: 11,
    field: 'Gasolina95_E5_Premium',
    averageName: 'Gasolina 95 E5 Premium',
    label: 'Gasolina 95 Premium',
    primary: false,
  },
  {
    id: 16,
    field: 'HVO',
    averageName: 'HVO',
    label: 'HVO',
    primary: false,
  },
  {
    id: 7,
    field: 'DieselB',
    averageName: 'Gasoleo B',
    label: 'Gasóleo B',
    primary: false,
  },
] as const

export type FuelDefinition = (typeof FUELS)[number]
export type FuelField = FuelDefinition['field']

export const DEFAULT_FUEL_ID = 6

export function findFuel(id: number): FuelDefinition {
  return FUELS.find((fuel) => fuel.id === id) ?? FUELS[0]
}

export function fuelFields(): readonly FuelField[] {
  return FUELS.map((fuel) => fuel.field)
}
