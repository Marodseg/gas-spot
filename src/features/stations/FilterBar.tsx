import { useState } from 'react'
import { findFuel } from '../../config/fuels'
import { analytics } from '../../services/analytics'
import { usePreferences } from '../../stores/preferences'
import type { SortMode } from '../../types/domain'
import { FuelPicker } from '../fuel-selector/FuelPicker'

const RADII = [2, 5, 10, 20, 30]

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'recommended', label: 'Recomendadas' },
  { id: 'price', label: 'Más baratas' },
  { id: 'distance', label: 'Más cercanas' },
]

interface FilterBarProps {
  brands: string[]
}

export function FilterBar({ brands }: FilterBarProps) {
  const fuelId = usePreferences((state) => state.fuelId)
  const radiusKm = usePreferences((state) => state.radiusKm)
  const sort = usePreferences((state) => state.sort)
  const openNow = usePreferences((state) => state.openNow)
  const brand = usePreferences((state) => state.brand)
  const maxPrice = usePreferences((state) => state.maxPrice)
  const [more, setMore] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const fuel = findFuel(fuelId)

  return (
    <div className="space-y-2">
      <FuelPicker
        selectedId={fuelId}
        showSecondary={more}
        onSelect={(next) => {
          analytics.track('fuel_selected', { fuelId: next.id })
          usePreferences.getState().setFuelId(next.id)
        }}
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-full border border-line bg-surface px-3 text-sm font-medium"
          onClick={() => setMore((value) => !value)}
        >
          {more ? 'Menos combustibles' : `Más · ${fuel.shortLabel}`}
        </button>
        {RADII.map((radius) => (
          <button
            key={radius}
            type="button"
            aria-pressed={radiusKm === radius}
            className={`min-h-11 shrink-0 rounded-full px-3 text-sm font-medium ${
              radiusKm === radius ? 'bg-ink text-bg' : 'border border-line bg-surface'
            }`}
            onClick={() => usePreferences.getState().setRadiusKm(radius)}
          >
            ≤ {radius} km
          </button>
        ))}
        {SORTS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={sort === option.id}
            className={`min-h-11 shrink-0 rounded-full px-3 text-sm font-medium ${
              sort === option.id ? 'bg-ink text-bg' : 'border border-line bg-surface'
            }`}
            onClick={() => usePreferences.getState().setSort(option.id)}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={openNow}
          className={`min-h-11 shrink-0 rounded-full px-3 text-sm font-medium ${
            openNow ? 'bg-ink text-bg' : 'border border-line bg-surface'
          }`}
          onClick={() => usePreferences.getState().setOpenNow(!openNow)}
        >
          Abiertas
        </button>
        <button
          type="button"
          aria-expanded={filtersOpen}
          className="min-h-11 shrink-0 rounded-full border border-line bg-surface px-3 text-sm font-medium"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          Filtros
        </button>
      </div>
      {filtersOpen ? (
        <div className="grid gap-3 rounded-2xl border border-line bg-surface p-3">
          <label className="grid gap-1 text-sm">
            Marca
            <select
              className="min-h-11 rounded-xl border border-line bg-bg px-3"
              value={brand ?? ''}
              onChange={(event) => usePreferences.getState().setBrand(event.target.value || null)}
            >
              <option value="">Todas</option>
              {brands.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Precio máximo (€/L)
            <input
              inputMode="decimal"
              className="min-h-11 rounded-xl border border-line bg-bg px-3"
              placeholder="Sin límite"
              value={maxPrice ?? ''}
              onChange={(event) => {
                const normalized = event.target.value.replace(',', '.').trim()
                if (!normalized) {
                  usePreferences.getState().setMaxPrice(null)
                  return
                }
                const value = Number(normalized)
                if (Number.isFinite(value)) usePreferences.getState().setMaxPrice(value)
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
