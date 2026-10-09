import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { SheetSnap } from '../../stores/session'

interface BottomSheetProps {
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  /** Pixels of the sheet visible on screen, so the map can keep its focus above it. */
  onVisibleHeightChange: (height: number) => void
  /** Always visible part: summary and quick filters. Drag starts here. */
  header: ReactNode
  children: ReactNode
  label: string
  scrollRef?: RefObject<HTMLDivElement | null>
}

const SNAPS: SheetSnap[] = ['collapsed', 'half', 'full']
const DRAG_THRESHOLD = 6
/** px/ms above which a release counts as a flick. */
const FLICK_VELOCITY = 0.6
/** Smallest peek, so a collapsed detail still shows its title. */
const MIN_COLLAPSED = 112

/**
 * Map-style bottom sheet. The sheet is always full height and slides with a
 * transform (cheap to animate); the scroll area gets bottom padding equal to
 * the hidden part so the end of the list stays reachable at every snap.
 */
export function BottomSheet({ snap, onSnapChange, onVisibleHeightChange, header, children, label, scrollRef }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const [metrics, setMetrics] = useState({ height: 0, header: 0, safeBottom: 0 })
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  // The click that follows a drag's pointerup must not toggle the sheet or press a chip.
  const suppressClickUntil = useRef(0)
  const stopDrag = useRef<(() => void) | null>(null)

  // Never leave window listeners behind if the sheet unmounts mid-drag (e.g. rotating to desktop width).
  useEffect(() => () => stopDrag.current?.(), [])

  useLayoutEffect(() => {
    const measure = () =>
      setMetrics({
        height: sheetRef.current?.offsetHeight ?? 0,
        header: headerRef.current?.offsetHeight ?? 0,
        safeBottom: probeRef.current?.offsetHeight ?? 0,
      })
    measure()
    const observer = new ResizeObserver(measure)
    if (sheetRef.current) observer.observe(sheetRef.current)
    if (headerRef.current) observer.observe(headerRef.current)
    return () => observer.disconnect()
  }, [])

  const visibleFor = useCallback(
    (target: SheetSnap) => {
      const collapsed = Math.max(MIN_COLLAPSED, metrics.header) + metrics.safeBottom
      if (target === 'collapsed') return collapsed
      if (target === 'full') return metrics.height
      return Math.max(collapsed, Math.round(metrics.height * 0.52))
    },
    [metrics],
  )

  const translate = dragOffset ?? metrics.height - visibleFor(snap)

  useEffect(() => {
    if (metrics.height > 0) onVisibleHeightChange(visibleFor(snap))
  }, [metrics, snap, visibleFor, onVisibleHeightChange])

  function settle(position: number, velocity: number) {
    // A flick moves exactly one snap in its direction; a slow release picks the nearest snap.
    if (Math.abs(velocity) > FLICK_VELOCITY) {
      const index = SNAPS.indexOf(snap)
      const next = SNAPS[Math.max(0, Math.min(SNAPS.length - 1, index + (velocity < 0 ? 1 : -1)))]
      if (next) onSnapChange(next)
      return
    }
    let best: SheetSnap = snap
    let bestDistance = Number.POSITIVE_INFINITY
    for (const candidate of SNAPS) {
      const distance = Math.abs(metrics.height - visibleFor(candidate) - position)
      if (distance < bestDistance) {
        best = candidate
        bestDistance = distance
      }
    }
    onSnapChange(best)
  }

  const maxTranslate = metrics.height - visibleFor('collapsed')

  // Move/up are tracked on window: the finger leaves the header as soon as the drag starts.
  function startDrag(startX: number, startY: number, startTime: number) {
    const base = translate
    let active = false
    let lastY = startY
    let lastT = startTime
    let velocity = 0
    const move = (event: PointerEvent) => {
      const dy = event.clientY - startY
      if (!active) {
        if (Math.abs(dy) < DRAG_THRESHOLD || Math.abs(dy) < Math.abs(event.clientX - startX)) return
        active = true
      }
      const dt = Math.max(1, event.timeStamp - lastT)
      velocity = (event.clientY - lastY) / dt
      lastY = event.clientY
      lastT = event.timeStamp
      setDragOffset(base + dy)
    }
    const detach = () => {
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', end, true)
      window.removeEventListener('pointercancel', end, true)
      stopDrag.current = null
    }
    const end = (event: PointerEvent) => {
      detach()
      if (!active) return
      suppressClickUntil.current = event.timeStamp + 400
      setDragOffset(null)
      if (event.type === 'pointerup') settle(base + (event.clientY - startY), velocity)
    }
    stopDrag.current?.()
    stopDrag.current = detach
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', end, true)
    window.addEventListener('pointercancel', end, true)
  }

  return (
    <div
      ref={sheetRef}
      role="region"
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-[1000] flex flex-col rounded-t-lg bg-surface shadow-lg"
      onPointerDown={(event) => {
        // The header always drags; a collapsed sheet drags from anywhere visible.
        if (event.button !== 0) return
        if (snap !== 'collapsed' && !headerRef.current?.contains(event.target as Node)) return
        startDrag(event.clientX, event.clientY, event.timeStamp)
      }}
      onClick={(event) => {
        if (snap === 'collapsed' && event.timeStamp > suppressClickUntil.current && !headerRef.current?.contains(event.target as Node)) {
          onSnapChange('half')
        }
      }}
      style={{
        top: 'calc(env(safe-area-inset-top) + 8px)',
        transform: `translate3d(0, ${Math.max(0, Math.min(maxTranslate, translate))}px, 0)`,
        transition: dragOffset === null ? 'transform 260ms var(--ease-out-soft)' : 'none',
        visibility: metrics.height === 0 ? 'hidden' : undefined,
        // Collapsed, the whole visible strip is a drag handle: keep the browser from claiming the touch.
        touchAction: snap === 'collapsed' ? 'none' : undefined,
      }}
    >
      <div ref={probeRef} aria-hidden className="pointer-events-none invisible absolute" style={{ height: 'env(safe-area-inset-bottom)' }} />
      <div
        ref={headerRef}
        className="shrink-0 touch-pan-x"
        onClickCapture={(event) => {
          if (event.timeStamp > suppressClickUntil.current) return
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <button
          type="button"
          className="flex h-6 w-full cursor-grab items-center justify-center active:cursor-grabbing"
          aria-label={snap === 'full' ? 'Reducir panel' : 'Ampliar panel'}
          aria-expanded={snap !== 'collapsed'}
          onClick={() => onSnapChange(snap === 'collapsed' ? 'half' : snap === 'half' ? 'full' : 'half')}
        >
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </button>
        {header}
      </div>
      <div
        ref={scrollRef}
        inert={snap === 'collapsed'}
        className="scroll-area min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: Math.max(0, metrics.height - visibleFor(snap)) + metrics.safeBottom }}
      >
        {children}
      </div>
    </div>
  )
}
