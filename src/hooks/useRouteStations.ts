import { useEffect } from 'react'
import { searchAlongRoute } from '../api/precioil/corridor'
import { describePrecioilError, isPrecioilError } from '../api/precioil/errors'
import { searchRoutes } from '../api/precioil/routes'
import { usePreferences } from '../stores/preferences'
import { useSession } from '../stores/session'
import type { AppError } from '../types/domain'
import { appError } from '../utils/messages'

/** Route mode: loads the driving alternatives, then the stations along the chosen one. */
export function useRouteStations(): void {
  const mode = usePreferences((state) => state.mode)
  const from = usePreferences((state) => state.routeFrom)
  const to = usePreferences((state) => state.routeTo)
  const routes = useSession((state) => state.routes)
  const routeIndex = useSession((state) => state.routeIndex)
  const retryToken = useSession((state) => state.retryToken)
  const route = routes[routeIndex] ?? null

  useEffect(() => {
    if (mode !== 'route' || !from || !to) return undefined
    const controller = new AbortController()
    useSession.getState().setRoutesLoading()
    void searchRoutes(from, to, controller.signal)
      .then((found) => {
        if (controller.signal.aborted) return
        if (found.length === 0) useSession.getState().setRouteError(noRoute(null))
        else useSession.getState().setRoutes(found)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) useSession.getState().setRouteError(routeError(error))
      })
    return () => controller.abort()
  }, [mode, from, to, retryToken])

  useEffect(() => {
    if (mode !== 'route' || !route) return undefined
    const controller = new AbortController()
    const session = useSession.getState()
    session.setLoading(true)
    void searchAlongRoute(
      route,
      (progress) => {
        if (!controller.signal.aborted) useSession.getState().setCorridorProgress(progress)
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return
        useSession.getState().setStations(result.stations)
        useSession.getState().setCorridorProgress(null, result.failedStretches)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        useSession.getState().setCorridorProgress(null)
        useSession.getState().setError(
          isPrecioilError(error) ? appError(error.code, describePrecioilError(error)) : appError('network'),
        )
      })
    return () => controller.abort()
  }, [mode, route])
}

function routeError(error: unknown): AppError {
  if (!isPrecioilError(error)) return appError('network', error instanceof Error ? error.message : String(error))
  const detail = describePrecioilError(error)
  if (error.code === 'rate_limit') {
    return {
      code: 'rate_limit',
      title: 'Rutas agotadas por hoy',
      message: 'El servicio de rutas tiene un cupo diario y ya se ha usado. Vuelve mañana o busca cerca de un lugar.',
      detail,
    }
  }
  if (error.code === 'invalid_response' || error.code === 'not_found') return noRoute(detail)
  return appError(error.code, detail)
}

function noRoute(detail: string | null): AppError {
  return {
    code: 'not_found',
    title: 'No hay ruta por carretera',
    message: 'No encontramos un trayecto entre esos dos puntos. Prueba con otro origen o destino.',
    detail,
  }
}
