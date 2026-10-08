export interface AppConfig {
  apiKey: string
  baseUrl: string
}

const DEFAULT_BASE_URL = 'https://api.precioil.es'

export function readConfig(
  env: ImportMetaEnv = import.meta.env,
): AppConfig {
  const apiKey = typeof env.VITE_PRECIOIL_API_KEY === 'string' ? env.VITE_PRECIOIL_API_KEY.trim() : ''
  const rawBase = typeof env.VITE_PRECIOIL_BASE_URL === 'string' ? env.VITE_PRECIOIL_BASE_URL.trim() : ''
  return {
    apiKey,
    baseUrl: (rawBase || DEFAULT_BASE_URL).replace(/\/+$/, ''),
  }
}
