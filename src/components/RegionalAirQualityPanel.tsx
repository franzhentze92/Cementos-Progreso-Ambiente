import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2, Wind } from 'lucide-react'
import { SITES, type LocationCountry } from '../data/locations'
import {
  AQI_LEVEL_ORDER,
  AQI_META,
  formatAqi,
  type AqiLevel,
  type SiteAirQuality,
} from '../data/airQuality'
import { loadAirQualityForPoints } from '../lib/airQualityApi'
import { AirQualitySnippet } from './AirQualitySnippet'

type PlantAirRow = {
  id: string
  name: string
  shortName: string
  country: LocationCountry
  region: string
  air: SiteAirQuality
}

export function RegionalAirQualityPanel() {
  const plants = useMemo(
    () =>
      SITES.filter(
        (s) =>
          s.status === 'Operativa' &&
          (s.type === 'Planta de cemento' || s.type === 'Planta de concreto'),
      ),
    [],
  )

  const [rows, setRows] = useState<PlantAirRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void loadAirQualityForPoints(
      plants.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
    )
      .then((map) => {
        if (cancelled) return
        const next = plants
          .flatMap((p): PlantAirRow[] => {
            const air = map.get(p.id)
            if (!air || air.usAqi == null) return []
            return [
              {
                id: p.id,
                name: p.name,
                shortName: p.name.replace(/^Planta\s+/i, ''),
                country: p.country,
                region: p.region,
                air,
              },
            ]
          })
          .sort((a, b) => (b.air.usAqi ?? 0) - (a.air.usAqi ?? 0))
        setRows(next)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar calidad de aire',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [plants])

  const counts = useMemo(() => {
    const c: Record<AqiLevel, number> = {
      buena: 0,
      moderada: 0,
      sensible: 0,
      mala: 0,
      'muy-mala': 0,
      peligrosa: 0,
      'sin-dato': 0,
    }
    for (const r of rows) c[r.air.level] += 1
    return c
  }, [rows])

  const avgAqi =
    rows.length > 0
      ? rows.reduce((a, r) => a + (r.air.usAqi ?? 0), 0) / rows.length
      : null

  const worst = rows[0] ?? null
  const best = rows.length > 0 ? rows[rows.length - 1] : null

  const alertCount =
    counts.sensible + counts.mala + counts['muy-mala'] + counts.peligrosa

  const avgMeta =
    avgAqi != null
      ? AQI_LEVEL_ORDER.map((level) => ({
          level,
          ...AQI_META[level],
        })).find(
          (m) =>
            Math.round(avgAqi) >= m.min &&
            Math.round(avgAqi) <= (m.max === Infinity ? 9999 : m.max),
        )
      : null

  return (
    <section className="dash-panel dash-aq-panel">
      <div className="dash-panel-head row">
        <div>
          <h2>
            <Wind size={18} />
            Semáforo regional · calidad de aire
          </h2>
          <p>
            AQI actual en plantas operativas · Open-Meteo CAMS
          </p>
        </div>
        <Link to="/mapa" className="btn-secondary-link">
          Ver en mapa →
        </Link>
      </div>

      {loading ? (
        <div className="dash-aq-loading">
          <Loader2 className="hc-spin" size={22} />
          <span>Consultando calidad de aire regional…</span>
        </div>
      ) : error ? (
        <div className="dash-aq-loading warn">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="dash-aq-loading">
          <span>Sin lecturas de calidad de aire disponibles.</span>
        </div>
      ) : (
        <>
          <div className="dash-aq-hero">
            <div
              className="dash-aq-avg"
              style={{
                borderColor: avgMeta?.color ?? '#5e5f61',
                background: `${avgMeta?.color ?? '#5e5f61'}14`,
              }}
            >
              <span>AQI promedio</span>
              <strong style={{ color: avgMeta?.color }}>
                {formatAqi(avgAqi)}
              </strong>
              <em style={{ color: avgMeta?.color }}>
                {avgMeta?.label ?? '—'}
              </em>
            </div>

            <div className="dash-aq-lights" role="list" aria-label="Semáforo AQI">
              {AQI_LEVEL_ORDER.map((level) => (
                <div
                  key={level}
                  className={`dash-aq-light${counts[level] > 0 ? ' has' : ''}`}
                  role="listitem"
                  title={`${AQI_META[level].label}: ${counts[level]} planta(s)`}
                >
                  <i style={{ background: AQI_META[level].color }} />
                  <strong>{counts[level]}</strong>
                  <span>{AQI_META[level].label}</span>
                </div>
              ))}
            </div>

            <div className="dash-aq-extremes">
              {worst && (
                <div className="dash-aq-extreme">
                  <span>Más alta</span>
                  <strong style={{ color: worst.air.color }}>
                    {worst.shortName}
                  </strong>
                  <AirQualitySnippet air={worst.air} compact />
                </div>
              )}
              {best && best.id !== worst?.id && (
                <div className="dash-aq-extreme">
                  <span>Más baja</span>
                  <strong style={{ color: best.air.color }}>
                    {best.shortName}
                  </strong>
                  <AirQualitySnippet air={best.air} compact />
                </div>
              )}
              {alertCount > 0 && (
                <div className="dash-aq-extreme warn">
                  <AlertTriangle size={14} />
                  <span>
                    {alertCount} planta{alertCount === 1 ? '' : 's'} en rango
                    dañino o superior
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="dash-aq-plant-grid">
            {rows.map((row) => (
              <article
                key={row.id}
                className="dash-aq-plant-card"
                style={{ borderTopColor: row.air.color }}
              >
                <header>
                  <strong>{row.shortName}</strong>
                  <small>
                    {row.country} · {row.region}
                  </small>
                </header>
                <AirQualitySnippet air={row.air} compact />
                <footer>
                  <span>PM2.5</span>
                  <em>
                    {row.air.pm25 != null
                      ? `${row.air.pm25.toFixed(1)} µg/m³`
                      : '—'}
                  </em>
                </footer>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
