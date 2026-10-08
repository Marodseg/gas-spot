import type { AppErrorCode } from '../types/domain'
import { assertNever } from './assert'

export function messageFor(code: AppErrorCode): string {
  switch (code) {
    case 'unauthorized':
      return 'La clave de la API no es válida. Revisa que sea una browser key de Precioil autorizada para este dominio.'
    case 'not_found':
      return 'No hemos encontrado esa gasolinera.'
    case 'rate_limit':
      return 'La API ha limitado temporalmente las consultas. Espera unos segundos.'
    case 'timeout':
      return 'La consulta ha tardado demasiado. Inténtalo de nuevo.'
    case 'network':
      return 'No hemos podido conectar con Precioil. Revisa tu conexión e inténtalo de nuevo.'
    case 'invalid_response':
      return 'La respuesta de la API está incompleta. Inténtalo de nuevo.'
    case 'server':
      return 'No hemos podido cargar las gasolineras. Inténtalo de nuevo.'
    case 'geolocation_denied':
      return 'No hemos podido obtener tu ubicación. Puedes buscar una ciudad manualmente.'
    case 'geolocation_unavailable':
      return 'Tu navegador no ha podido determinar la ubicación. Busca una ciudad o una dirección.'
    default:
      return assertNever(code)
  }
}
