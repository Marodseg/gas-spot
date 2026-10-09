import { ChevronLeft, Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { usePreferences } from '../../stores/preferences'
import type { ThemePreference } from '../../types/domain'

const THEMES: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Oscuro', icon: Moon },
  { id: 'system', label: 'Sistema', icon: Monitor },
]

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const theme = usePreferences((state) => state.theme)
  const liters = usePreferences((state) => state.liters)
  const consumption = usePreferences((state) => state.consumptionLitersPer100Km)
  const roundTrip = usePreferences((state) => state.roundTrip)

  return (
    <section className="animate-fade-up space-y-6" aria-labelledby="settings-title">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="-ml-2" aria-label="Volver al listado" onClick={onClose}>
          <ChevronLeft aria-hidden className="size-5" />
        </Button>
        <h2 id="settings-title" className="text-heading font-semibold tracking-tight">
          Ajustes
        </h2>
      </header>

      <fieldset>
        <legend className="text-body-sm font-semibold">Apariencia</legend>
        <div role="radiogroup" aria-label="Tema" className="mt-2 grid grid-cols-3 gap-1 rounded-full bg-raised p-1">
          {THEMES.map((option) => {
            const Icon = option.icon
            const checked = theme === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={checked}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-body-sm font-semibold transition-colors duration-150 ${
                  checked ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
                onClick={() => usePreferences.getState().setTheme(option.id)}
              >
                <Icon aria-hidden className="size-4" />
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-body-sm font-semibold">Cálculo del ahorro</legend>
        <NumberField
          label="Litros por repostaje"
          unit="L"
          min={5}
          max={150}
          step={1}
          value={liters}
          onChange={(value) => usePreferences.getState().setLiters(value)}
        />
        <NumberField
          label="Consumo del vehículo"
          unit="L/100 km"
          min={2}
          max={20}
          step={0.1}
          value={consumption}
          onChange={(value) => usePreferences.getState().setConsumption(value)}
        />
        <label className="flex min-h-11 cursor-pointer items-start justify-between gap-3 text-body">
          <span>
            Vuelvo al punto de partida
            <span id="round-trip-help" className="mt-0.5 block text-caption text-muted">
              Cuenta el desvío dos veces: ir a la gasolinera y volver. Déjalo apagado si repostas de camino.
            </span>
          </span>
          <input
            type="checkbox"
            aria-describedby="round-trip-help"
            className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
            checked={roundTrip}
            onChange={(event) => usePreferences.getState().setRoundTrip(event.target.checked)}
          />
        </label>
      </fieldset>

      <p className="text-caption leading-relaxed text-muted">
        Los precios son los oficiales publicados por las gasolineras (vía Precioil). El desvío es una estimación:
        los kilómetros de más frente a la gasolinera más cercana, medidos en línea recta desde el punto de
        búsqueda (tu ubicación o el lugar buscado), sin peajes ni tráfico.
      </p>
    </section>
  )
}

function NumberField({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  unit: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  // Draft text so intermediate values ("4" on the way to "40") are not clamped mid-typing.
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="flex items-center justify-between gap-3 text-body">
      {label}
      <span className="flex h-11 w-36 items-center rounded-sm border border-line-strong bg-surface px-3 focus-within:border-accent">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          inputMode="decimal"
          className="tabular min-w-0 flex-1 bg-transparent text-right outline-none"
          value={draft ?? String(value)}
          onChange={(event) => {
            setDraft(event.target.value)
            const next = Number(event.target.value.replace(',', '.'))
            if (event.target.value !== '' && next >= min && next <= max) onChange(next)
          }}
          onBlur={() => setDraft(null)}
        />
        <span className="ml-1.5 text-body-sm text-muted">{unit}</span>
      </span>
    </label>
  )
}
