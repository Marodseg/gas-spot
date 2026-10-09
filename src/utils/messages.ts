import type { AppError, AppErrorCode } from '../types/domain'
import { assertNever } from './assert'

export interface ErrorCopy {
  title: string
  message: string
}

/** User-facing copy for each failure. Technical detail travels separately in `AppError.detail`. */
export function copyFor(code: AppErrorCode): ErrorCopy {
  switch (code) {
    case 'unauthorized':
      return {
        title: 'Servicio no disponible',
        message: 'Ahora mismo no podemos consultar los precios desde esta web. Inténtalo más tarde.',
      }
    case 'not_found':
      return { title: 'Sin resultados', message: 'No hemos encontrado esa gasolinera.' }
    case 'rate_limit':
      return { title: 'Demasiadas consultas', message: 'Espera unos segundos y vuelve a intentarlo.' }
    case 'timeout':
      return { title: 'La consulta ha tardado demasiado', message: 'Puede ser la conexión. Vuelve a intentarlo.' }
    case 'network':
      return { title: 'Sin conexión', message: 'Revisa tu conexión a internet y vuelve a intentarlo.' }
    case 'invalid_response':
    case 'server':
      return { title: 'No hemos podido cargar los precios', message: 'El servicio de precios ha fallado. Vuelve a intentarlo.' }
    case 'geolocation_denied':
      return {
        title: 'Ubicación desactivada',
        message: 'Busca una ciudad o dirección, o permite la ubicación en tu navegador.',
      }
    case 'geolocation_unavailable':
      return { title: 'No encontramos tu ubicación', message: 'Busca una ciudad, dirección o código postal.' }
    default:
      return assertNever(code)
  }
}

export function appError(code: AppErrorCode, detail: string | null = null): AppError {
  return { code, ...copyFor(code), detail }
}
