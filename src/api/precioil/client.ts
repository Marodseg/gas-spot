import { readConfig } from '../../config/env'
import { mapHttpError, parseJson, PrecioilError } from './errors'

export interface PrecioilQuery {
  [key: string]: string | number | boolean | undefined
}

const TIMEOUT_MS = 12_000

export function precioilHeaders(apiKey: string): Headers {
  const headers = new Headers({ Accept: 'application/json' })
  if (apiKey) headers.set('X-API-Key', apiKey)
  return headers
}

export function buildPrecioilUrl(baseUrl: string, path: string, query?: PrecioilQuery): URL {
  const url = new URL(path.replace(/^\/+/, ''), `${baseUrl.replace(/\/+$/, '')}/`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url
}

export function precioilGet(path: string, query?: PrecioilQuery, signal?: AbortSignal): Promise<unknown> {
  return precioilRequest('GET', path, { query, signal })
}

export function precioilPost(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  return precioilRequest('POST', path, { body, signal })
}

async function precioilRequest(
  method: 'GET' | 'POST',
  path: string,
  options: { query?: PrecioilQuery; body?: unknown; signal?: AbortSignal },
): Promise<unknown> {
  const config = readConfig()
  const url = buildPrecioilUrl(config.baseUrl, path, options.query)
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const requestSignal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  const headers = precioilHeaders(config.apiKey)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: requestSignal,
    })
  } catch (error) {
    if (isAbort(error)) throw error
    if (isTimeout(error)) throw new PrecioilError('timeout', 'Tiempo de espera agotado.')
    throw new PrecioilError('network', 'No hay conexión con Precioil.')
  }

  const body = await readBody(response)
  if (!response.ok) {
    throw mapHttpError(response.status, body, response.headers.get('Retry-After'))
  }
  return body
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return parseJson(text)
  } catch {
    return null
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError'
}
