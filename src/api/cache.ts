interface CacheEntry {
  expiresAt: number
  value: unknown
}

export interface ResponseCache {
  fetch<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T>
  clear(): void
}

export function createCache(now: () => number = Date.now): ResponseCache {
  const values = new Map<string, CacheEntry>()
  const inflight = new Map<string, Promise<unknown>>()

  return {
    async fetch<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
      const cached = values.get(key)
      if (cached && cached.expiresAt > now()) return cached.value as T
      const pending = inflight.get(key)
      if (pending) return pending as Promise<T>
      const promise = loader()
        .then((value) => {
          values.set(key, { value, expiresAt: now() + ttlMs })
          inflight.delete(key)
          return value
        })
        .catch((error: unknown) => {
          inflight.delete(key)
          throw error
        })
      inflight.set(key, promise)
      return promise
    },
    clear() {
      values.clear()
      inflight.clear()
    },
  }
}

export const responseCache = createCache()
