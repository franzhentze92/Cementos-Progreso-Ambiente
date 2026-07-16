import { useEffect, useMemo } from 'react'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import type { CapMapSite } from '../data/agroCapacitacionesReport'
import 'leaflet/dist/leaflet.css'

function FitSites({ sites }: { sites: CapMapSite[] }) {
  const map = useMap()
  useEffect(() => {
    if (!sites.length) return
    if (sites.length === 1) {
      map.setView([sites[0].lat, sites[0].lng], 11)
      return
    }
    const bounds = L.latLngBounds(sites.map((s) => [s.lat, s.lng]))
    map.fitBounds(bounds.pad(0.4))
  }, [map, sites])
  return null
}

function markerColor(site: CapMapSite): string {
  if (site.reprogramado > 0) return '#d97706'
  if (site.ejecutado >= site.programado) return '#047935'
  return '#3b82f6'
}

export function CapacitacionesMap({ sites }: { sites: CapMapSite[] }) {
  const center = useMemo((): [number, number] => {
    if (!sites.length) return [14.75, -90.5]
    const lat = sites.reduce((s, p) => s + p.lat, 0) / sites.length
    const lng = sites.reduce((s, p) => s + p.lng, 0) / sites.length
    return [lat, lng]
  }, [sites])

  if (!sites.length) {
    return (
      <div className="agro-mon-map-empty">
        Sin coordenadas de sedes en el periodo.
      </div>
    )
  }

  return (
    <div className="agro-mon-map-wrap">
      <MapContainer
        center={center}
        zoom={9}
        className="agro-mon-map"
        scrollWheelZoom={false}
        dragging
      >
        <TileLayer
          attribution="Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <FitSites sites={sites} />
        {sites.map((site) => (
          <CircleMarker
            key={site.id}
            center={[site.lat, site.lng]}
            radius={12}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: markerColor(site),
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <strong>{site.sede}</strong>
              <div>{site.total} capacitación(es)</div>
              <div>Ejecutado: {site.ejecutado}</div>
              <div>Programado: {site.programado}</div>
              <div>Reprogramado: {site.reprogramado}</div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="agro-mon-map-legend">
        <span>
          <i style={{ background: '#047935' }} /> Ejecución fuerte
        </span>
        <span>
          <i style={{ background: '#3b82f6' }} /> Más programadas
        </span>
        <span>
          <i style={{ background: '#d97706' }} /> Con reprogramación
        </span>
      </div>
    </div>
  )
}
