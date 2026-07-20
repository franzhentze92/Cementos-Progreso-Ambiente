/**
 * Clima actual por coordenadas vía Open-Meteo (sin API key).
 * https://open-meteo.com/
 */

import {
  weatherFromCode,
  type SiteWeather,
} from '../data/weather'

export type WeatherPoint = {
  id: string
  lat: number
  lng: number
}

type OpenMeteoCurrent = {
  time?: string
  temperature_2m?: number
  apparent_temperature?: number
  relative_humidity_2m?: number
  wind_speed_10m?: number
  precipitation?: number
  weather_code?: number
}

type OpenMeteoLocation = {
  latitude?: number
  longitude?: number
  current?: OpenMeteoCurrent
  error?: boolean
  reason?: string
}

const CURRENT_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'wind_speed_10m',
  'precipitation',
  'weather_code',
].join(',')

function mapCurrent(
  point: WeatherPoint,
  current: OpenMeteoCurrent | undefined,
): SiteWeather {
  const code = current?.weather_code ?? null
  const { label, icon } = weatherFromCode(code)
  return {
    siteId: point.id,
    lat: point.lat,
    lng: point.lng,
    temperatureC: current?.temperature_2m ?? null,
    feelsLikeC: current?.apparent_temperature ?? null,
    humidityPct: current?.relative_humidity_2m ?? null,
    windKmh: current?.wind_speed_10m ?? null,
    precipitationMm: current?.precipitation ?? null,
    weatherCode: code,
    label,
    icon,
    observedAt: current?.time ?? null,
  }
}

/** Open-Meteo acepta varias ubicaciones en una sola petición. */
export async function loadWeatherForPoints(
  points: WeatherPoint[],
): Promise<Map<string, SiteWeather>> {
  const result = new Map<string, SiteWeather>()
  if (points.length === 0) return result

  // Lotes de hasta 40 puntos (límite práctico de URL)
  const chunkSize = 40
  for (let i = 0; i < points.length; i += chunkSize) {
    const chunk = points.slice(i, i + chunkSize)
    const lats = chunk.map((p) => p.lat).join(',')
    const lngs = chunk.map((p) => p.lng).join(',')
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lats}` +
      `&longitude=${lngs}` +
      `&current=${CURRENT_VARS}` +
      `&timezone=auto` +
      `&wind_speed_unit=kmh`

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`)
    }

    const raw: OpenMeteoLocation | OpenMeteoLocation[] = await res.json()
    const rows = Array.isArray(raw) ? raw : [raw]

    rows.forEach((row, idx) => {
      const point = chunk[idx]
      if (!point) return
      if (row.error) {
        result.set(
          point.id,
          mapCurrent(point, undefined),
        )
        return
      }
      result.set(point.id, mapCurrent(point, row.current))
    })
  }

  return result
}
