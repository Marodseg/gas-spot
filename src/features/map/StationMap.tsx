import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapSourceDataEvent,
} from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson'
import { useEffect, useRef } from 'react'
import type { Place, RouteOption, SearchMode } from '../../types/domain'
import { haversineKm, zoomForRadius } from '../../utils/distance'
import { formatPrice } from '../../utils/format'
import type { RankedStation } from '../../utils/ranking'
import { clusterHtml, clusterLabel, markerHtml, markerLabel } from './markers'

setWorkerUrl(maplibreWorkerUrl)

const SPAIN = { latitude: 40.2, longitude: -3.6 }
// OpenFreeMap: OpenStreetMap vector tiles without an API key. Positron is a
// quiet basemap so the price pins carry the colour; Dark is its night twin.
const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const
const STATIONS = 'stations'
const RADIUS = 'search-radius'
const ROUTES = 'routes'
/** Above this zoom every station is drawn on its own. */
const CLUSTER_MAX_ZOOM = 14

/** Pixels of the map covered by floating UI (top bar, bottom sheet). */
export interface MapInsets {
  top: number
  bottom: number
}

interface StationMapProps {
  origin: Place | null
  mode: SearchMode
  routes: RouteOption[]
  routeIndex: number
  /** Route mode: end of the trip. */
  destination: Place | null
  onSelectRoute: (index: number) => void
  stations: RankedStation[]
  selectedId: number | null
  radiusKm: number
  dark: boolean
  insets: MapInsets
  /** False until the floating UI has been measured, so the first framing accounts for it. */
  insetsReady: boolean
  showZoom: boolean
  onSelect: (id: number) => void
  onSearchHere: (point: { latitude: number; longitude: number } | null) => void
}

interface MarkerEntry {
  marker: Marker
  html: string
}

/** Latest props, read by MapLibre event handlers that are registered once. */
interface Live {
  origin: Place | null
  mode: SearchMode
  routes: RouteOption[]
  routeIndex: number
  onSelectRoute: (index: number) => void
  radiusKm: number
  dark: boolean
  insets: MapInsets
  selectedId: number | null
  byId: Map<number, RankedStation>
  onSelect: (id: number) => void
  onSearchHere: (point: { latitude: number; longitude: number } | null) => void
}

