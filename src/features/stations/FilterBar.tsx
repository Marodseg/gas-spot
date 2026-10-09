import { Clock, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Chip, ChipSelect } from '../../components/ui/Chip'
import { usePreferences } from '../../stores/preferences'
import type { SortMode } from '../../types/domain'
import { formatPriceValue } from '../../utils/format'

const RADII = [2, 5, 10, 20, 30].map((radius) => ({ value: radius, label: `${radius} km` }))

const SORTS: { value: SortMode; label: string }[] = [
  { value: 'recommended', label: 'Recomendadas' },
  { value: 'price', label: 'Más baratas' },
  { value: 'distance', label: 'Más cercanas' },
]

interface FilterBarProps {
  brands: string[]
  activeFilters: number
}

export function FilterBar({ brands, activeFilters }: FilterBarProps) {
  const radiusKm = usePreferences((state) => state.radiusKm)
  const sort = usePreferences((state) => state.sort)
  const openNow = usePreferences((state) => state.openNow)
  const brand = usePreferences((state) => state.brand)
  const maxPrice = usePreferences((state) => state.maxPrice)
  const [moreOpen, setMoreOpen] = useState(false)
  const extraFilters = Number(brand !== null) + Number(maxPrice !== null)

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:-mx-5 md:px-5" role="group" aria-label="Filtros">
        <ChipSelect
          label="Ordenar"
          value={sort}
          options={SORTS}
          onChange={(value) => usePreferences.getState().setSort(value)}
        />
        <ChipSelect
          label="Distancia máxima"
          value={radiusKm}
          options={RADII}
          onChange={(value) => usePreferences.getState().setRadiusKm(value)}
        />
        <Chip active={openNow} onClick={() => usePreferences.getState().setOpenNow(!openNow)}>
          <Clock aria-hidden className="size-3.5" />
          Abiertas
        </Chip>
        <Chip active={extraFilters > 0 || moreOpen} aria-pressed={undefined} aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}>
          <SlidersHorizontal aria-hidden className="size-3.5" />
          {extraFilters > 0 ? `Filtros · ${extraFilters}` : 'Más filtros'}
        </Chip>
        {activeFilters > 0 ? (
          <Chip onClick={() => usePreferences.getState().clearFilters()} aria-label="Quitar filtros" className="text-muted">
            <RotateCcw aria-hidden className="size-3.5" />
            Quitar
          </Chip>
        ) : null}
      </div>
      {moreOpen ? (
        <div className="animate-fade-up grid grid-cols-2 gap-3 rounded-md border border-line bg-surface p-3">
          <label className="grid gap-1.5 text-caption font-semibold text-muted">
            Marca
            <select
              className="h-11 rounded-sm border border-line-strong bg-surface px-3 text-body font-normal text-ink"
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
          {/* Remount when cleared from outside so the draft resets too. */}
          <MaxPriceField key={maxPrice === null ? 'empty' : 'set'} value={maxPrice} />
        </div>
      ) : null}
    </div>
  )
}

/** Local draft so "1," can be typed before it becomes a number. */
function MaxPriceField({ value }: { value: number | null }) {
  const [draft, setDraft] = useState(value === null ? '' : formatPriceValue(value))
  return (
    <label className="grid gap-1.5 text-caption font-semibold text-muted">
      Precio máximo
      <span className="flex h-11 items-center rounded-sm border border-line-strong bg-surface px-3 focus-within:border-accent">
        <input
          inputMode="decimal"
          className="tabular min-w-0 flex-1 bg-transparent text-body font-normal text-ink outline-none placeholder:text-subtle"
          placeholder="Sin límite"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            const normalized = event.target.value.replace(',', '.').trim()
            if (!normalized) {
              usePreferences.getState().setMaxPrice(null)
              return
            }
            const next = Number(normalized)
            if (Number.isFinite(next)) usePreferences.getState().setMaxPrice(next)
          }}
        />
        <span className="text-body-sm font-normal text-muted">€/L</span>
      </span>
    </label>
  )
}
