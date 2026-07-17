import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ClipboardList,
  Droplets,
  Gauge,
  GraduationCap,
  HardHat,
  Leaf,
  Loader2,
  Recycle,
  ShieldAlert,
  Thermometer,
  Trash2,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  dashTooltip,
  EmptyPanel,
  fmt,
  SectionKpiGrid,
} from '../components/SectionDashBits'
import {
  loadOperacionesSummary,
  type OperacionesSummary,
} from '../lib/sectionSummariesApi'

function iconFor(id: string) {
  switch (id) {
    case 'mon':
      return Thermometer
    case 'insp':
      return ClipboardList
    case 'inc':
      return ShieldAlert
    case 'agua':
      return Droplets
    case 'res':
      return Trash2
    case 'comp':
      return Recycle
    case 'nda':
      return Gauge
    case 'casco':
      return HardHat
    case 'cap':
      return GraduationCap
    default:
      return Leaf
  }
}

export function ResumenOperacionesPage() {
  const [summary, setSummary] = useState<OperacionesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await loadOperacionesSummary()
        if (!cancelled) setSummary(data)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar el resumen de operaciones',
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
        <p>Cargando operaciones desde la base de datos…</p>
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

  return (
    <div className="dash-page">
      <div className="page-header dash-header">
        <div>
          <p className="carbon-kicker">Operaciones · Vista general</p>
          <h1>Resumen de operaciones</h1>
          <p>
            Indicadores vivos de lo que se ejecuta, registra o monitorea en
            campo y planta
            {summary.periodHints[0] ? ` · ${summary.periodHints[0]}` : ''}.
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
            <h2>Desempeño operativo</h2>
            <p>Monitoreos, NDA, inspecciones y Casco Verde (0–100)</p>
          </div>
          {summary.complianceBars.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={summary.complianceBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#5e5f61', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#5e5f61', fontSize: 12 }}
                  />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar dataKey="value" name="Valor" radius={[8, 8, 0, 0]}>
                    {summary.complianceBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin scores operativos aún"
              to="/operaciones/monitoreo-ambiental"
            />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Incidentes ambientales</h2>
            <p>Abiertos vs cerrados · Agro + Alicón</p>
          </div>
          {summary.incidentShare.length > 0 ? (
            <div className="dash-donuts dash-donuts-single">
              <div className="dash-donut">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={summary.incidentShare}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {summary.incidentShare.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={dashTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <strong>
                  {fmt(
                    summary.incidentShare.reduce((a, x) => a + x.value, 0),
                  )}
                </strong>
                <span>Total</span>
              </div>
              <ul className="dash-legend-list">
                {summary.incidentShare.map((s) => (
                  <li key={s.name}>
                    <i style={{ background: s.fill }} />
                    <span>{s.name}</span>
                    <strong>{fmt(s.value)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyPanel
              text="Sin incidentes registrados"
              to="/operaciones/incidentes-ambientales"
            />
          )}
        </section>
      </div>

      <div className="dash-secondary-grid dash-tertiary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Consumo de agua</h2>
            <p>
              {summary.aguaTotalM3 != null
                ? `${fmt(summary.aguaTotalM3)} m³ · ${summary.aguaPeriod ?? ''}`
                : 'Por sede'}
            </p>
          </div>
          {summary.aguaSedeShare.length > 0 ? (
            <div className="dash-donuts dash-donuts-single">
              <div className="dash-donut">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={summary.aguaSedeShare}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={64}
                      paddingAngle={3}
                    >
                      {summary.aguaSedeShare.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={dashTooltip}
                      formatter={(v) => `${fmt(Number(v))} m³`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="dash-legend-list">
                {summary.aguaSedeShare.map((s) => (
                  <li key={s.name}>
                    <i style={{ background: s.fill }} />
                    <span>{s.name}</span>
                    <strong>{fmt(s.value)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyPanel
              text="Sin consumo de agua"
              to="/operaciones/consumo-de-agua"
            />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Residuos por ruta</h2>
            <p>
              {summary.residuosTotalLbs != null
                ? `${fmt(summary.residuosTotalLbs)} lbs · ${summary.residuosPeriod ?? ''}`
                : 'Gestión de residuos'}
            </p>
          </div>
          {summary.residuosRutaShare.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={summary.residuosRutaShare.slice(0, 6)}
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
                  <Tooltip
                    contentStyle={dashTooltip}
                    formatter={(v) => `${fmt(Number(v))} lbs`}
                  />
                  <Bar dataKey="value" name="lbs" radius={[0, 8, 8, 0]} barSize={14}>
                    {summary.residuosRutaShare.slice(0, 6).map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin residuos registrados"
              to="/operaciones/gestion-de-residuos"
            />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Compostaje mensual</h2>
            <p>
              {summary.compostajeTotal != null
                ? `${fmt(summary.compostajeTotal, 1)} t · ${summary.compostajePeriod ?? ''}`
                : 'Toneladas'}
            </p>
          </div>
          {summary.compostajeMonthly.some((m) => m.total > 0) ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={summary.compostajeMonthly}>
                  <defs>
                    <linearGradient id="opsComp" x1="0" y1="0" x2="0" y2="1">
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
                    name="Toneladas"
                    stroke="#047935"
                    fill="url(#opsComp)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="Sin compostaje" to="/operaciones/compostaje" />
          )}
        </section>
      </div>

      <div className="dash-secondary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Capacitaciones</h2>
            <p>
              Ejecutado vs programado
              {summary.capacitacionesRate != null
                ? ` · ${fmt(summary.capacitacionesRate)}% ejecución`
                : ''}
            </p>
          </div>
          {summary.capacitacionesMonthly.some(
            (m) => m.ejecutado + m.programado > 0,
          ) ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={summary.capacitacionesMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="short"
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <Tooltip contentStyle={dashTooltip} />
                  <Legend />
                  <Bar
                    dataKey="ejecutado"
                    name="Ejecutado"
                    fill="#047935"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="programado"
                    name="Programado"
                    fill="#c2d500"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin capacitaciones"
              to="/operaciones/capacitaciones"
            />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>NDA Casco Verde</h2>
            <p>
              Nota promedio mensual
              {summary.cascoAvg != null ? ` · ${fmt(summary.cascoAvg, 1)}` : ''}
            </p>
          </div>
          {summary.cascoMonthly.some((m) => m.avgNota != null) ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={summary.cascoMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#5e5f61', fontSize: 12 }}
                  />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar
                    dataKey="avgNota"
                    name="Nota"
                    fill="#3d7ea6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin NDA Casco Verde"
              to="/operaciones/nda-casco-verde"
            />
          )}
        </section>
      </div>

      <p className="section-hub-empty" style={{ marginTop: 8 }}>
        Los KPIs enlazan al módulo de detalle.{' '}
        <Link to="/dashboard">Ver dashboard ejecutivo →</Link>
      </p>
    </div>
  )
}