export function StationMap({
  origin,
  mode,
  routes,
  routeIndex,
  destination,
  onSelectRoute,
  stations,
  selectedId,
  radiusKm,
  dark,
  insets,
  insetsReady,
  showZoom,
  onSelect,
  onSearchHere,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef(new Map<string, MarkerEntry>())
  const originMarkerRef = useRef<Marker | null>(null)
  const signatureRef = useRef('')
  const lastFlyRef = useRef('')
  const destinationMarkerRef = useRef<Marker | null>(null)
  const live = useRef<Live>({
    origin,
    mode,
    routes,
    routeIndex,
    onSelectRoute,
    radiusKm,
    dark,
    insets,
    selectedId,
    byId: new Map(),
    onSelect,
    onSearchHere,
  })
  useEffect(() => {
    Object.assign(live.current, {
      origin,
      mode,
      routes,
      routeIndex,
      onSelectRoute,
      radiusKm,
      dark,
      insets,
      selectedId,
      onSelect,
      onSearchHere,
    })
  })

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    const initial = live.current
    const center = initial.origin ?? SPAIN
    const map = new MapLibreMap({
      container,
      style: initial.dark ? STYLES.dark : STYLES.light,
      center: [center.longitude, center.latitude],
      zoom: initial.origin ? radiusZoom(initial.radiusKm) : 5,
      attributionControl: { compact: true },
      fadeDuration: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    map.touchZoomRotate.disableRotation()
    mapRef.current = map
    const markers = markersRef.current
    const sync = () => syncMarkers(map, markers, live.current)

    // Only moves the user makes (drag, wheel, pinch) offer "Buscar en esta zona";
    // programmatic moves such as revealing a selected station do not.
    let userMoved = false
    map.on('movestart', (event) => {
      if (event.originalEvent) userMoved = true
    })
    map.on('moveend', () => {
      sync()
      const current = live.current
      if (!current.origin) {
        current.onSearchHere(null)
        return
      }
      if (!userMoved) return
      userMoved = false
      const middle = visibleCenter(map, current.insets)
      const moved = haversineKm(current.origin, { latitude: middle.lat, longitude: middle.lng })
      current.onSearchHere(
        moved > Math.max(0.6, current.radiusKm * 0.45) ? { latitude: middle.lat, longitude: middle.lng } : null,
      )
    })
    // Tapping a greyed-out alternative selects it.
    map.on('click', `${ROUTES}-alt`, (event) => {
      const index = numberOf(event.features?.[0]?.properties?.index)
      if (index !== null) live.current.onSelectRoute(index)
    })
    map.on('mouseenter', `${ROUTES}-alt`, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', `${ROUTES}-alt`, () => {
      map.getCanvas().style.cursor = ''
    })
    map.on('sourcedata', (event: MapSourceDataEvent) => {
      if (event.sourceId === STATIONS && event.isSourceLoaded) sync()
    })
    // Runs on the first load and after every theme switch (setStyle drops sources and layers).
    map.on('style.load', () => {
      addLayers(map, live.current)
      const stations = [...live.current.byId.values()]
      if (!setStationData(map, stations)) return
      // Data that arrived before the style is drawn now: remember it, or an emptied list would look unchanged.
      signatureRef.current = stationSignature(stations)
      sync()
    })

    return () => {
      markers.clear()
      originMarkerRef.current = null
      destinationMarkerRef.current = null
      // A new map instance (StrictMode remount, layout switch) must be framed again.
      lastFlyRef.current = ''
      signatureRef.current = ''
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !showZoom) return undefined
    const control = new NavigationControl({ showCompass: false })
    map.addControl(control, 'bottom-right')
    return () => {
      // On unmount the map may already be destroyed by the effect above; removing then throws.
      if (mapRef.current === map) map.removeControl(control)
    }
  }, [showZoom])

  const styleRef = useRef(dark)
  useEffect(() => {
    const map = mapRef.current
    if (!map || styleRef.current === dark) return
    styleRef.current = dark
    map.setStyle(dark ? STYLES.dark : STYLES.light)
  }, [dark])

  // Frame the search area once the floating UI is measured, centred in the uncovered part.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !insetsReady) return
    if (mode === 'route') {
      // Routes frame themselves; coming back to nearby must fly again.
      if (lastFlyRef.current !== '') lastFlyRef.current = 'route'
      return
    }
    const center = origin ?? SPAIN
    const zoom = origin ? radiusZoom(radiusKm) : 5
    const key = `${center.latitude.toFixed(4)}:${center.longitude.toFixed(4)}:${zoom}`
    if (lastFlyRef.current === key) return
    const first = lastFlyRef.current === ''
    lastFlyRef.current = key
    const shift = (live.current.insets.bottom - live.current.insets.top) / 2
    if (first || prefersReducedMotion()) {
      // Opening the app: no animation to watch, so place the camera directly.
      map.jumpTo({ center: [center.longitude, center.latitude], zoom })
      map.panBy([0, shift], { duration: 0 })
      return
    }
    map.flyTo({
      center: [center.longitude, center.latitude],
      zoom,
      offset: visibleOffset(live.current.insets),
      duration: prefersReducedMotion() ? 0 : 500,
      essential: true,
    })
  }, [origin, radiusKm, insetsReady, mode])

  // Origin dot and search radius.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!origin) {
      originMarkerRef.current?.remove()
      originMarkerRef.current = null
    } else if (originMarkerRef.current) {
      originMarkerRef.current.setLngLat([origin.longitude, origin.latitude])
    } else {
      const element = document.createElement('span')
      element.className = 'origin-dot'
      element.setAttribute('aria-hidden', 'true')
      originMarkerRef.current = new Marker({ element }).setLngLat([origin.longitude, origin.latitude]).addTo(map)
    }
    const source = map.getSource(RADIUS)
    if (isGeoJson(source)) source.setData(radiusData(mode === 'nearby' ? origin : null, radiusKm))
  }, [origin, radiusKm, mode])

  // Destination pin of the trip.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!destination) {
      destinationMarkerRef.current?.remove()
      destinationMarkerRef.current = null
      return
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setLngLat([destination.longitude, destination.latitude])
      return
    }
    const element = document.createElement('span')
    element.className = 'destination-pin'
    element.setAttribute('aria-hidden', 'true')
    element.innerHTML = DESTINATION_GLYPH
    destinationMarkerRef.current = new Marker({ element, anchor: 'bottom' })
      .setLngLat([destination.longitude, destination.latitude])
      .addTo(map)
  }, [destination])

  // Route lines; a newly chosen route is framed between the floating UI.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource(ROUTES)
    if (isGeoJson(source)) source.setData(routesData(mode === 'route' ? routes : [], routeIndex))
    const route = mode === 'route' ? routes[routeIndex] : undefined
    if (!route || route.line.length < 2) return
    const { top, bottom } = live.current.insets
    let [west, south, east, north] = [180, 90, -180, -90]
    for (const [lng, lat] of route.line) {
      west = Math.min(west, lng)
      east = Math.max(east, lng)
      south = Math.min(south, lat)
      north = Math.max(north, lat)
    }
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: { top: top + 32, bottom: bottom + 32, left: 40, right: 40 }, duration: prefersReducedMotion() ? 0 : 600 },
    )
  }, [routes, routeIndex, mode])

  // Station data: pushed only when something drawn changed (the list is re-ranked every minute).
  useEffect(() => {
    live.current.byId = new Map(stations.map((item) => [item.station.id, item]))
    const signature = stationSignature(stations)
    if (signature === signatureRef.current) return
    const map = mapRef.current
    if (!map || !setStationData(map, stations)) return
    signatureRef.current = signature
    // sourcedata does not always fire for an emptied source; idle always does, so stale pins go away.
    map.once('idle', () => syncMarkers(map, markersRef.current, live.current))
  }, [stations])

  // Selection: repaint the affected pins and bring the selected one into the uncovered area.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    syncMarkers(map, markersRef.current, live.current)
    revealSelected(map, markersRef.current, live.current)
  }, [selectedId])

  // The sheet may rise after a selection (collapsed → half): keep the selected pin uncovered.
  useEffect(() => {
    const map = mapRef.current
    if (map) revealSelected(map, markersRef.current, live.current)
  }, [insets.top, insets.bottom])

  return <div ref={containerRef} className="h-full w-full" role="region" aria-label="Mapa de gasolineras" />
}

