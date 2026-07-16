import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Factory,
  FileCheck2,
  Leaf,
  Loader2,
  ShieldAlert,
  Sparkles,
  Trash2,
  Zap,
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
import { useAuth } from '../context/AuthContext'
import { DashboardMap } from '../components/DashboardMap'
import type { DashboardSummary, DashInsightLevel } from '../data/dashboard'
import { loadDashboardSummary } from '../lib/dashboardApi'

const ALERT_CLASS: Record<DashInsightLevel, string> = {
  Crítico: 'prio-high',
  Atención: 'prio-mid',
  Positivo: 'prio-low',
}

const KPI_TONE: Record<string, string> = {
  default: '',
  lime: 'lime',
  dark: 'dark',
  warn: 'warn',
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const INCIDENT_COLORS = ['#c45c26', '#047935']
const LIC_COLORS = ['#047935', '#c2d500', '#5e5f61', '#8b7355', '#3d7ea6']

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-GT', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

export function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await loadDashboardSummary()
        if (cancelled) return
        setSummary(data)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el dashboard',
        )
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
        <p>Cargando resumen ambiental desde la base de datos…</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="dash-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link to="/entrada-datos/planta-alicon" className="btn-secondary-link">
            Ir a captura →
          </Link>
        </div>
      </div>
    )
  }

  const { alicon, agro, compliance, sites, insights, kpis } = summary

  const incidentShare = [
    {
      name: 'Abiertos',
      value: compliance.incidentes.abiertos,
      fill: '#c45c26',
    },
    {
      name: 'Cerrados',
      value: compliance.incidentes.cerrados,
      fill: '#047935',
    },
  ].filter((x) => x.value > 0)

  const complianceBars = [
    {
      name: 'Monitoreos',
      value: compliance.monitoreosCumplePct ?? 0,
      fill: '#047935',
      has: compliance.monitoreosCumplePct != null,
    },
    {
      name: 'NDA',
      value: compliance.ndaAvg ?? 0,
      fill: '#5ab64b',
      has: compliance.ndaAvg != null,
    },
    {
      name: 'Inspecciones',
      value: compliance.inspecciones.avgScore ?? 0,
      fill: '#c2d500',
      has: compliance.inspecciones.avgScore != null,
    },
  ].filter((x) => x.has)

  const periodText =
    summary.periodHints.length > 0
      ? summary.periodHints.slice(0, 2).join(' · ')
      : 'Datos operativos en vivo'

  return (
    <div className="dash-page">
      <div className="page-header dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Bienvenido, {user?.name}. Resumen ambiental en vivo
            {periodText ? ` · ${periodText}` : ''}.
          </p>
        </div>
        <div className="dash-header-actions">
          <span className="dash-live-badge">
            <Leaf size={14} />
            {summary.modulesLoaded} módulos cargados
          </span>
          {summary.modulesFailed.length > 0 && (
            <span className="dash-warn-badge" title={summary.modulesFailed.join(', ')}>
              <AlertTriangle size={14} />
              {summary.modulesFailed.length} con error
            </span>
          )}
        </div>
      </div>

      <div className="dash-kpi-grid dash-kpi-grid-dynamic">
        {kpis.map((kpi) => {
          const body = (
            <>
              <div className="dash-kpi-icon">
                {kpi.id === 'prod' || kpi.id === 'clinker' ? (
                  <Factory size={18} />
                ) : kpi.id === 'elec' ? (
                  <Zap size={18} />
                ) : kpi.id === 'agua' ? (
                  <Droplets size={18} />
                ) : kpi.id === 'residuos' || kpi.id === 'compost' ? (
                  <Trash2 size={18} />
                ) : kpi.id === 'incidentes' ? (
                  <ShieldAlert size={18} />
                ) : kpi.id === 'lic' || kpi.id === 'cumple' || kpi.id === 'insp' ? (
                  <FileCheck2 size={18} />
                ) : (
                  <Leaf size={18} />
                )}
              </div>
              <div>
                <span>{kpi.label}</span>
                <strong>
                  {kpi.value}
                  {kpi.unit ? (
                    <em className="dash-kpi-unit"> {kpi.unit}</em>
                  ) : null}
                </strong>
                <small>{kpi.hint}</small>
              </div>
            </>
          )
          const cls = `dash-kpi ${KPI_TONE[kpi.tone] ?? ''}`.trim()
          return kpi.href ? (
            <Link key={kpi.id} to={kpi.href} className={`${cls} dash-kpi-link`}>
              {body}
            </Link>
          ) : (
            <div key={kpi.id} className={cls}>
              {body}
            </div>
          )
        })}
      </div>

      <div className="dash-main-grid">
        <section className="dash-panel dash-chart-panel">
          <div className="dash-panel-head">
            <h2>Producción Alicon</h2>
            <p>
              {alicon
                ? `Cemento UGC + CFB · ${alicon.periodLabel}`
                : 'Sin campaña de monitoreo cargada'}
            </p>
          </div>
          {alicon && alicon.monthlyProduction.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={alicon.monthlyProduction}>
                  <defs>
                    <linearGradient id="dashProd" x1="0" y1="0" x2="0" y2="1">
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
                    tick={{ fill: '#5e5f61', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Producción (t)"
                    stroke="#047935"
                    fill="url(#dashProd)"
                    strokeWidth={2.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="ugc"
                    name="UGC"
                    stroke="#5ab64b"
                    fill="transparent"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="cfb"
                    name="CFB"
                    stroke="#c2d500"
                    fill="transparent"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Capture producción en Entrada de Datos · Alicon"
              to="/entrada-datos/planta-alicon"
            />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Intensidad eléctrica</h2>
            <p>
              {alicon
                ? `kWh/t cemento · ${alicon.periodLabel}`
                : 'Alicon'}
            </p>
          </div>
          {alicon &&
          alicon.monthlyElectricity.some((m) => m.kwhPerTon != null) ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={alicon.monthlyElectricity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#5e5f61', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="kwhPerTon"
                    name="kWh/t"
                    fill="#047935"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin intensidad eléctrica mensual"
              to="/operaciones/planta-alicon/huella-de-carbono"
            />
          )}
        </section>
      </div>

      <div className="dash-secondary-grid dash-tertiary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Agua Agroprogreso</h2>
            <p>
              {agro.agua
                ? `${fmt(agro.agua.totalM3, 0)} m³ · ${agro.agua.periodLabel}`
                : 'Consumo de agua'}
            </p>
          </div>
          {agro.agua && agro.agua.sedeShare.length > 0 ? (
            <div className="dash-donuts dash-donuts-single">
              <div className="dash-donut">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={agro.agua.sedeShare}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {agro.agua.sedeShare.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => `${fmt(Number(v), 0)} m³`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <strong>{fmt(agro.agua.totalM3, 0)} m³</strong>
                <span>Total periodo</span>
              </div>
              <ul className="dash-legend-list">
                {agro.agua.sedeShare.map((s) => (
                  <li key={s.name}>
                    <i style={{ background: s.fill }} />
                    <span>{s.name}</span>
                    <strong>{fmt(s.value, 0)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyPanel
              text="Sin consumo de agua registrado"
              to="/entrada-datos/agroprogreso/consumo-de-agua"
            />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Residuos Agro</h2>
            <p>
              {agro.residuos
                ? `${fmt(agro.residuos.totalLbs, 0)} lbs · ${agro.residuos.periodLabel}`
                : 'Rutas de gestión'}
            </p>
          </div>
          {agro.residuos && agro.residuos.rutaShare.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={agro.residuos.rutaShare.slice(0, 6)}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e5e8"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#5e5f61', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => `${fmt(Number(v), 0)} lbs`}
                  />
                  <Bar dataKey="value" name="lbs" radius={[0, 8, 8, 0]} barSize={14}>
                    {agro.residuos.rutaShare.slice(0, 6).map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin residuos registrados"
              to="/operaciones/agroprogreso/gestion-de-residuos"
            />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Incidentes ambientales</h2>
            <p>
              {compliance.incidentes.total > 0
                ? `${fmt(compliance.incidentes.abiertos)} abiertos de ${fmt(compliance.incidentes.total)}`
                : 'Agro + Alicon'}
            </p>
          </div>
          {incidentShare.length > 0 ? (
            <>
              <div className="dash-donuts dash-donuts-single">
                <div className="dash-donut">
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={incidentShare}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={62}
                        paddingAngle={3}
                      >
                        {incidentShare.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <strong>{fmt(compliance.incidentes.abiertos)}</strong>
                  <span>Abiertos</span>
                </div>
              </div>
              <ul className="dash-legend-list">
                {compliance.incidentes.byUnidad.map((u, i) => (
                  <li key={u.name}>
                    <i
                      style={{
                        background: INCIDENT_COLORS[i % INCIDENT_COLORS.length],
                      }}
                    />
                    <span>{u.name}</span>
                    <strong>
                      {u.abiertos}/{u.total}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyPanel
              text="Sin incidentes registrados"
              to="/operaciones/agroprogreso/incidentes-ambientales"
            />
          )}
        </section>
      </div>

      <div className="dash-secondary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Cumplimiento y desempeño</h2>
            <p>Monitoreos, NDA e inspecciones (escala 0–100)</p>
          </div>
          {complianceBars.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={complianceBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#5e5f61', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#5e5f61', fontSize: 12 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Nota / %" radius={[8, 8, 0, 0]}>
                    {complianceBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin datos de cumplimiento aún"
              to="/operaciones/agroprogreso/monitoreo-ambiental"
            />
          )}
          <div className="dash-stat-row">
            <div>
              <span>Hallazgos inspecciones</span>
              <strong>{fmt(compliance.inspecciones.hallazgos)}</strong>
            </div>
            <div>
              <span>Licencias vigentes</span>
              <strong>
                {fmt(compliance.licencias.vigentes)}/
                {fmt(compliance.licencias.total)}
              </strong>
            </div>
            <div>
              <span>Por vencer ≤12m</span>
              <strong>{fmt(compliance.licencias.proximoVencer)}</strong>
            </div>
          </div>
        </section>

        <section className="dash-panel dash-map-panel">
          <div className="dash-panel-head">
            <h2>Mapa de plantas</h2>
            <p>
              {sites.plantCount} plantas operativas · {sites.operative} sitios
              en {sites.countriesCount} países
            </p>
          </div>
          <DashboardMap />
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Presencia regional</h2>
            <p>Sitios operativos del inventario georreferenciado</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={sites.byCountry}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e5e8"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: '#5e5f61', fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={90}
                  tick={{ fill: '#5e5f61', fontSize: 12 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sites" name="Sitios" radius={[0, 8, 8, 0]} barSize={16}>
                  {sites.byCountry.map((entry) => (
                    <Cell
                      key={entry.country}
                      fill={
                        entry.country === 'Guatemala' ? '#047935' : '#5ab64b'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {(alicon?.wasteDisposition.length ||
        agro.compostaje ||
        compliance.licencias.byEstado.length > 0) && (
        <div className="dash-secondary-grid dash-bottom-grid">
          {alicon && alicon.wasteDisposition.length > 0 && (
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Disposición de residuos Alicon</h2>
                <p>
                  {alicon.totals.diversionRate != null
                    ? `Desvío ${fmt(alicon.totals.diversionRate, 0)}% · ${alicon.periodLabel}`
                    : alicon.periodLabel}
                </p>
              </div>
              <div className="dash-donuts dash-donuts-single">
                <div className="dash-donut">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={alicon.wasteDisposition}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={44}
                        outerRadius={64}
                        paddingAngle={3}
                      >
                        {alicon.wasteDisposition.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => `${fmt(Number(v), 1)} t`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="dash-legend-list">
                  {alicon.wasteDisposition.map((s) => (
                    <li key={s.name}>
                      <i style={{ background: s.fill }} />
                      <span>{s.name}</span>
                      <strong>{fmt(s.value, 1)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {agro.compostaje && agro.compostaje.monthly.length > 0 && (
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Compostaje</h2>
                <p>
                  {fmt(agro.compostaje.total, 1)} t ·{' '}
                  {agro.compostaje.periodLabel}
                </p>
              </div>
              <div className="dash-chart">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={agro.compostaje.monthly}>
                    <defs>
                      <linearGradient
                        id="dashComp"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#5ab64b"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#5ab64b"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#5e5f61', fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Toneladas"
                      stroke="#5ab64b"
                      fill="url(#dashComp)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {compliance.licencias.byEstado.length > 0 && (
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Licencias ambientales</h2>
                <p>
                  {fmt(compliance.licencias.vigentes)} vigentes de{' '}
                  {fmt(compliance.licencias.total)}
                </p>
              </div>
              <div className="dash-chart">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={compliance.licencias.byEstado}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#5e5f61', fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#5e5f61', fontSize: 12 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="Licencias" radius={[8, 8, 0, 0]}>
                      {compliance.licencias.byEstado.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={LIC_COLORS[i % LIC_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </div>
      )}

      {insights.length > 0 && (
        <section className="dash-panel dash-recs">
          <div className="dash-panel-head row">
            <div>
              <h2>
                <Sparkles
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Hallazgos del periodo
              </h2>
              <p>Derivados automáticamente de los módulos con datos</p>
            </div>
            <span className="dash-recs-badge">
              <CheckCircle2 size={14} />
              {insights.length} insights
            </span>
          </div>
          <div className="dash-recs-grid">
            {insights.map((ins) => (
              <article key={ins.id + ins.source} className="dash-rec-card">
                <div className="dash-rec-top">
                  <span className={`dash-prio ${ALERT_CLASS[ins.level]}`}>
                    {ins.level}
                  </span>
                  <span className="dash-rec-source">{ins.source}</span>
                </div>
                <h3>{ins.title}</h3>
                <p>{ins.text}</p>
                {ins.href && (
                  <footer>
                    <Link to={ins.href}>Ver módulo →</Link>
                  </footer>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EmptyPanel({ text, to }: { text: string; to: string }) {
  return (
    <div className="dash-empty">
      <p>{text}</p>
      <Link to={to} className="btn-secondary-link">
        Abrir →
      </Link>
    </div>
  )
}
