import { usePreferences } from '../../stores/preferences'
import type { ThemePreference } from '../../types/domain'
import { Button } from '../../components/ui/Button'

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
  { id: 'system', label: 'Sistema' },
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ajustes</h2>
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Apariencia</legend>
        <div role="radiogroup" aria-label="Tema" className="flex gap-2">
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={theme === option.id}
              className={`min-h-11 flex-1 rounded-full text-sm font-semibold ${theme === option.id ? 'bg-ink text-bg' : 'border border-line'}`}
              onClick={() => usePreferences.getState().setTheme(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-1 text-sm font-semibold">
        ¿Cuánto vas a repostar?
        <input
          type="number"
          min={5}
          max={150}
          inputMode="numeric"
          className="min-h-11 rounded-xl border border-line bg-bg px-3 font-normal"
          value={liters}
          onChange={(event) => usePreferences.getState().setLiters(Number(event.target.value))}
        />
        <span className="font-normal text-muted">Litros. Sirve solo para estimar el ahorro.</span>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Consumo del vehículo
        <input
          type="number"
          min={2}
          max={20}
          step={0.1}
          inputMode="decimal"
          className="min-h-11 rounded-xl border border-line bg-bg px-3 font-normal"
          value={consumption}
          onChange={(event) => usePreferences.getState().setConsumption(Number(event.target.value))}
        />
        <span className="font-normal text-muted">Litros a los 100 km. Valor de partida: 6,5.</span>
      </label>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">
        Contar ida y vuelta
        <input
          type="checkbox"
          className="size-5 accent-current"
          checked={roundTrip}
          onChange={(event) => usePreferences.getState().setRoundTrip(event.target.checked)}
        />
      </label>
      <p className="text-xs leading-relaxed text-muted">
        El precio por litro sale de Precioil. El coste del desvío es una estimación local: kilómetros de más
        respecto a la gasolinera más cercana, valorados a su precio. No incluye peajes ni tráfico.
      </p>
    </div>
  )
}
