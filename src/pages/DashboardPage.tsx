import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Gauge,
  Leaf,
  Loader2,
  MapPinned,
  Scale,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DashboardMap } from '../components/DashboardMap'
import { RegionalAirQualityPanel } from '../components/RegionalAirQualityPanel'
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

const LIC_COLORS = ['#047935', '#c2d500', '#5e5f61', '#8b7355', '#3d7ea6']

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-GT', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

function ndaTone(score: number | null): string {
  if (score == null) return ''
  if (score >= 85) return 'ok'
  if (score >= 70) return 'mid'
  return 'low'
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
          <Link to="/entrada-datos" className="btn-secondary-link">
            Ir a captura →
          </Link>
        </div>
      </div>
    )
  }

  const { nda, compliance, sites, insights, kpis } = summary

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

  return (
    <div className="dash-page">
      <div className="page-header dash-header">
        <div>
          <p className="carbon-kicker">Inicio</p>
          <h1>Dashboard</h1>
          <p>
            Visión general ambiental · Bienvenido, {user?.name}.
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

      <div className="dash-kpi-grid dash-kpi-grid-dynamic">
        {kpis.map((kpi) => {
          const body = (
            <>
              <div className="dash-kpi-icon">
                {kpi.id === 'nda' ? (
                  <Gauge size={18} />
                ) : kpi.id === 'cumple' ? (
                  <Scale size={18} />
                ) : kpi.id === 'lic' ? (
                  <FileCheck2 size={18} />
                ) : kpi.id === 'incidentes' ? (
                  <ShieldAlert size={18} />
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

      <section className="dash-panel dash-nda-section">
        <div className="dash-panel-head row">
          <div>
            <h2>
              <Gauge size={18} />
              Notas de desempeño ambiental (NDA)
            </h2>
            <p>
              {nda
                ? `Promedio por operación · ${nda.periodLabel}`
                : 'Desempeño ambiental de las operaciones'}
            </p>
          </div>
          <Link to="/operaciones/nda-general" className="btn-secondary-link">
            Ver detalle →
          </Link>
        </div>

        {nda && nda.bySede.length > 0 ? (
          <div className="dash-nda-grid">
            {nda.bySede.map((sede) => (
              <Link
                key={sede.sede}
                to="/operaciones/nda-general"
                className={`dash-nda-card ${ndaTone(sede.avgNda)}`}
              >
                <header>
                  <span className="dash-nda-sede">{sede.sede}</span>
                  <span className="dash-nda-count">{sede.count} reg.</span>
                </header>
                <strong className="dash-nda-score">
                  {sede.avgNda != null ? fmt(sede.avgNda, 1) : '—'}
                </strong>
                <span className="dash-nda-label">NDA promedio</span>
                <footer>
                  <div>
                    <span>IDA</span>
                    <em>
                      {sede.avgIda != null ? fmt(sede.avgIda, 1) : '—'}
                    </em>
                  </div>
                  <div>
                    <span>Casco Verde</span>
                    <em>
                      {sede.avgCasco != null ? fmt(sede.avgCasco, 1) : '—'}
                    </em>
                  </div>
                </footer>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyPanel
            text="Sin notas de desempeño registradas para el periodo"
            to="/entrada-datos/nda-general"
          />
        )}
      </section>

      <div className="dash-secondary-grid dash-overview-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Scale size={18} />
              Cumplimiento y desempeño
            </h2>
            <p>Monitoreos, NDA e inspecciones (escala 0–100)</p>
          </div>
          {complianceBars.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={220}>
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
              to="/operaciones/monitoreo-ambiental"
            />
          )}
          <div className="dash-stat-row dash-stat-row-compact">
            <div>
              <span>Hallazgos inspecciones</span>
              <strong>{fmt(compliance.inspecciones.hallazgos)}</strong>
            </div>
            <div>
              <span>Obligaciones vencidas</span>
              <strong>
                <Link to="/cumplimiento">
                  {fmt(compliance.obligacionesVencidas)}
                </Link>
              </strong>
            </div>
            <div>
              <span>CAPA abiertas</span>
              <strong>
                <Link to="/capa">
                  {fmt(compliance.capaAbiertas)}
                  {compliance.capaVencidas > 0
                    ? ` · ${fmt(compliance.capaVencidas)} venc.`
                    : ''}
                </Link>
              </strong>
            </div>
            <div>
              <span>Metas en riesgo</span>
              <strong>
                <Link to="/metas">{fmt(compliance.metasEnRiesgo)}</Link>
              </strong>
            </div>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head row">
            <div>
              <h2>
                <FileCheck2 size={18} />
                Licencias ambientales
              </h2>
              <p>
                {fmt(compliance.licencias.vigentes)} vigentes de{' '}
                {fmt(compliance.licencias.total)}
                {compliance.licencias.proximoVencer > 0
                  ? ` · ${fmt(compliance.licencias.proximoVencer)} por vencer ≤12m`
                  : ''}
              </p>
            </div>
            <Link
              to="/operaciones/licencias-ambientales"
              className="btn-secondary-link"
            >
              Ver →
            </Link>
          </div>
          {compliance.licencias.byEstado.length > 0 ? (
            <>
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
              <div className="dash-stat-row dash-stat-row-compact">
                <div>
                  <span>Vigentes</span>
                  <strong>{fmt(compliance.licencias.vigentes)}</strong>
                </div>
                <div>
                  <span>En proceso</span>
                  <strong>{fmt(compliance.licencias.enProceso)}</strong>
                </div>
                <div>
                  <span>Por vencer ≤12m</span>
                  <strong>{fmt(compliance.licencias.proximoVencer)}</strong>
                </div>
              </div>
            </>
          ) : (
            <EmptyPanel
              text="Sin licencias registradas"
              to="/entrada-datos/licencias-ambientales"
            />
          )}
        </section>
      </div>

      <RegionalAirQualityPanel />

      <div className="dash-secondary-grid dash-geo-grid">
        <section className="dash-panel dash-map-panel">
          <div className="dash-panel-head row">
            <div>
              <h2>
                <MapPinned size={18} />
                Mapa de plantas
              </h2>
              <p>
                {sites.plantCount} plantas · clima y calidad de aire ·{' '}
                {sites.operative} sitios en {sites.countriesCount} países
              </p>
            </div>
            <Link to="/mapa" className="btn-secondary-link">
              Abrir mapa →
            </Link>
          </div>
          <DashboardMap />
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Presencia regional</h2>
            <p>Sitios operativos del inventario georreferenciado</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
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
                <Bar
                  dataKey="sites"
                  name="Sitios"
                  radius={[0, 8, 8, 0]}
                  barSize={16}
                >
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

      {insights.length > 0 && (
        <section className="dash-panel dash-recs">
          <div className="dash-panel-head row">
            <div>
              <h2>
                <Sparkles size={18} />
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
