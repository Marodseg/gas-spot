export const FUELS = [
  {
    id: 6,
    field: 'Diesel',
    averageName: 'Gasoleo A',
    label: 'Gasóleo A',
    shortLabel: 'Diésel',
    primary: true,
  },
  {
    id: 10,
    field: 'Gasolina95',
    averageName: 'Gasolina 95 E5',
    label: 'Gasolina 95',
    shortLabel: '95',
    primary: true,
  },
  {
    id: 13,
    field: 'Gasolina98',
    averageName: 'Gasolina 98 E5',
    label: 'Gasolina 98',
    shortLabel: '98',
    primary: true,
  },
  {
    id: 5,
    field: 'GLP',
    averageName: 'Gases licuados del petróleo',
    label: 'GLP',
    shortLabel: 'GLP',
    primary: true,
  },
  {
    id: 8,
    field: 'DieselPremium',
    averageName: 'Gasoleo Premium',
    label: 'Diésel premium',
    shortLabel: 'Diésel+',
    primary: false,
  },
  {
    id: 11,
    field: 'Gasolina95_E5_Premium',
    averageName: 'Gasolina 95 E5 Premium',
    label: '95 premium',
    shortLabel: '95+',
    primary: false,
  },
  {
    id: 16,
    field: 'HVO',
    averageName: 'HVO',
    label: 'HVO',
    shortLabel: 'HVO',
    primary: false,
  },
  {
    id: 7,
    field: 'DieselB',
    averageName: 'Gasoleo B',
    label: 'Gasóleo B',
    shortLabel: 'B',
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
