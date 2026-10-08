import { Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource, type MapSourceDataEvent } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { FeatureCollection, Point } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

setWorkerUrl(maplibreWorkerUrl)
import type { Place } from '../../types/domain'
import { formatPrice } from '../../utils/format'
import type { RankedStation } from '../../utils/ranking'
import { haversineKm, zoomForRadius } from '../../utils/distance'

const SPAIN = { latitude: 40.2, longitude: -3.6 }
const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark'
const SOURCE_ID = 'stations'
const ANCHOR_LAYER_ID = 'stations-anchor'

interface StationMapProps {
  origin: Place | null
  stations: RankedStation[]
  selectedId: number | null
  radiusKm: number
  dark: boolean
  onSelect: (id: number) => void
  onSearchHere: (point: { latitude: number; longitude: number } | null) => void
}

interface MapSnapshot {
  stations: RankedStation[]
  selectedId: number | null
  origin: Place | null
  radiusKm: number
  onSelect: (id: number) => void
  onSearchHere: (point: { latitude: number; longitude: number } | null) => void
}

interface MarkerFields {
  cluster: unknown
  clusterId: unknown
  pointCount: unknown
  pointCountLabel: unknown
  id: unknown
  price: unknown
  band: unknown
  title: unknown
}

export function StationMap({
  origin,
  stations,
  selectedId,
  radiusKm,
  dark,
  onSelect,
  onSearchHere,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map())
  const originMarkerRef = useRef<Marker | null>(null)
  const styleRef = useRef(dark ? DARK_STYLE : LIGHT_STYLE)
  const snapshotRef = useRef<MapSnapshot>({
    stations,
    selectedId,
    origin,
    radiusKm,
    onSelect,
    onSearchHere,
  })
  useEffect(() => {
    snapshotRef.current = { stations, selectedId, origin, radiusKm, onSelect, onSearchHere }
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const snapshot = snapshotRef.current
    const center = snapshot.origin ?? SPAIN
    const map = new MapLibreMap({
      container,
      style: styleRef.current,
      center: [center.longitude, center.latitude],
      zoom: snapshot.origin ? zoomForRadius(snapshot.radiusKm) : 6,
      attributionControl: { compact: true },
      fadeDuration: 0,
    })
    mapRef.current = map

    const refreshMarkers = () => {
      syncStationMarkers(map, markersRef.current, snapshotRef)
    }
    const onMoveEnd = () => {
      const current = snapshotRef.current
      if (!current.origin) {
        current.onSearchHere(null)
        return
      }
      const point = map.getCenter()
      const moved = haversineKm(current.origin, { latitude: point.lat, longitude: point.lng })
      if (moved > Math.max(0.45, current.radiusKm * 0.35)) {
        current.onSearchHere({ latitude: point.lat, longitude: point.lng })
      } else {
        current.onSearchHere(null)
      }
      refreshMarkers()
    }

    map.on('moveend', onMoveEnd)
    map.on('sourcedata', (event: MapSourceDataEvent) => {
      if (event.sourceId !== SOURCE_ID || !event.isSourceLoaded) return
      refreshMarkers()
    })
    map.on('style.load', () => {
      mountStationSource(map, snapshotRef.current.stations)
      placeOriginMarker(map, originMarkerRef, snapshotRef.current.origin)
      refreshMarkers()
    })

    const observer = new ResizeObserver(() => {
      map.resize()
    })
    observer.observe(container)
    const markers = markersRef.current

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      markers.clear()
      originMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const nextStyle = dark ? DARK_STYLE : LIGHT_STYLE
    if (!map || styleRef.current === nextStyle) return
    styleRef.current = nextStyle
    clearMarkers(markersRef.current)
    map.setStyle(nextStyle)
  }, [dark])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const center = origin ?? SPAIN
    const zoom = origin ? zoomForRadius(radiusKm) : 6
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.flyTo({
      center: [center.longitude, center.latitude],
      zoom,
      duration: reduceMotion ? 0 : 550,
      essential: true,
    })
    if (map.isStyleLoaded()) placeOriginMarker(map, originMarkerRef, origin)
  }, [origin, radiusKm])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const source = map.getSource(SOURCE_ID)
    if (!isGeoJsonSource(source)) {
      mountStationSource(map, stations)
      return
    }
    source.setData(toCollection(stations))
    syncStationMarkers(map, markersRef.current, snapshotRef)
  }, [stations, selectedId])

  return <div ref={containerRef} className="h-full w-full" role="region" aria-label="Mapa de gasolineras" />
}

function mountStationSource(map: MapLibreMap, stations: readonly RankedStation[]) {
  if (map.getSource(SOURCE_ID)) return
  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: toCollection(stations),
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 16,
  })
  map.addLayer({
    id: ANCHOR_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    paint: {
      'circle-radius': 1,
      'circle-opacity': 0,
    },
  })
}

function toCollection(stations: readonly RankedStation[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: stations.map((item) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [item.station.longitude, item.station.latitude],
      },
      properties: {
        id: item.station.id,
        price: formatPrice(item.price),
        band: item.band,
        title: `${item.station.brand}, ${formatPrice(item.price)}, ${item.bandLabel}`,
      },
    })),
  }
}