/** What a pin shows; a list re-ranked with the same signature needs no redraw. */
function stationSignature(stations: readonly RankedStation[]): string {
  return stations.map((item) => `${item.station.id}:${item.price}:${item.band}:${item.isBest}:${item.openStatus}`).join('|')
}

function addLayers(map: MapLibreMap, current: Live) {
  if (!map.getSource(RADIUS)) {
    map.addSource(RADIUS, {
      type: 'geojson',
      data: radiusData(current.mode === 'nearby' ? current.origin : null, current.radiusKm),
    })
    const color = current.dark ? '#4cc7ad' : '#0b6b5a'
    map.addLayer({ id: `${RADIUS}-fill`, type: 'fill', source: RADIUS, paint: { 'fill-color': color, 'fill-opacity': 0.04 } })
    map.addLayer({
      id: `${RADIUS}-line`,
      type: 'line',
      source: RADIUS,
      paint: { 'line-color': color, 'line-opacity': 0.45, 'line-width': 1, 'line-dasharray': [3, 4] },
    })
  }
  if (!map.getSource(ROUTES)) {
    map.addSource(ROUTES, {
      type: 'geojson',
      data: routesData(current.mode === 'route' ? current.routes : [], current.routeIndex),
    })
    map.addLayer({
      id: `${ROUTES}-alt`,
      type: 'line',
      source: ROUTES,
      filter: ['==', ['get', 'selected'], false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': current.dark ? '#5d6762' : '#a8a29a', 'line-width': 5, 'line-opacity': 0.8 },
    })
    map.addLayer({
      id: `${ROUTES}-casing`,
      type: 'line',
      source: ROUTES,
      filter: ['==', ['get', 'selected'], true],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': current.dark ? '#04211b' : '#ffffff', 'line-width': 8 },
    })
    map.addLayer({
      id: `${ROUTES}-line`,
      type: 'line',
      source: ROUTES,
      filter: ['==', ['get', 'selected'], true],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': current.dark ? '#4cc7ad' : '#0b6b5a', 'line-width': 5 },
    })
  }
  if (!map.getSource(STATIONS)) {
    map.addSource(STATIONS, {
      type: 'geojson',
      data: emptyCollection(),
      cluster: true,
      clusterRadius: 44,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      // Each cluster carries its cheapest price, so a zoomed-out map still answers "where is it cheap".
      clusterProperties: { minPrice: ['min', ['get', 'price']] },
    })
    // Invisible layer: querySourceFeatures only returns features of sources that are drawn.
    map.addLayer({ id: `${STATIONS}-anchor`, type: 'circle', source: STATIONS, paint: { 'circle-radius': 1, 'circle-opacity': 0 } })
  }
}

/** Returns false while the style (and so the source) is not ready yet. */
function setStationData(map: MapLibreMap, stations: readonly RankedStation[]): boolean {
  const source = map.getSource(STATIONS)
  if (!isGeoJson(source)) return false
  source.setData({
    type: 'FeatureCollection',
    features: stations.map((item) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [item.station.longitude, item.station.latitude] },
      properties: { id: item.station.id, price: item.price },
    })),
  })
  return true
}

