import { FUELS, type FuelDefinition } from '../../config/fuels'

interface FuelPickerProps {
  selectedId: number
  onSelect: (fuel: FuelDefinition) => void
  showSecondary?: boolean
}

export function FuelPicker({ selectedId, onSelect, showSecondary = false }: FuelPickerProps) {
  const fuels = showSecondary ? FUELS : FUELS.filter((fuel) => fuel.primary || fuel.id === selectedId)
  return (
    <div role="radiogroup" aria-label="Combustible" className="flex gap-2 overflow-x-auto pb-1">
      {fuels.map((fuel) => {
        const selected = fuel.id === selectedId
        return (
          <button
            key={fuel.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
              selected ? 'bg-ink text-bg' : 'border border-line bg-surface text-ink'
            }`}
            onClick={() => onSelect(fuel)}
          >
            {fuel.shortLabel}
          </button>
        )
      })}
    </div>
  )
}
