import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Loader2,
  Sun,
  Wind,
} from 'lucide-react'
import type { SiteWeather, WeatherIconKind } from '../data/weather'
import {
  formatHumidity,
  formatPrecip,
  formatTemp,
  formatWind,
} from '../data/weather'

function WeatherIcon({
  kind,
  size = 18,
}: {
  kind: WeatherIconKind
  size?: number
}) {
  switch (kind) {
    case 'clear':
      return <Sun size={size} />
    case 'partly':
      return <CloudSun size={size} />
    case 'cloud':
      return <Cloud size={size} />
    case 'fog':
      return <CloudFog size={size} />
    case 'drizzle':
    case 'rain':
      return <CloudRain size={size} />
    case 'snow':
      return <CloudSnow size={size} />
    case 'storm':
      return <CloudLightning size={size} />
    default:
      return <Cloud size={size} />
  }
}

export function WeatherSnippet({
  weather,
  loading,
  compact = false,
}: {
  weather: SiteWeather | null | undefined
  loading?: boolean
  compact?: boolean
}) {
  if (loading) {
    return (
      <div className={`weather-snippet${compact ? ' compact' : ''} is-loading`}>
        <Loader2 className="hc-spin" size={14} />
        <span>Clima…</span>
      </div>
    )
  }

  if (!weather || weather.temperatureC == null) {
    return (
      <div className={`weather-snippet${compact ? ' compact' : ''} is-empty`}>
        <Cloud size={14} />
        <span>Sin clima</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="weather-snippet compact" title={weather.label}>
        <WeatherIcon kind={weather.icon} size={14} />
        <strong>{formatTemp(weather.temperatureC)}</strong>
        <span>{weather.label}</span>
      </div>
    )
  }

  return (
    <div className="weather-snippet card">
      <header>
        <WeatherIcon kind={weather.icon} size={22} />
        <div>
          <strong>{formatTemp(weather.temperatureC)}</strong>
          <span>{weather.label}</span>
        </div>
      </header>
      <ul>
        <li>
          <Droplets size={13} />
          Humedad {formatHumidity(weather.humidityPct)}
        </li>
        <li>
          <Wind size={13} />
          Viento {formatWind(weather.windKmh)}
        </li>
        <li>
          <CloudRain size={13} />
          Precip. {formatPrecip(weather.precipitationMm)}
        </li>
      </ul>
      {weather.feelsLikeC != null && (
        <p className="weather-feels">
          Sensación {formatTemp(weather.feelsLikeC)}
        </p>
      )}
    </div>
  )
}
