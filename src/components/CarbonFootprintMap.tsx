import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import type { CarbonReport } from '../data/carbonReport'
import { ALICON_SITE } from '../data/carbonReport'
import 'leaflet/dist/leaflet.css'

function FitPlant({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView([lat, lng], 12)
  }, [map, lat, lng])

  return null
}

function plantIcon() {
  return L.divIcon({
    className: 'carbon-marker',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#047935;border:3px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,.45);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

const fmt = (n: number | null | undefined, d = 0) =>
  n == null
    ? '—'
    : n.toLocaleString('es-GT', { maximumFractionDigits: d })

type PlantSummary = CarbonReport['plantSummary']

export function CarbonFootprintMap({
  plantSummary,
}: {
  plantSummary?: PlantSummary
}) {
  const plant = plantSummary ?? {
    ...ALICON_SITE,
    plant: ALICON_SITE.name,
    year: '2026',
    periodLabel: '—',
    totalCement: 0,
    avgFactorPlanta: null,
    avgKwhPerTon: null,
    totalElec: 0,
    totalDiesel: 0,
    totalWater: 0,
    diversionRate: null,
    waterConfig: {
      disposicionResidual: '',
      puntosDescarga: '',
      metodosTratamiento: '',
    },
  }

  return (
    <div className="carbon-map-wrap">
      <MapContainer
        center={[plant.lat, plant.lng]}
        zoom={12}
        className="carbon-map"
        scrollWheelZoom={false}
        dragging
        zoomControl={false}
      >
        <TileLayer
          attribution="Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <FitPlant lat={plant.lat} lng={plant.lng} />
        <Marker position={[plant.lat, plant.lng]} icon={plantIcon()}>
          <Popup>
            <strong>{plant.name}</strong>
            <br />
            {plant.country} · {plant.type}
            <br />
            Periodo: {plant.periodLabel}
            <br />
            Cemento: {fmt(plant.totalCement)} t
            <br />
            Factor clinker: {fmt(plant.avgFactorPlanta, 1)}%
            <br />
            Intensidad eléctrica: {fmt(plant.avgKwhPerTon, 0)} kWh/t
            <br />
            <em style={{ fontSize: 11, opacity: 0.8 }}>
              Coordenada {plant.coordinatesPrecision}
            </em>
          </Popup>
        </Marker>
      </MapContainer>
      <div className="carbon-map-legend">
        <span>
          <i className="dot ok" /> Planta Alicon · monitoreo operativo
        </span>
        <Link to="/mapa">Mapa operativo →</Link>
      </div>
    </div>
  )
}
