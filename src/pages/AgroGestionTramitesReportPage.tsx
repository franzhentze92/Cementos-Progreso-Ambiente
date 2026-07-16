import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Loader2,
  MapPin,
  Sprout,
} from 'lucide-react'
import {
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
import { TramitesMap } from '../components/TramitesMap'
import {
  AGRO_TRAMITES_ESTADOS,
  AGRO_TRAMITES_PRIORIDADES,
  AGRO_TRAMITES_SEDES,
} from '../data/agroGestionTramites'
import {
  buildAgroGestionTramitesReport,
  type AgroGestionTramitesReport,
} from '../data/agroGestionTramitesReport'
import { loadAgroGestionTramites } from '../lib/agroGestionTramitesApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const ESTADO_COLORS: Record<string, string> = {
  Cerrado: '#047935',
  'En proceso': '#3b82f6',
  'Por solicitar': '#d97706',
}

const PRIORIDAD_COLORS: Record<string, string> = {
  Normal: '#5ab64b',
  Alta: '#c0392b',
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const FILTER_ALL = 'all'

function estadoBadgeClass(estado: string): string {
  if (estado === 'Cerrado') return 'agro-badge-ok'
  if (estado === 'En proceso') return 'agro-badge-info'
  if (estado === 'Por solicitar') return 'agro-badge-warn'
  return ''
}

function prioridadBadgeClass(prioridad: string): string {
  if (prioridad === 'Alta') return 'agro-badge-warn'
  return 'agro-badge-ok'
}

export function AgroGestionTramitesReportPage() {
  const [report, setReport] = useState<AgroGestionTramitesReport | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)
  const [filterSede, setFilterSede] = useState(FILTER_ALL)
  const [filterPrioridad, setFilterPrioridad] = useState(FILTER_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const records = await loadAgroGestionTramites()
        if (cancelled) return
        const built = buildAgroGestionTramitesReport(records, year)
        setYears(built.meta.years)
        setReport(built)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte de trámites',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year])

  const filteredDetail = useMemo(() => {
    if (!report) return []
    return report.detailRows.filter((row) => {
      if (filterEstado !== FILTER_ALL && row.estado !== filterEstado)
        return false
      if (filterSede !== FILTER_ALL && row.sede !== filterSede) return false
      if (filterPrioridad !== FILTER_ALL && row.prioridad !== filterPrioridad)
        return false
      return true
    })
  }, [report, filterEstado, filterSede, filterPrioridad])

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando analytics de trámites…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/agroprogreso/gestion-de-tramites"
            className="btn-secondary-link"
          >
            Ir a captura →
          </Link>
        </div>
      </div>
    )
  }

  const { meta, kpis, insights } = report

  return (
    <div className="carbon-page agro-tramites-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · Agroprogreso · Analytics
          </p>
          <h1>Gestión de trámites</h1>
          <p>
            Hoja C. Admin corporativo · estados, prioridad y carga por
            responsable · {meta.periodLabel}
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>En proceso</span>
            <strong>{meta.enProceso}</strong>
          </div>
          <div>
            <span>Prioridad alta</span>
            <strong>{meta.alta}</strong>
          </div>
          <div>
            <span>Periodo</span>
            <label
              className="agro-year-filter"
              htmlFor="agro-tramites-report-year"
            >
              <select
                id="agro-tramites-report-year"
                value={year === 'all' ? 'all' : String(year)}
                onChange={(e) => {
                  const v = e.target.value
                  setYear(v === 'all' ? 'all' : Number(v))
                }}
              >
                <option value="all">Todos los años</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="carbon-kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.id} className="carbon-kpi">
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <p>{kpi.hint}</p>
          </article>
        ))}
      </div>

      {insights.length > 0 ? (
        <div className="carbon-alerts">
          {insights.map((alert) => (
            <article
              key={alert.id}
              className={`carbon-alert ${ALERT_CLASS[alert.level]}`}
            >
              {alert.level === 'Positivo' ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
              <div>
                <strong>
                  {alert.level}: {alert.title}
                </strong>
                <p>{alert.text}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="carbon-main-grid agro-mon-top-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <MapPin size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Mapa por sede
            </h2>
            <p>{report.mapSites.length} sede(s) con trámites</p>
          </div>
          <TramitesMap sites={report.mapSites} />
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <FolderKanban
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Estado del catálogo
            </h2>
            <p>Distribución En proceso / Cerrado / Por solicitar</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={report.byEstado}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {report.byEstado.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={ESTADO_COLORS[entry.name] ?? '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Por sede</h2>
            <p>Conteo y prioridad alta</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.bySede} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="sede" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  dataKey="enProceso"
                  name="En proceso"
                  stackId="a"
                  fill="#3b82f6"
                />
                <Bar
                  dataKey="cerrado"
                  name="Cerrado"
                  stackId="a"
                  fill="#047935"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Carga por responsable</h2>
            <p>Trámites totales y en proceso</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={report.byAsignado}
                margin={{ left: 4, right: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  dataKey="total"
                  name="Total"
                  fill="#1a5c3a"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="enProceso"
                  name="En proceso"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Tipo de proyecto</h2>
            <p>ETAR, licencia, instrumento…</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={report.byProyecto}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="value"
                  name="Trámites"
                  fill="#5ab64b"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Prioridad</h2>
            <p>Normal vs Alta</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={report.byPrioridad}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {report.byPrioridad.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PRIORIDAD_COLORS[entry.name] ?? '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2>Detalle de trámites</h2>
            <p>
              {filteredDetail.length} de {report.detailRows.length} filas
            </p>
          </div>
          <Link
            to="/entrada-datos/agroprogreso/gestion-de-tramites"
            className="btn-secondary-link"
          >
            Editar catálogo →
          </Link>
        </div>

        <div className="agro-table-filters" aria-label="Filtros detalle">
          <label>
            Sede
            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {AGRO_TRAMITES_SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {AGRO_TRAMITES_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {AGRO_TRAMITES_PRIORIDADES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="carbon-table-wrap agro-lic-catalog-wrap">
          <table className="carbon-table agro-lic-catalog">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Sede</th>
                <th>Proyecto</th>
                <th>Estado</th>
                <th>Asignado</th>
                <th>Prioridad</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDetail.length === 0 ? (
                <tr>
                  <td colSpan={7} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredDetail.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-exp">{row.fecha}</td>
                    <td className="agro-lic-sede">{row.sede}</td>
                    <td className="agro-lic-name">{row.proyecto}</td>
                    <td className="agro-lic-est">
                      <span className={estadoBadgeClass(row.estado)}>
                        {row.estado}
                      </span>
                    </td>
                    <td className="agro-lic-name">{row.asignado || '—'}</td>
                    <td className="agro-lic-est">
                      <span className={prioridadBadgeClass(row.prioridad)}>
                        {row.prioridad}
                      </span>
                    </td>
                    <td className="agro-obs-cell">{row.observaciones}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="carbon-footnote">
        Solo trámites Agroprogreso (C. Admin corporativo). Coordenadas de mapa
        son de referencia por sede.
      </p>
    </div>
  )
}
