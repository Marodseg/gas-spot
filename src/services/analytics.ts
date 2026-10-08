export interface AnalyticsEvent {
  name: string
  props?: Record<string, string | number | boolean>
}

type Listener = (event: AnalyticsEvent) => void

const listeners = new Set<Listener>()

export const analytics = {
  track(name: string, props?: AnalyticsEvent['props']): void {
    const event: AnalyticsEvent = props ? { name, props } : { name }
    for (const listener of listeners) listener(event)
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
