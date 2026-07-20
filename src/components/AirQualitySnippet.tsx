import { Loader2, Wind } from 'lucide-react'
import type { SiteAirQuality } from '../data/airQuality'
import { formatAqi, formatUg } from '../data/airQuality'

export function AirQualitySnippet({
  air,
  loading,
  compact = false,
}: {
  air: SiteAirQuality | null | undefined
  loading?: boolean
  compact?: boolean
}) {
  if (loading) {
    return (
      <div className={`aq-snippet${compact ? ' compact' : ''} is-loading`}>
        <Loader2 className="hc-spin" size={14} />
        <span>Aire…</span>
      </div>
    )
  }

  if (!air || air.usAqi == null) {
    return (
      <div className={`aq-snippet${compact ? ' compact' : ''} is-empty`}>
        <Wind size={14} />
        <span>Sin calidad de aire</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div
        className="aq-snippet compact"
        title={`AQI ${formatAqi(air.usAqi)} · ${air.label}`}
      >
        <i style={{ background: air.color }} />
        <strong style={{ color: air.color }}>AQI {formatAqi(air.usAqi)}</strong>
        <span>{air.label}</span>
      </div>
    )
  }

  return (
    <div className="aq-snippet card">
      <header>
        <i style={{ background: air.color }} />
        <div>
          <strong style={{ color: air.color }}>
            AQI {formatAqi(air.usAqi)}
          </strong>
          <span>{air.label}</span>
        </div>
      </header>
      <ul>
        <li>
          <span>PM2.5</span>
          <em>{formatUg(air.pm25)}</em>
        </li>
        <li>
          <span>PM10</span>
          <em>{formatUg(air.pm10)}</em>
        </li>
        <li>
          <span>NO₂</span>
          <em>{formatUg(air.no2)}</em>
        </li>
        <li>
          <span>O₃</span>
          <em>{formatUg(air.o3)}</em>
        </li>
        <li>
          <span>SO₂</span>
          <em>{formatUg(air.so2)}</em>
        </li>
      </ul>
      <p className="aq-source">Open-Meteo · CAMS</p>
    </div>
  )
}
