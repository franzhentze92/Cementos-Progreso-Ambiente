import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { CloudSun, Loader2, Wind } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SITES } from '../data/locations'
import type { SiteAirQuality } from '../data/airQuality'
import { formatAqi } from '../data/airQuality'
import type { SiteWeather } from '../data/weather'
import { formatTemp } from '../data/weather'
import { loadAirQualityForPoints } from '../lib/airQualityApi'
import { loadWeatherForPoints } from '../lib/weatherApi'
import { AirQualitySnippet } from './AirQualitySnippet'
import { WeatherSnippet } from './WeatherSnippet'
import 'leaflet/dist/leaflet.css'

function FitSites() {
  const map = useMap()
  const operative = useMemo(
    () =>
      SITES.filter(
        (s) => s.status === 'Operativa' && s.type.includes('Planta'),
      ),
    [],
  )

  useEffect(() => {
    if (operative.length === 0) return
    const bounds = L.latLngBounds(operative.map((s) => [s.lat, s.lng]))
    map.fitBounds(bounds.pad(0.2))
  }, [map, operative])

  return null
}

function plantIcon(
  isCement: boolean,
  tempLabel?: string,
  aqiColor?: string,
) {
  const color = aqiColor ?? (isCement ? '#047935' : '#d97706')
  const badge = tempLabel
    ? `<span style="
        position:absolute;left:50%;top:-16px;transform:translateX(-50%);
        background:rgba(15,40,24,.88);color:#fff;font:700 9px/1 system-ui,sans-serif;
        padding:2px 4px;border-radius:4px;white-space:nowrap;
      ">${tempLabel}</span>`
    : ''
  return L.divIcon({
    className: 'progreso-marker',
    html: `<div style="position:relative;width:14px;height:14px;">
      ${badge}
      <div style="
        width:14px;height:14px;border-radius:50%;
        background:${color};border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,.4);
      "></div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })
}

export function DashboardMap() {
  const plants = useMemo(
    () =>
      SITES.filter(
        (s) =>
          s.status === 'Operativa' &&
          (s.type === 'Planta de cemento' || s.type === 'Planta de concreto'),
      ),
    [],
  )

  const points = useMemo(
    () => plants.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
    [plants],
  )

  const [weatherById, setWeatherById] = useState<Map<string, SiteWeather>>(
    () => new Map(),
  )
  const [airById, setAirById] = useState<Map<string, SiteAirQuality>>(
    () => new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void Promise.all([
      loadWeatherForPoints(points),
      loadAirQualityForPoints(points),
    ])
      .then(([weather, air]) => {
        if (cancelled) return
        setWeatherById(weather)
        setAirById(air)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar clima / calidad de aire',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [points])

  const weatherList = useMemo(
    () =>
      plants
        .map((p) => weatherById.get(p.id))
        .filter(Boolean) as SiteWeather[],
    [plants, weatherById],
  )

  const airList = useMemo(
    () =>
      plants
        .map((p) => airById.get(p.id))
        .filter((a): a is SiteAirQuality => a != null && a.usAqi != null),
    [plants, airById],
  )

  const avgTemp =
    weatherList.length > 0
      ? weatherList.reduce((a, w) => a + (w.temperatureC ?? 0), 0) /
        weatherList.length
      : null

  const avgAqi =
    airList.length > 0
      ? airList.reduce((a, w) => a + (w.usAqi ?? 0), 0) / airList.length
      : null

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
        {plants.map((site) => {
          const wx = weatherById.get(site.id)
          const aq = airById.get(site.id)
          const tempLabel =
            wx?.temperatureC != null ? formatTemp(wx.temperatureC) : undefined
          return (
            <Marker
              key={site.id}
              position={[site.lat, site.lng]}
              icon={plantIcon(
                site.type === 'Planta de cemento',
                tempLabel,
                aq?.usAqi != null ? aq.color : undefined,
              )}
            >
              <Popup>
                <strong>{site.name}</strong>
                <br />
                {site.type} · {site.region}
                <div className="map-popup-weather">
                  <WeatherSnippet weather={wx} loading={loading} compact />
                </div>
                <div className="map-popup-weather">
                  <AirQualitySnippet air={aq} loading={loading} compact />
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      <div className="dash-weather-strip">
        {loading ? (
          <span className="dash-weather-meta">
            <Loader2 className="hc-spin" size={13} />
            Cargando clima y calidad de aire…
          </span>
        ) : error ? (
          <span className="dash-weather-meta warn">{error}</span>
        ) : (
          <>
            <div className="dash-env-meta-row">
              <span className="dash-weather-meta">
                <CloudSun size={14} />
                {avgTemp != null
                  ? `Clima prom. ${formatTemp(avgTemp)}`
                  : 'Clima'}
              </span>
              <span className="dash-weather-meta">
                <Wind size={14} />
                {avgAqi != null
                  ? `AQI prom. ${formatAqi(avgAqi)}`
                  : 'Calidad de aire'}
                <em>Open-Meteo · CAMS</em>
              </span>
            </div>
            <div className="dash-weather-chips">
              {plants.slice(0, 6).map((site) => {
                const wx = weatherById.get(site.id)
                const aq = airById.get(site.id)
                return (
                  <span
                    key={site.id}
                    className="dash-weather-chip"
                    title={site.name}
                  >
                    <strong>{site.name.replace(/^Planta\s+/i, '')}</strong>
                    <WeatherSnippet weather={wx} compact />
                    <AirQualitySnippet air={aq} compact />
                  </span>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="dash-map-footer">
        <span>
          Plantas operativas · etiqueta = temperatura · color del punto = AQI
        </span>
        <Link to="/mapa">Mapa completo (inventario / semáforo) →</Link>
      </div>
    </div>
  )
}
