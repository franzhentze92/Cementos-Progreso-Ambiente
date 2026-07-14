import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { SITES } from '../data/locations'
import 'leaflet/dist/leaflet.css'

function FitSites() {
  const map = useMap()
  const operative = useMemo(
    () => SITES.filter((s) => s.status === 'Operativa' && s.type.includes('Planta')),
    [],
  )

  useEffect(() => {
    if (operative.length === 0) return
    const bounds = L.latLngBounds(operative.map((s) => [s.lat, s.lng]))
    map.fitBounds(bounds.pad(0.2))
  }, [map, operative])

  return null
}

function plantIcon(isCement: boolean) {
  const color = isCement ? '#047935' : '#d97706'
  return L.divIcon({
    className: 'progreso-marker',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

export function DashboardMap() {
  const plants = SITES.filter(
    (s) =>
      s.status === 'Operativa' &&
      (s.type === 'Planta de cemento' || s.type === 'Planta de concreto'),
  )

  return (
    <div className="dash-map-wrap">
      <MapContainer
        center={[13.5, -87]}
        zoom={5}
        className="dash-map"
        scrollWheelZoom={false}
        dragging
        zoomControl={false}
      >
        <TileLayer
          attribution="Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <FitSites />
        {plants.map((site) => (
          <Marker
            key={site.id}
            position={[site.lat, site.lng]}
            icon={plantIcon(site.type === 'Planta de cemento')}
          />
        ))}
      </MapContainer>
      <div className="dash-map-footer">
        <span>{plants.length} plantas operativas en el mapa</span>
        <Link to="/mapa">Ver mapa completo →</Link>
      </div>
    </div>
  )
}
