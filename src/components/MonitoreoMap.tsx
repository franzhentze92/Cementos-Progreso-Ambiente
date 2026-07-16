import { useEffect, useMemo } from 'react'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import type { MapSite } from '../data/agroMonitoreosReport'
import { formatNum } from '../data/agroMonitoreos'
import 'leaflet/dist/leaflet.css'

function FitSites({ sites }: { sites: MapSite[] }) {
  const map = useMap()
  useEffect(() => {
    if (!sites.length) return
    if (sites.length === 1) {
      map.setView([sites[0].lat, sites[0].lng], 14)
      return
    }
    const bounds = L.latLngBounds(sites.map((s) => [s.lat, s.lng]))
    map.fitBounds(bounds.pad(0.35))
  }, [map, sites])
  return null
}

function markerColor(site: MapSite): string {
  if (site.noCumple > 0) return '#c0392b'
  if (site.cumplePct != null && site.cumplePct >= 99) return '#047935'
  return '#d97706'
}

export function MonitoreoMap({ sites }: { sites: MapSite[] }) {
  const center = useMemo((): [number, number] => {
    if (!sites.length) return [14.71, -90.71]
    const lat = sites.reduce((s, p) => s + p.lat, 0) / sites.length
    const lng = sites.reduce((s, p) => s + p.lng, 0) / sites.length
    return [lat, lng]
  }, [sites])

  if (!sites.length) {
    return (
      <div className="agro-mon-map-empty">
        Sin coordenadas en el periodo. Captura latitud/longitud en la entrada.
      </div>
    )
  }

  return (
    <div className="agro-mon-map-wrap">
      <MapContainer
        center={center}
        zoom={13}
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
            radius={11}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: markerColor(site),
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <strong>{site.punto}</strong>
              <div>{site.sede}</div>
              <div>{site.tipoAgua}</div>
              <div>Último: {site.fechaLatest}</div>
              <div>
                {site.withValue}/{site.params} con valor · cumplimiento{' '}
                {site.cumplePct == null
                  ? '—'
                  : `${formatNum(site.cumplePct, 0)}%`}
              </div>
              {site.noCumple > 0 ? (
                <div style={{ color: '#c0392b' }}>
                  {site.noCumple} no cumplen
                </div>
              ) : null}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="agro-mon-map-legend">
        <span>
          <i style={{ background: '#047935' }} /> Cumple 100%
        </span>
        <span>
          <i style={{ background: '#d97706' }} /> Parcial
        </span>
        <span>
          <i style={{ background: '#c0392b' }} /> Con incumplimientos
        </span>
      </div>
    </div>
  )
}