function syncStationMarkers(
  map: MapLibreMap,
  markers: globalThis.Map<string, Marker>,
  snapshotRef: { readonly current: MapSnapshot },
) {
  if (!map.getSource(SOURCE_ID) || !map.isSourceLoaded(SOURCE_ID)) return
  const seen = new Set<string>()
  for (const feature of map.querySourceFeatures(SOURCE_ID)) {
    const geometry = feature.geometry
    if (geometry.type !== 'Point') continue
    const [longitude, latitude] = geometry.coordinates
    if (longitude === undefined || latitude === undefined) continue
    const fields = markerFields(feature.properties)
    const clustered = isCluster(fields.cluster)
    const identity = asNumber(clustered ? fields.clusterId : fields.id)
    if (identity === null) continue
    const key = clustered ? `c-${identity}` : `s-${identity}`
    if (seen.has(key)) continue
    seen.add(key)

    const existing = markers.get(key)
    const element = buttonElement(existing)
    if (!element) continue
    if (!existing) {
      element.type = 'button'
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        if (element.dataset.kind === 'cluster') {
          expandCluster(map, element)
          return
        }
        const stationId = Number(element.dataset.id)
        if (Number.isFinite(stationId)) snapshotRef.current.onSelect(stationId)
      })
    }

    element.dataset.lng = String(longitude)
    element.dataset.lat = String(latitude)
    if (clustered) {
      const count = asNumber(fields.pointCount) ?? 0
      element.dataset.kind = 'cluster'
      element.dataset.clusterId = String(identity)
      element.className = 'reposta-cluster'
      element.textContent = asText(fields.pointCountLabel) || String(count)
      element.setAttribute('aria-label', `${count} gasolineras`)
    } else {
      element.dataset.kind = 'station'
      element.dataset.id = String(identity)
      paintPriceMarker(element, fields, snapshotRef.current.selectedId)
    }

    if (existing) {
      existing.setLngLat([longitude, latitude])
      continue
    }
    const marker = new Marker({
      element,
      anchor: clustered ? 'center' : 'bottom',
    })
      .setLngLat([longitude, latitude])
      .addTo(map)
    markers.set(key, marker)
  }

  for (const [key, marker] of markers) {
    if (seen.has(key)) continue
    marker.remove()
    markers.delete(key)
  }
}

function buttonElement(existing: Marker | undefined): HTMLButtonElement | null {
  if (!existing) return document.createElement('button')
  const element = existing.getElement()
  return element instanceof HTMLButtonElement ? element : null
}

function expandCluster(map: MapLibreMap, element: HTMLButtonElement) {
  const source = map.getSource(SOURCE_ID)
  const clusterId = Number(element.dataset.clusterId)
  const longitude = Number(element.dataset.lng)
  const latitude = Number(element.dataset.lat)
  if (!isGeoJsonSource(source) || !Number.isFinite(clusterId) || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return
  }
  void source.getClusterExpansionZoom(clusterId).then((zoom) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.easeTo({
      center: [longitude, latitude],
      zoom,
      duration: reduceMotion ? 0 : 400,
    })
  })
}

function paintPriceMarker(element: HTMLButtonElement, fields: MarkerFields, selectedId: number | null) {
  const id = asNumber(fields.id)
  const band = asText(fields.band) || 'unknown'
  const selected = id !== null && id === selectedId
  element.className = 'price-marker'
  element.dataset.band = band
  element.dataset.selected = selected ? 'true' : 'false'
  element.textContent = asText(fields.price)
  element.setAttribute('aria-label', asText(fields.title) || 'Gasolinera')
  element.style.zIndex = selected ? '4' : '1'
}

function placeOriginMarker(
  map: MapLibreMap,
  markerRef: { current: Marker | null },
  origin: Place | null,
) {
  if (!origin) {
    markerRef.current?.remove()
    markerRef.current = null
    return
  }
  const marker = markerRef.current
  if (!marker) {
    const element = document.createElement('div')
    element.className = 'origin-dot'
    element.setAttribute('aria-hidden', 'true')
    markerRef.current = new Marker({ element }).setLngLat([origin.longitude, origin.latitude]).addTo(map)
    return
  }
  marker.setLngLat([origin.longitude, origin.latitude])
}

function clearMarkers(markers: globalThis.Map<string, Marker>) {
  for (const marker of markers.values()) marker.remove()
  markers.clear()
}

function isGeoJsonSource(source: unknown): source is GeoJSONSource {
  return typeof source === 'object' && source !== null && 'setData' in source && 'getClusterExpansionZoom' in source
}

function markerFields(properties: object | null): MarkerFields {
  return {
    cluster: field(properties, 'cluster'),
    clusterId: field(properties, 'cluster_id'),
    pointCount: field(properties, 'point_count'),
    pointCountLabel: field(properties, 'point_count_abbreviated'),
    id: field(properties, 'id'),
    price: field(properties, 'price'),
    band: field(properties, 'band'),
    title: field(properties, 'title'),
  }
}

function field(source: object | null, key: string): unknown {
  if (!source || !Object.prototype.hasOwnProperty.call(source, key)) return undefined
  const record = source as Record<string, unknown>
  return record[key]
}

function isCluster(value: unknown): boolean {
  return value === true || value === 1
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}
