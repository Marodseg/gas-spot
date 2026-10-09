import { LoaderCircle, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { searchPlaces } from '../../api/geocode'
import { useSession } from '../../stores/session'
import type { Place } from '../../types/domain'
import { choosePlace, requestLocation } from './choose-place'

const MIN_QUERY = 2

interface PlaceSearchProps {
  /** Floating over the map (mobile) gets an elevated surface. */
  floating?: boolean
}

export function PlaceSearch({ floating = false }: PlaceSearchProps) {
  const origin = useSession((state) => state.origin)
  const locating = useSession((state) => state.locating)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [result, setResult] = useState<{ query: string; places: Place[]; failed: boolean }>({
    query: '',
    places: [],
    failed: false,
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const debounced = useDebounced(query, 300)
  const queryKey = debounced.trim()
  const typed = query.trim()
  const settled = result.query === queryKey && queryKey === typed
  // Keep the previous suggestions on screen while the next query resolves.
  const results = typed.length >= MIN_QUERY && result.query.length >= MIN_QUERY ? result.places : []
  const searching = typed.length >= MIN_QUERY && !settled
  const showPanel = open && typed.length >= MIN_QUERY

  useEffect(() => {
    if (queryKey.length < MIN_QUERY) return undefined
    const controller = new AbortController()
    void searchPlaces(queryKey, origin ?? undefined, controller.signal)
      .then((places) => {
        setActive(0)
        setResult({ query: queryKey, places, failed: false })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setResult({ query: queryKey, places: [], failed: true })
      })
    return () => controller.abort()
  }, [queryKey, origin])

  function select(place: Place) {
    choosePlace(place)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Buscar ciudad, dirección o código postal
      </label>
      <div
        className={`flex h-12 items-center gap-2 rounded-full border bg-surface pr-1 pl-4 transition-shadow duration-150 focus-within:border-accent ${
          floating ? 'border-transparent shadow-md' : 'border-line-strong'
        }`}
      >
        {searching ? (
          <LoaderCircle aria-hidden className="size-4.5 shrink-0 animate-spin text-muted" />
        ) : (
          <Search aria-hidden className="size-4.5 shrink-0 text-muted" />
        )}
        <input
          ref={inputRef}
          id={`${listId}-input`}
          role="combobox"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && results[active] ? `${listId}-${active}` : undefined}
          value={query}
          placeholder={origin ? origin.label : 'Buscar ciudad o dirección'}
          className={`h-full min-w-0 flex-1 bg-transparent text-body outline-none [&::-webkit-search-cancel-button]:hidden ${
            origin ? 'font-medium placeholder:text-ink' : 'placeholder:text-subtle'
          }`}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
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
        {query ? (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-ink/6"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={locating ? 'Buscando tu ubicación' : 'Usar mi ubicación'}
            title="Usar mi ubicación"
            disabled={locating}
            className={`grid size-10 shrink-0 place-items-center rounded-full hover:bg-ink/6 disabled:opacity-60 ${
              origin?.source === 'geolocation' ? 'text-accent' : 'text-muted'
            }`}
            onClick={() => void requestLocation()}
          >
            {locating ? (
              <LoaderCircle aria-hidden className="size-4.5 animate-spin" />
            ) : (
              <LocateFixed aria-hidden className="size-4.5" />
            )}
          </button>
        )}
      </div>
      {showPanel ? (
        <div className="animate-fade-up absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-md border border-line bg-surface shadow-lg">
          {results.length > 0 ? (
            <ul id={listId} role="listbox" aria-label="Lugares" className="scroll-area max-h-72 overflow-auto p-1">
              {results.map((place, index) => (
                <li
                  key={`${place.label}-${place.latitude}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-body ${
                    index === active ? 'bg-raised' : ''
                  }`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(place)}
                >
                  <MapPin aria-hidden className="size-4 shrink-0 text-muted" />
                  <span className="truncate">{place.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p id={listId} role="status" className="px-4 py-3 text-body-sm text-muted">
              {searching ? 'Buscando…' : result.failed ? 'No hemos podido buscar. Revisa tu conexión.' : 'Sin coincidencias en España.'}
            </p>
          )}
        </div>
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
