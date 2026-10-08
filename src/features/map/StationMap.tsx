import L from 'leaflet'
import 'leaflet.markercluster'
import { useEffect, useRef } from 'react'
import { Circle, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Place } from '../../types/domain'
import { formatPrice } from '../../utils/format'
import type { RankedStation } from '../../utils/ranking'
import { haversineKm, zoomForRadius } from '../../utils/distance'

const SPAIN = { latitude: 40.2, longitude: -3.6 }
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

interface StationMapProps {
  origin: Place | null
  stations: RankedStation[]
  selectedId: number | null
  radiusKm: number
  dark: boolean
  onSelect: (id: number) => void
  onSearchHere: (point: { latitude: number; longitude: number } | null) => void
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
  const center = origin ?? SPAIN
  const zoom = origin ? zoomForRadius(radiusKm) : 6

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={zoom}
      zoomControl={false}
      className="h-full w-full"
      aria-label="Mapa de gasolineras"
    >
      <TileLayer
        key={dark ? 'dark' : 'light'}
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url={dark ? DARK_TILES : LIGHT_TILES}
      />
      <FlyTo latitude={center.latitude} longitude={center.longitude} zoom={zoom} />
      <MoveWatcher origin={origin} radiusKm={radiusKm} onSearchHere={onSearchHere} />
      {origin ? (
        <Circle
          center={[origin.latitude, origin.longitude]}
          radius={40}
          pathOptions={{ color: '#0c6b5c', weight: 2, fillColor: '#0c6b5c', fillOpacity: 0.2 }}
        />
      ) : null}
      <StationMarkers stations={stations} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  )
}

function FlyTo({ latitude, longitude, zoom }: { latitude: number; longitude: number; zoom: number }) {
  const map = useMap()
  const last = useRef('')
  useEffect(() => {
    const key = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${zoom}`
    if (last.current === key) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    last.current = key
    map.flyTo([latitude, longitude], zoom, { duration: reduce ? 0 : 0.55 })
  }, [latitude, longitude, zoom, map])
  return null
}

function MoveWatcher({
  origin,
  radiusKm,
  onSearchHere,
}: {
  origin: Place | null
  radiusKm: number
  onSearchHere: (point: { latitude: number; longitude: number } | null) => void
}) {
  const map = useMap()
  useMapEvents({
    moveend() {
      if (!origin) {
        onSearchHere(null)
        return
      }
      const center = map.getCenter()
      const moved = haversineKm(origin, { latitude: center.lat, longitude: center.lng })
      if (moved > Math.max(0.45, radiusKm * 0.35)) {
        onSearchHere({ latitude: center.lat, longitude: center.lng })
      } else {
        onSearchHere(null)
      }
    },
  })
  return null
}

function StationMarkers({
  stations,
  selectedId,
  onSelect,
}: {
  stations: RankedStation[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const map = useMap()
  const groupRef = useRef<L.MarkerClusterGroup | null>(null)

  useEffect(() => {
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 46,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction(cluster) {
        return L.divIcon({
          className: 'reposta-cluster',
          html: `<span>${cluster.getChildCount()}</span>`,
          iconSize: L.point(40, 40),
        })
      },
    })
    groupRef.current = group
    map.addLayer(group)
    return () => {
      map.removeLayer(group)
    }
  }, [map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()
    for (const item of stations) {
      const selected = item.station.id === selectedId
      const marker = L.marker([item.station.latitude, item.station.longitude], {
        keyboard: true,
        title: `${item.station.brand}, ${formatPrice(item.price)}, ${item.bandLabel}`,
        zIndexOffset: selected ? 800 : 0,
        icon: L.divIcon({
          className: 'price-marker-icon',
          html: `<div class="price-marker" data-band="${item.band}" data-selected="${selected ? 'true' : 'false'}"><span>${formatPrice(item.price)}</span></div>`,
          iconSize: [96, 30],
          iconAnchor: [48, 30],
        }),
      })
      marker.on('click', () => onSelect(item.station.id))
      group.addLayer(marker)
    }
  }, [stations, selectedId, onSelect])

  return null
}
