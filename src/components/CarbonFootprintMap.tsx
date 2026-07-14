import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { PLANT_EMISSIONS } from '../data/carbonFootprint'
import 'leaflet/dist/leaflet.css'

function FitPlants() {
  const map = useMap()
  const plants = useMemo(() => PLANT_EMISSIONS, [])

  useEffect(() => {
    if (plants.length === 0) return
    const bounds = L.latLngBounds(plants.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds.pad(0.25))
  }, [map, plants])

  return null
}

function emissionIcon(intensity: number, status: string) {
  const color =
    status === 'Crítico'
      ? '#b45309'
      : status === 'Atención'
        ? '#ca8a04'
        : '#047935'
  const size = Math.max(14, Math.min(28, Math.round(intensity / 28)))

  return L.divIcon({
    className: 'carbon-marker',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.45);
      opacity:.92;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function CarbonFootprintMap() {
  return (
    <div className="carbon-map-wrap">
      <MapContainer
        center={[14, -86]}
        zoom={5}
        className="carbon-map"
        scrollWheelZoom={false}
        dragging
        zoomControl={false}
      >
        <TileLayer
          attribution="Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <FitPlants />
        {PLANT_EMISSIONS.map((plant) => (
          <Marker
            key={plant.id}
            position={[plant.lat, plant.lng]}
            icon={emissionIcon(plant.intensity, plant.status)}
          >
            <Popup>
              <strong>{plant.name}</strong>
              <br />
              {plant.country} · {plant.tco2e.toLocaleString('es-GT')} ktCO₂e
              <br />
              Intensidad: {plant.intensity} kgCO₂/t
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="carbon-map-legend">
        <span>
          <i className="dot ok" /> En meta
        </span>
        <span>
          <i className="dot warn" /> Atención
        </span>
        <span>
          <i className="dot crit" /> Crítico
        </span>
        <Link to="/mapa">Mapa operativo →</Link>
      </div>
    </div>
  )
}