/** Keeps one HTML marker per visible station or cluster, reusing elements between frames. */
function syncMarkers(map: MapLibreMap, markers: Map<string, MarkerEntry>, current: Live) {
  if (!map.getSource(STATIONS) || !map.isSourceLoaded(STATIONS)) return
  const seen = new Set<string>()
  for (const feature of map.querySourceFeatures(STATIONS)) {
    if (feature.geometry.type !== 'Point') continue
    const [longitude, latitude] = feature.geometry.coordinates
    if (longitude === undefined || latitude === undefined) continue
    const props: Record<string, unknown> = feature.properties ?? {}
    const clusterId = numberOf(props.cluster_id)
    const isCluster = props.cluster === true && clusterId !== null

    let key: string
    let html: string
    let label: string
    let zIndex = '1'
    if (isCluster) {
      const minPrice = numberOf(props.minPrice)
      const count = numberOf(props.point_count) ?? 0
      const cheapest = minPrice === null ? null : formatPrice(minPrice)
      key = `c-${clusterId}`
      html = clusterHtml(cheapest, count)
      label = clusterLabel(cheapest, count)
    } else {
      const id = numberOf(props.id)
      const item = id === null ? undefined : current.byId.get(id)
      if (id === null || !item) continue
      const selected = id === current.selectedId
      key = `s-${id}`
      html = markerHtml(item, selected)
      label = markerLabel(item)
      zIndex = selected ? '3' : item.isBest ? '2' : '1'
    }
    if (seen.has(key)) continue
    seen.add(key)

    const entry = markers.get(key)
    if (entry) {
      entry.marker.setLngLat([longitude, latitude])
      const element = entry.marker.getElement()
      if (entry.html !== html) {
        element.innerHTML = html
        entry.html = html
      }
      element.setAttribute('aria-label', label)
      element.style.zIndex = zIndex
      continue
    }

    const element = document.createElement('button')
    element.type = 'button'
    element.className = isCluster ? 'reposta-cluster' : 'price-marker'
    element.innerHTML = html
    element.setAttribute('aria-label', label)
    element.style.zIndex = zIndex
    element.addEventListener('click', (event) => {
      event.stopPropagation()
      if (isCluster && clusterId !== null) expandCluster(map, clusterId, [longitude, latitude])
      else current.onSelect(Number(key.slice(2)))
    })
    const marker = new Marker({ element, anchor: isCluster ? 'center' : 'bottom' }).setLngLat([longitude, latitude]).addTo(map)
    markers.set(key, { marker, html })
  }
  for (const [key, entry] of markers) {
    if (seen.has(key)) continue
    entry.marker.remove()
    markers.delete(key)
  }
}

