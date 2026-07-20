/**
 * Condiciones meteorológicas actuales (Open-Meteo / WMO).
 */

export type SiteWeather = {
  siteId: string
  lat: number
  lng: number
  temperatureC: number | null
  feelsLikeC: number | null
  humidityPct: number | null
  windKmh: number | null
  precipitationMm: number | null
  weatherCode: number | null
  label: string
  icon: WeatherIconKind
  observedAt: string | null
}

export type WeatherIconKind =
  | 'clear'
  | 'partly'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'unknown'

/** Códigos WMO Weather interpretation (Open-Meteo). */
export function weatherFromCode(code: number | null | undefined): {
  label: string
  icon: WeatherIconKind
} {
  if (code == null || Number.isNaN(code)) {
    return { label: 'Sin dato', icon: 'unknown' }
  }
  if (code === 0) return { label: 'Despejado', icon: 'clear' }
  if (code === 1) return { label: 'Mayormente despejado', icon: 'clear' }
  if (code === 2) return { label: 'Parcialmente nublado', icon: 'partly' }
  if (code === 3) return { label: 'Nublado', icon: 'cloud' }
  if (code === 45 || code === 48) return { label: 'Niebla', icon: 'fog' }
  if (code >= 51 && code <= 55) return { label: 'Llovizna', icon: 'drizzle' }
  if (code === 56 || code === 57) return { label: 'Llovizna helada', icon: 'drizzle' }
  if (code >= 61 && code <= 65) return { label: 'Lluvia', icon: 'rain' }
  if (code === 66 || code === 67) return { label: 'Lluvia helada', icon: 'rain' }
  if (code >= 71 && code <= 77) return { label: 'Nieve', icon: 'snow' }
  if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: 'rain' }
  if (code === 85 || code === 86) return { label: 'Chubascos de nieve', icon: 'snow' }
  if (code === 95) return { label: 'Tormenta', icon: 'storm' }
  if (code === 96 || code === 99) return { label: 'Tormenta con granizo', icon: 'storm' }
  return { label: `Código ${code}`, icon: 'unknown' }
}

export function formatTemp(c: number | null | undefined): string {
  if (c == null || Number.isNaN(c)) return '—'
  return `${Math.round(c)}°C`
}

export function formatWind(kmh: number | null | undefined): string {
  if (kmh == null || Number.isNaN(kmh)) return '—'
  return `${Math.round(kmh)} km/h`
}

export function formatHumidity(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) return '—'
  return `${Math.round(pct)}%`
}

export function formatPrecip(mm: number | null | undefined): string {
  if (mm == null || Number.isNaN(mm)) return '—'
  if (mm <= 0) return '0 mm'
  return `${mm.toFixed(1)} mm`
}
