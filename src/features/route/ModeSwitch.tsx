import { LocateFixed, Route } from 'lucide-react'
import { usePreferences } from '../../stores/preferences'
import type { SearchMode } from '../../types/domain'
import { switchMode } from '../search/choose-place'

const MODES: { id: SearchMode; label: string; icon: typeof Route }[] = [
  { id: 'nearby', label: 'Cerca', icon: LocateFixed },
  { id: 'route', label: 'En ruta', icon: Route },
]

/** Segmented control: stations around a place, or along a trip. */
export function ModeSwitch() {
  const mode = usePreferences((state) => state.mode)
  return (
    <div role="radiogroup" aria-label="Dónde buscar" className="grid grid-cols-2 gap-1 rounded-full bg-raised p-1">
      {MODES.map((option) => {
        const Icon = option.icon
        const checked = mode === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={checked}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-body-sm font-semibold transition-colors duration-150 ${
              checked ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
            onClick={() => switchMode(option.id)}
          >
            <Icon aria-hidden className="size-4" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
