import L from 'leaflet'
import 'leaflet.markercluster'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Pane, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import type { Place } from '../../types/domain'
import { formatPrice } from '../../utils/format'
import type { RankedStation } from '../../utils/ranking'
import { haversineKm, zoomForRadius } from '../../utils/distance'
import { markerHtml, markerLabel, clusterHtml, originIcon } from './markers'

const SPAIN = { latitude: 40.2, longitude: -3.6 }

// Esri's Canvas basemaps are keyless and come in matching light and dark
// versions. Base and labels are separate layers so the labels can sit above
// the search radius but below the price pins.
const TILE_ROOT = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
const TILES = {
  light: {
    base: `${TILE_ROOT}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${TILE_ROOT}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
  dark: {
    base: `${TILE_ROOT}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${TILE_ROOT}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
} as const
const ATTRIBUTION = 'Mapa &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap'

/** Pixels of the map covered by floating UI (top bar, bottom sheet). */
export interface MapInsets {
  top: number
  bottom: number
}

interface StationMapProps {
  origin: Place | null
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

export function StationMap({
  origin,
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
  const center = origin ?? SPAIN
  const zoom = origin ? zoomForRadius(radiusKm) : 6
  const tiles = dark ? TILES.dark : TILES.light

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={zoom}
      zoomControl={false}
      className="h-full w-full"
      aria-label="Mapa de gasolineras. Usa el listado para navegar con teclado."
    >
      <TileLayer key={`base-${dark}`} attribution={ATTRIBUTION} url={tiles.base} maxZoom={19} maxNativeZoom={16} />
      <Pane name="labels" style={{ zIndex: 450 }} className="leaflet-labels-pane">
        <TileLayer key={`labels-${dark}`} url={tiles.labels} maxZoom={19} maxNativeZoom={16} />
      </Pane>
      {showZoom ? <ZoomControl position="bottomright" zoomInText="+" zoomOutText="−" /> : null}
      <SizeWatcher />
      <FlyTo latitude={center.latitude} longitude={center.longitude} zoom={zoom} insets={insets} ready={insetsReady} />
      <MoveWatcher origin={origin} radiusKm={radiusKm} insets={insets} onSearchHere={onSearchHere} />
      {origin ? (
        <>
          <Circle
            center={[origin.latitude, origin.longitude]}
            radius={radiusKm * 1000}
            interactive={false}
            pathOptions={{
              color: dark ? '#4cc7ad' : '#0b6b5a',
              weight: 1,
              opacity: 0.35,
              dashArray: '4 6',
              fillOpacity: dark ? 0.04 : 0.03,
            }}
          />
          <Marker
            position={[origin.latitude, origin.longitude]}
            icon={originIcon}
            interactive={false}
            keyboard={false}
            zIndexOffset={-1000}
            title={origin.label}
          />
        </>
      ) : null}
      <StationMarkers stations={stations} selectedId={selectedId} insets={insets} onSelect={onSelect} />
    </MapContainer>
  )
}

/** Leaflet only measures its container on window resize; the panel layout can change it too. */
function SizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Latitude/longitude that puts `target` in the middle of the uncovered part of the map. */
function visibleCenter(map: L.Map, target: L.LatLng, zoom: number, insets: MapInsets): L.LatLng {
  const shift = (insets.bottom - insets.top) / 2
  if (Math.abs(shift) < 1) return target
  const point = map.project(target, zoom).add([0, shift])
  return map.unproject(point, zoom)
}

function FlyTo({
  latitude,
  longitude,
  zoom,
  insets,
  ready,
}: {
  latitude: number
  longitude: number
  zoom: number
  insets: MapInsets
  ready: boolean
}) {
  const map = useMap()
  const last = useRef('')
  const insetsRef = useRef(insets)
  useEffect(() => {
    insetsRef.current = insets
  })
  useEffect(() => {
    if (!ready) return
    const key = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${zoom}`
    if (last.current === key) return
    last.current = key
    const target = visibleCenter(map, L.latLng(latitude, longitude), zoom, insetsRef.current)
    if (prefersReducedMotion()) map.setView(target, zoom, { animate: false })
    else map.flyTo(target, zoom, { duration: 0.5 })
  }, [latitude, longitude, zoom, map, ready])
  return null
}

function MoveWatcher({
  origin,
  radiusKm,
  insets,
  onSearchHere,
}: {
  origin: Place | null
  radiusKm: number
  insets: MapInsets
  onSearchHere: (point: { latitude: number; longitude: number } | null) => void
}) {
  const map = useMap()
  // Only moves the user makes (drag, wheel, pinch, double tap) offer "Buscar en esta zona";
  // programmatic moves such as revealing a selected station do not.
  const userMoved = useRef(false)

  useEffect(() => {
    const container = map.getContainer()
    const markUser = () => {
      userMoved.current = true
    }
    const onTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) markUser()
    }
    container.addEventListener('wheel', markUser, { passive: true })
    container.addEventListener('dblclick', markUser)
    container.addEventListener('touchstart', onTouch, { passive: true })
    map.on('dragstart', markUser)
    return () => {
      container.removeEventListener('wheel', markUser)
      container.removeEventListener('dblclick', markUser)
      container.removeEventListener('touchstart', onTouch)
      map.off('dragstart', markUser)
    }
  }, [map])

  useMapEvents({
    moveend() {
      if (!origin) {
        onSearchHere(null)
        return
      }
      if (!userMoved.current) return
      userMoved.current = false
      // Measure from the middle of the uncovered area, where FlyTo places the origin.
      const size = map.getSize()
      const center = map.containerPointToLatLng([size.x / 2, insets.top + (size.y - insets.top - insets.bottom) / 2])
      const moved = haversineKm(origin, { latitude: center.lat, longitude: center.lng })
      if (moved > Math.max(0.6, radiusKm * 0.45)) {
        onSearchHere({ latitude: center.lat, longitude: center.lng })
      } else {
        onSearchHere(null)
      }
    },
  })
  return null
}

const markerPrices = new WeakMap<L.Marker, number>()

function StationMarkers({
  stations,
  selectedId,
  insets,
  onSelect,
}: {
  stations: RankedStation[]
  selectedId: number | null
  insets: MapInsets
  onSelect: (id: number) => void
}) {
  const map = useMap()
  const groupRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersRef = useRef(new Map<number, { marker: L.Marker; item: RankedStation }>())
  const selectedRef = useRef<number | null>(null)
  const signatureRef = useRef('')
  // Bumped only when the markers really change, so selection effects do not rerun every clock tick.
  const [markersVersion, setMarkersVersion] = useState(0)
  const onSelectRef = useRef(onSelect)
  const insetsRef = useRef(insets)
  useEffect(() => {
    onSelectRef.current = onSelect
    insetsRef.current = insets
  })

  useEffect(() => {
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 15,
      iconCreateFunction(cluster) {
        const prices = cluster.getAllChildMarkers().flatMap((child) => {
          const price = markerPrices.get(child)
          return price === undefined ? [] : [price]
        })
        const cheapest = prices.length > 0 ? Math.min(...prices) : null
        return L.divIcon({
          className: 'reposta-cluster',
          html: clusterHtml(cheapest === null ? null : formatPrice(cheapest), cluster.getChildCount()),
          iconSize: L.point(0, 0),
        })
      },
    })
    groupRef.current = group
    signatureRef.current = ''
    map.addLayer(group)
    return () => {
      map.removeLayer(group)
      groupRef.current = null
    }
  }, [map])

  // Rebuild markers only when the result set changes; selection is patched below.
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    // The list is re-ranked every minute for opening hours; skip identical rebuilds.
    const signature = stations
      .map((item) => `${item.station.id}:${item.price}:${item.band}:${item.isBest}:${item.openStatus}`)
      .join('|')
    if (signature === signatureRef.current) return
    signatureRef.current = signature
    const markers = new Map<number, { marker: L.Marker; item: RankedStation }>()
    const layers: L.Marker[] = []
    for (const item of stations) {
      const selected = item.station.id === selectedRef.current
      const marker = L.marker([item.station.latitude, item.station.longitude], {
        keyboard: true,
        title: markerLabel(item),
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : item.isBest ? 500 : 0,
        icon: L.divIcon({ className: 'price-marker-icon', html: markerHtml(item, selected), iconSize: L.point(0, 0) }),
      })
      markerPrices.set(marker, item.price)
      marker.on('click', () => onSelectRef.current(item.station.id))
      markers.set(item.station.id, { marker, item })
      layers.push(marker)
    }
    group.clearLayers()
    group.addLayers(layers)
    markersRef.current = markers
    setMarkersVersion((version) => version + 1)
  }, [stations])

  const revealSelected = useCallback(() => {
    const id = selectedRef.current
    const marker = id === null ? null : markersRef.current.get(id)?.marker
    if (!marker || groupRef.current?.getVisibleParent(marker) !== marker) return
    const { top, bottom } = insetsRef.current
    map.panInside(marker.getLatLng(), {
      paddingTopLeft: [48, top + 72],
      paddingBottomRight: [48, bottom + 48],
      animate: !prefersReducedMotion(),
      duration: 0.25,
    })
  }, [map])

  useEffect(() => {
    const markers = markersRef.current
    const previous = selectedRef.current
    selectedRef.current = selectedId
    if (previous !== null && previous !== selectedId) {
      const entry = markers.get(previous)
      if (entry) {
        entry.marker.setIcon(L.divIcon({ className: 'price-marker-icon', html: markerHtml(entry.item, false), iconSize: L.point(0, 0) }))
        entry.marker.setZIndexOffset(entry.item.isBest ? 500 : 0)
      }
    }
    if (selectedId === null) return
    const entry = markers.get(selectedId)
    const group = groupRef.current
    if (!entry || !group) return
    entry.marker.setIcon(L.divIcon({ className: 'price-marker-icon', html: markerHtml(entry.item, true), iconSize: L.point(0, 0) }))
    entry.marker.setZIndexOffset(1000)
    // A clustered marker has no element yet: zoom just enough to show it first.
    if (group.getVisibleParent(entry.marker) !== entry.marker) group.zoomToShowLayer(entry.marker, () => revealSelected())
    else revealSelected()
  }, [selectedId, markersVersion, revealSelected])

  // The sheet may rise after a selection (collapsed → half); keep the selected pin uncovered.
  useEffect(() => {
    revealSelected()
  }, [insets.top, insets.bottom, revealSelected])

  return null
}
