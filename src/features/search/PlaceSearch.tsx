import { Search } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { searchPlaces } from '../../api/geocode'
import { useSession } from '../../stores/session'
import type { Place } from '../../types/domain'
import { choosePlace } from './choose-place'

export function PlaceSearch() {
  const origin = useSession((state) => state.origin)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [result, setResult] = useState<{ query: string; places: Place[]; error: string | null }>({
    query: '',
    places: [],
    error: null,
  })
  const listId = useId()
  const debounced = useDebounced(query, 350)
  const queryKey = debounced.trim()
  const results = result.query === queryKey ? result.places : []
  const error = result.query === queryKey ? result.error : null

  useEffect(() => {
    if (queryKey.length < 2) return undefined
    const controller = new AbortController()
    void searchPlaces(queryKey, origin ?? undefined, controller.signal)
      .then((places) => {
        setActive(0)
        setOpen(true)
        setResult({
          query: queryKey,
          places,
          error: places.length === 0 ? 'No hay coincidencias en España.' : null,
        })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setResult({ query: queryKey, places: [], error: 'No hemos podido buscar esa dirección.' })
      })
    return () => controller.abort()
  }, [queryKey, origin])

  function select(place: Place) {
    choosePlace(place)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Buscar ciudad, dirección o código postal
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 shadow-sm">
        <Search aria-hidden className="size-4 shrink-0 text-muted" />
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          placeholder={origin?.label ?? 'Ciudad, dirección o código postal'}
          className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((index) => Math.min(index + 1, Math.max(0, results.length - 1)))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((index) => Math.max(index - 1, 0))
            } else if (event.key === 'Enter' && results[active]) {
              event.preventDefault()
              select(results[active])
            } else if (event.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
      </div>
      {error ? <p className="px-2 pt-1 text-xs text-muted">{error}</p> : null}
      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-line bg-surface p-1 shadow-lg"
        >
          {results.map((place, index) => (
            <li key={`${place.label}-${place.latitude}`} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${index === active ? 'bg-bg' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => select(place)}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
