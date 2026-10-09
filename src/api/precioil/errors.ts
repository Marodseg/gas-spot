import type { AppErrorCode } from '../../types/domain'

export class PrecioilError extends Error {
  readonly code: AppErrorCode
  readonly status: number | null

  constructor(code: AppErrorCode, message: string, status: number | null = null) {
    super(message)
    this.name = 'PrecioilError'
    this.code = code
    this.status = status
  }
}

export function isPrecioilError(error: unknown): error is PrecioilError {
  return error instanceof PrecioilError
}

/** "HTTP 403 · unauthorized · El origen no esta autorizado…" for the technical-details disclosure. */
export function describePrecioilError(error: PrecioilError): string {
  return [error.status === null ? null : `HTTP ${error.status}`, error.code, error.message].filter(Boolean).join(' · ')
}

export function mapHttpError(status: number, body: unknown, retryAfter: string | null): PrecioilError {
  const detail = messageFromBody(body)
  if (status === 401 || status === 403) {
    return new PrecioilError('unauthorized', detail ?? 'API key no valida.', status)
  }
  if (status === 404) {
    return new PrecioilError('not_found', detail ?? 'No encontrado.', status)
  }
  if (status === 429) {
    const wait = retryAfter ? ` Vuelve a intentarlo en ${retryAfter} segundos.` : ''
    return new PrecioilError('rate_limit', `${detail ?? 'Demasiadas consultas.'}${wait}`, status)
  }
  if (status === 408) {
    return new PrecioilError('timeout', detail ?? 'Tiempo de espera agotado.', status)
  }
  if (status >= 500) {
    return new PrecioilError('server', detail ?? 'Error del servidor.', status)
  }
  return new PrecioilError('invalid_response', detail ?? 'La consulta no es válida.', status)
}

function messageFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  if ('message' in body && typeof body.message === 'string' && body.message.trim()) return body.message
  if ('errors' in body && Array.isArray(body.errors)) {
    const first = body.errors[0]
    if (first && typeof first === 'object' && 'msg' in first && typeof first.msg === 'string') return first.msg
  }
  return null
}

export function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown
}