function expandCluster(map: MapLibreMap, clusterId: number, center: [number, number]) {
  const source = map.getSource(STATIONS)
  if (!isGeoJson(source)) return
  void source.getClusterExpansionZoom(clusterId).then((zoom) => {
    map.easeTo({ center, zoom, duration: prefersReducedMotion() ? 0 : 350 })
  })
}

/**
 * Moves the map only when the selected station is off-screen, under the
 * floating UI or hidden inside a cluster; otherwise the map stays still.
 */
function revealSelected(map: MapLibreMap, markers: Map<string, MarkerEntry>, current: Live) {
  const id = current.selectedId
  const item = id === null ? undefined : current.byId.get(id)
  if (id === null || !item) return
  const lngLat: [number, number] = [item.station.longitude, item.station.latitude]
  const point = map.project(lngLat)
  const { clientWidth: width, clientHeight: height } = map.getContainer()
  const { top, bottom } = current.insets
  const inside = point.x >= 48 && point.x <= width - 48 && point.y >= top + 72 && point.y <= height - bottom - 48
  const drawn = markers.has(`s-${id}`)
  if (inside && drawn) return
  // Inside but not drawn means it sits in a cluster: zoom just past clustering.
  const zoom = inside && !drawn ? Math.max(map.getZoom(), CLUSTER_MAX_ZOOM + 1) : map.getZoom()
  map.easeTo({ center: lngLat, zoom, offset: visibleOffset(current.insets), duration: prefersReducedMotion() ? 0 : 300 })
  if (!inside) {
    // Once centred, a station still hidden in a cluster needs the extra zoom.
    map.once('moveend', () => {
      if (current.selectedId === id && !markers.has(`s-${id}`) && map.getZoom() <= CLUSTER_MAX_ZOOM) {
        map.easeTo({ center: lngLat, zoom: CLUSTER_MAX_ZOOM + 1, offset: visibleOffset(current.insets), duration: prefersReducedMotion() ? 0 : 300 })
      }
    })
  }
}

function visibleCenter(map: MapLibreMap, insets: MapInsets) {
  const { clientWidth: width, clientHeight: height } = map.getContainer()
  return map.unproject([width / 2, insets.top + (height - insets.top - insets.bottom) / 2])
}

/** Shifts a camera target from the container centre to the middle of the uncovered area. */
function visibleOffset(insets: MapInsets): [number, number] {
  return [0, (insets.top - insets.bottom) / 2]
}

/** MapLibre zooms are defined for 512 px tiles: one level less than the 256 px scale of `zoomForRadius`. */
function radiusZoom(radiusKm: number): number {
  return zoomForRadius(radiusKm) - 1
}

function radiusData(origin: Place | null, radiusKm: number): FeatureCollection<Polygon> {
  if (!origin) return { type: 'FeatureCollection', features: [] }
  const steps = 72
  const latRadius = radiusKm / 110.574
  const lngRadius = radiusKm / (111.32 * Math.cos((origin.latitude * Math.PI) / 180))
  const ring: [number, number][] = []
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2
    ring.push([origin.longitude + lngRadius * Math.cos(angle), origin.latitude + latRadius * Math.sin(angle)])
  }
  const circle: Feature<Polygon> = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} }
  return { type: 'FeatureCollection', features: [circle] }
}

/** The selected route is drawn last so it sits on top of the alternatives. */
function routesData(routes: readonly RouteOption[], selected: number): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = routes.map((route, index) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: route.line },
    properties: { index, selected: index === selected },
  }))
  features.sort((left, right) => Number(left.properties?.selected) - Number(right.properties?.selected))
  return { type: 'FeatureCollection', features }
}

/** Lucide "map-pin", filled. */
const DESTINATION_GLYPH =
  '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" stroke="var(--surface)" stroke-width="1.5">' +
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>' +
  '<circle cx="12" cy="10" r="3" fill="var(--surface)" stroke="none"/></svg>'

function emptyCollection(): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: [] }
}

function isGeoJson(source: unknown): source is GeoJSONSource {
  return typeof source === 'object' && source !== null && 'setData' in source && 'getClusterExpansionZoom' in source
}

function numberOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
