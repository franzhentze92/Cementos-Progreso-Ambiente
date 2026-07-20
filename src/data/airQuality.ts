/**
 * Calidad del aire actual (Open-Meteo Air Quality / CAMS).
 * Usa US AQI (disponible en dominio global).
 */

export type AqiLevel =
  | 'buena'
  | 'moderada'
  | 'sensible'
  | 'mala'
  | 'muy-mala'
  | 'peligrosa'
  | 'sin-dato'

export type SiteAirQuality = {
  siteId: string
  lat: number
  lng: number
  usAqi: number | null
  level: AqiLevel
  label: string
  color: string
  pm25: number | null
  pm10: number | null
  no2: number | null
  so2: number | null
  o3: number | null
  co: number | null
  observedAt: string | null
}

export const AQI_LEVEL_ORDER: Exclude<AqiLevel, 'sin-dato'>[] = [
  'buena',
  'moderada',
  'sensible',
  'mala',
  'muy-mala',
  'peligrosa',
]

export const AQI_META: Record<
  Exclude<AqiLevel, 'sin-dato'>,
  { label: string; color: string; max: number; min: number }
> = {
  buena: { label: 'Buena', color: '#047935', min: 0, max: 50 },
  moderada: { label: 'Moderada', color: '#c2d500', min: 51, max: 100 },
  sensible: { label: 'Dañina (sensibles)', color: '#d97706', min: 101, max: 150 },
  mala: { label: 'Dañina', color: '#c45c26', min: 151, max: 200 },
  'muy-mala': { label: 'Muy dañina', color: '#7c3aed', min: 201, max: 300 },
  peligrosa: { label: 'Peligrosa', color: '#991b1b', min: 301, max: Infinity },
}

export function aqiFromUsIndex(aqi: number | null | undefined): {
  level: AqiLevel
  label: string
  color: string
} {
  if (aqi == null || Number.isNaN(aqi)) {
    return { level: 'sin-dato', label: 'Sin dato', color: '#5e5f61' }
  }
  const n = Math.round(aqi)
  if (n <= AQI_META.buena.max) return { level: 'buena', ...AQI_META.buena }
  if (n <= AQI_META.moderada.max)
    return { level: 'moderada', ...AQI_META.moderada }
  if (n <= AQI_META.sensible.max)
    return { level: 'sensible', ...AQI_META.sensible }
  if (n <= AQI_META.mala.max) return { level: 'mala', ...AQI_META.mala }
  if (n <= AQI_META['muy-mala'].max)
    return { level: 'muy-mala', ...AQI_META['muy-mala'] }
  return { level: 'peligrosa', ...AQI_META.peligrosa }
}

export function formatAqi(aqi: number | null | undefined): string {
  if (aqi == null || Number.isNaN(aqi)) return '—'
  return String(Math.round(aqi))
}

export function formatUg(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `${n.toFixed(n >= 10 ? 0 : 1)} µg/m³`
}
