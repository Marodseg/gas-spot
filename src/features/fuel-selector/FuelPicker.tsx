import { useEffect, useRef } from 'react'
import { FUELS, type FuelDefinition } from '../../config/fuels'

interface FuelPickerProps {
  selectedId: number
  onSelect: (fuel: FuelDefinition) => void
  /** Fuel ids sold by at least one nearby station. Without data, the common fuels are offered. */
  availableIds?: ReadonlySet<number>
  floating?: boolean
}

export function FuelPicker({ selectedId, onSelect, availableIds, floating = false }: FuelPickerProps) {
  const fuels = FUELS.filter((fuel) =>
    fuel.id === selectedId || (availableIds && availableIds.size > 0 ? availableIds.has(fuel.id) : fuel.primary),
  )
  const groupRef = useRef<HTMLDivElement>(null)

  // Keep the active chip in view when the selection changes or the row first renders.
  useEffect(() => {
    const active = groupRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [selectedId])

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Combustible"
      className={`no-scrollbar flex gap-2 overflow-x-auto ${floating ? '-mx-4 px-4 py-1' : '-mx-5 px-5'}`}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
        event.preventDefault()
        const index = fuels.findIndex((fuel) => fuel.id === selectedId)
        const next = fuels[(index + (event.key === 'ArrowRight' ? 1 : -1) + fuels.length) % fuels.length]
        if (!next) return
        onSelect(next)
        requestAnimationFrame(() =>
          groupRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(),
        )
      }}
    >
      {fuels.map((fuel) => {
        const selected = fuel.id === selectedId
        return (
          <button
            key={fuel.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`h-9 shrink-0 rounded-full px-3.5 text-body-sm font-semibold whitespace-nowrap transition-colors duration-150 ${
              selected
                ? 'bg-ink text-surface'
                : floating
                  ? 'bg-surface text-ink shadow-md hover:bg-raised'
                  : 'border border-line-strong bg-surface text-ink hover:bg-raised'
            }`}
            onClick={() => onSelect(fuel)}
          >
            {fuel.label}
          </button>
        )
      })}
    </div>
  )
}
