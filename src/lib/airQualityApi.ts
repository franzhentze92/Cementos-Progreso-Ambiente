/**
 * Calidad del aire por coordenadas vía Open-Meteo Air Quality (sin API key).
 * https://open-meteo.com/en/docs/air-quality-api
 */

import { aqiFromUsIndex, type SiteAirQuality } from '../data/airQuality'
import type { WeatherPoint } from './weatherApi'

type OpenMeteoAqCurrent = {
  time?: string
  us_aqi?: number
  pm2_5?: number
  pm10?: number
  nitrogen_dioxide?: number
  sulphur_dioxide?: number
  ozone?: number
  carbon_monoxide?: number
}

type OpenMeteoAqLocation = {
  latitude?: number
  longitude?: number
  current?: OpenMeteoAqCurrent
  error?: boolean
  reason?: string
}

const CURRENT_VARS = [
  'us_aqi',
  'pm2_5',
  'pm10',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'ozone',
  'carbon_monoxide',
].join(',')

function mapCurrent(
  point: WeatherPoint,
  current: OpenMeteoAqCurrent | undefined,
): SiteAirQuality {
  const usAqi = current?.us_aqi ?? null
  const meta = aqiFromUsIndex(usAqi)
  return {
    siteId: point.id,
    lat: point.lat,
    lng: point.lng,
    usAqi,
    level: meta.level,
    label: meta.label,
    color: meta.color,
    pm25: current?.pm2_5 ?? null,
    pm10: current?.pm10 ?? null,
    no2: current?.nitrogen_dioxide ?? null,
    so2: current?.sulphur_dioxide ?? null,
    o3: current?.ozone ?? null,
    co: current?.carbon_monoxide ?? null,
    observedAt: current?.time ?? null,
  }
}

export async function loadAirQualityForPoints(
  points: WeatherPoint[],
): Promise<Map<string, SiteAirQuality>> {
  const result = new Map<string, SiteAirQuality>()
  if (points.length === 0) return result

  const chunkSize = 40
  for (let i = 0; i < points.length; i += chunkSize) {
    const chunk = points.slice(i, i + chunkSize)
    const lats = chunk.map((p) => p.lat).join(',')
    const lngs = chunk.map((p) => p.lng).join(',')
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality` +
      `?latitude=${lats}` +
      `&longitude=${lngs}` +
      `&current=${CURRENT_VARS}` +
      `&timezone=auto` +
      `&domains=cams_global`

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Open-Meteo AQ HTTP ${res.status}`)
    }

    const raw: OpenMeteoAqLocation | OpenMeteoAqLocation[] = await res.json()
    const rows = Array.isArray(raw) ? raw : [raw]

    rows.forEach((row, idx) => {
      const point = chunk[idx]
      if (!point) return
      result.set(
        point.id,
        mapCurrent(point, row.error ? undefined : row.current),
      )
    })
  }

  return result
}
