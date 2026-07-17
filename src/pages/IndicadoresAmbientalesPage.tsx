import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Factory,
  Gauge,
  Leaf,
  Loader2,
  Recycle,
  Target,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  dashTooltip,
  EmptyPanel,
  SectionKpiGrid,
} from '../components/SectionDashBits'
import {
  loadSostenibilidadSummary,
  type SostenibilidadSummary,
} from '../lib/sectionSummariesApi'

const COLORS = ['#047935', '#5ab64b', '#c2d500', '#3d7ea6', '#c45c26', '#8b7355']

function iconFor(id: string) {
  switch (id) {
    case 'metas':
      return Target
    case 'umb':
      return Gauge
    case 'int':
      return Activity
    case 'circ':
      return Recycle
    case 'huella':
      return Factory
    default:
      return Leaf
  }
}

export function IndicadoresAmbientalesPage() {
  const [summary, setSummary] = useState<SostenibilidadSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await loadSostenibilidadSummary()
        if (!cancelled) setSummary(data)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar indicadores ambientales',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="dash-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando indicadores desde la base de datos…</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="dash-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
        </div>
      </div>
    )
  }

  const metasChart = summary.metasByCategoria.map((c) => ({
    name: c.name,
    avance: c.avgPct ?? 0,
    metas: c.value,
  }))

  return (
    <div className="dash-page">
      <div className="page-header dash-header">
        <div>
          <p className="carbon-kicker">Sostenibilidad · Vista general</p>
          <h1>Indicadores ambientales</h1>
          <p>
            Desempeño ambiental: metas, umbrales, intensidad, circularidad y
            huella de carbono.
          </p>
        </div>
        <div className="dash-header-actions">
          <span className="dash-live-badge">
            <Leaf size={14} />
            {summary.modulesLoaded} módulos cargados
          </span>
          {summary.modulesFailed.length > 0 && (
            <span
              className="dash-warn-badge"
              title={summary.modulesFailed.join(', ')}
            >
              <AlertTriangle size={14} />
              {summary.modulesFailed.length} con error
            </span>
          )}
        </div>
      </div>

      <SectionKpiGrid kpis={summary.kpis} iconFor={iconFor} />

      <div className="dash-main-grid">
        <section className="dash-panel dash-chart-panel">
          <div className="dash-panel-head">
            <h2>Metas por categoría</h2>
            <p>Avance promedio (%)</p>
          </div>
          {metasChart.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metasChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#5e5f61', fontSize: 12 }}
                  />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar
                    dataKey="avance"
                    name="% avance"
                    fill="#047935"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="Sin metas" to="/metas" />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Umbrales por parámetro</h2>
            <p>Cumple vs excede</p>
          </div>
          {summary.umbralesByParam.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={summary.umbralesByParam}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#5e5f61', fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <Tooltip contentStyle={dashTooltip} />
                  <Legend />
                  <Bar dataKey="cumple" name="Cumple" stackId="a" fill="#047935" />
                  <Bar dataKey="excede" name="Excede" stackId="a" fill="#c45c26" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="Sin evaluaciones de umbral" to="/umbrales" />
          )}
        </section>
      </div>

      <div className="dash-secondary-grid dash-tertiary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Intensidad ambiental</h2>
            <p>kg CO₂e/t · baseline y escenarios</p>
          </div>
          {summary.intensidadComparison.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.intensidadComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar
                    dataKey="intensidad"
                    name="kg CO₂e/t"
                    fill="#3d7ea6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="Sin intensidad calculada" to="/intensidad" />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Circularidad por ruta</h2>
            <p>Lbs por ruta de valorización</p>
          </div>
          {summary.circularidadByRuta.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={summary.circularidadByRuta}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e5e8"
                    horizontal={false}
                  />
                  <XAxis type="number" tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={14}>
                    {summary.circularidadByRuta.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="Sin flujos de circularidad" to="/circularidad" />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Producción Alicón</h2>
            <p>{summary.carbonPeriod ?? 'Huella de carbono'}</p>
          </div>
          {summary.carbonMonthly.some((m) => m.total > 0) ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={summary.carbonMonthly}>
                  <defs>
                    <linearGradient id="sostCarb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#047935" stopOpacity={0.35} />
                      <stop
                        offset="100%"
                        stopColor="#047935"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <Tooltip contentStyle={dashTooltip} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Producción (t)"
                    stroke="#047935"
                    fill="url(#sostCarb)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin campaña de huella"
              to="/operaciones/huella-de-carbono"
            />
          )}
        </section>
      </div>
    </div>
  )
}
