import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  HardHat,
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
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { CascoVerdeMap } from '../components/CascoVerdeMap'
import {
  AGRO_NDA_CV_INSPECTORES,
  AGRO_NDA_CV_SEDES,
  MONITORING_MONTHS,
  formatNum,
} from '../data/agroNdaCascoVerde'
import {
  buildAgroNdaCascoVerdeReport,
  type AgroNdaCascoVerdeReport,
} from '../data/agroNdaCascoVerdeReport'
import { loadAgroNdaCascoVerde } from '../lib/agroNdaCascoVerdeApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const FILTER_ALL = 'all'
const SEDE_COLORS = ['#047935', '#5ab64b', '#1a5c3a', '#8bc34a', '#2e7d32']

export function AgroNdaCascoVerdeReportPage() {
  const [report, setReport] = useState<AgroNdaCascoVerdeReport | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [filterSede, setFilterSede] = useState(FILTER_ALL)
  const [filterInspector, setFilterInspector] = useState(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState(FILTER_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const records = await loadAgroNdaCascoVerde()
        if (cancelled) return
        const built = buildAgroNdaCascoVerdeReport(records, year)
        setYears(built.meta.years)
        setReport(built)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte NDA Casco Verde',
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
      if (filterSede !== FILTER_ALL && row.sede !== filterSede) return false
      if (filterInspector !== FILTER_ALL && row.inspector !== filterInspector)
        return false
      if (filterMonth !== FILTER_ALL && row.mes !== filterMonth) return false
      return true
    })
  }, [report, filterSede, filterInspector, filterMonth])

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando analytics NDA Casco Verde…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/nda-casco-verde?proyecto=agroprogreso"
            className="btn-secondary-link"
          >
            Ir a captura →
          </Link>
        </div>
      </div>
    )
  }

  const { meta, kpis, insights, totals } = report

  return (
    <div className="carbon-page agro-casco-verde-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · NDA General · Agroprogreso
          </p>
          <h1>Inspecciones casco verde</h1>
          <p>
            Hoja AGRO NDA Casco verde · notas, hallazgos y cobertura por sede ·{' '}
            {meta.periodLabel}
          </p>
          <div className="hc-header-actions" style={{ marginTop: 12 }}>
            <Link
              to="/operaciones/nda-general?proyecto=agroprogreso"
              className="btn-secondary-link"
            >
              <ArrowLeft size={16} />
              Volver a NDA General
            </Link>
          </div>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Inspecciones</span>
            <strong>{meta.totalRows}</strong>
          </div>
          <div>
            <span>Nota promedio</span>
            <strong>
              {totals.avgNota == null ? '—' : formatNum(totals.avgNota, 1)}
            </strong>
          </div>
          <div>
            <span>Periodo</span>
            <label className="agro-year-filter" htmlFor="agro-cv-report-year">
              <select
                id="agro-cv-report-year"
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
            <p>{report.mapSites.length} sede(s) con coordenadas</p>
          </div>
          <CascoVerdeMap sites={report.mapSites} />
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <HardHat
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Nota promedio mensual
            </h2>
            <p>Evolución de la calificación Casco Verde</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={report.monthlyAvg} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatNum(Number(v ?? 0), 1)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgNota"
                  name="Nota prom."
                  stroke="#047935"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Por sede</h2>
            <p>Cantidad de inspecciones y hallazgos</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.bySede} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis
                  dataKey="sede"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-16}
                  textAnchor="end"
                  height={70}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="count" name="Inspecciones" radius={[6, 6, 0, 0]}>
                  {report.bySede.map((entry, i) => (
                    <Cell
                      key={entry.sede}
                      fill={SEDE_COLORS[i % SEDE_COLORS.length]}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="hallazgos"
                  name="Hallazgos"
                  fill="#c0392b"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Por inspector</h2>
            <p>Cobertura y nota promedio</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={report.byInspector}
                margin={{ left: 4, right: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[80, 100]}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="count"
                  name="Inspecciones"
                  fill="#047935"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="avgNota"
                  name="Nota prom."
                  fill="#5ab64b"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2>Detalle de inspecciones</h2>
            <p>
              {filteredDetail.length} de {report.detailRows.length} filas
            </p>
          </div>
          <Link
            to="/entrada-datos/nda-casco-verde?proyecto=agroprogreso"
            className="btn-secondary-link"
          >
            Editar captura →
          </Link>
        </div>

        <div className="agro-table-filters" aria-label="Filtros detalle">
          <label>
            Mes
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {MONITORING_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sede
            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {AGRO_NDA_CV_SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Inspector
            <select
              value={filterInspector}
              onChange={(e) => setFilterInspector(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {AGRO_NDA_CV_INSPECTORES.map((s) => (
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
                <th>Sem.</th>
                <th>Sede</th>
                <th>No.</th>
                <th>Inspector</th>
                <th>Nota</th>
                <th>Hall.</th>
                <th>Observaciones</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {filteredDetail.length === 0 ? (
                <tr>
                  <td colSpan={9} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredDetail.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-exp">{row.fecha}</td>
                    <td className="agro-lic-cat">{row.semana ?? '—'}</td>
                    <td className="agro-lic-sede">{row.sede}</td>
                    <td className="agro-lic-cat">
                      {row.noInspeccion ?? '—'}
                    </td>
                    <td className="agro-lic-name">{row.inspector}</td>
                    <td className="agro-lic-cat">
                      <span className="agro-lic-chip">
                        {formatNum(row.nota, 0)}
                      </span>
                    </td>
                    <td className="agro-lic-cat">{row.hallazgos}</td>
                    <td className="agro-obs-cell">{row.observaciones}</td>
                    <td>
                      {row.link ? (
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary-link"
                          title="Abrir informe"
                        >
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="carbon-footnote">
        Solo inspecciones Casco Verde · Agroprogreso. Coordenadas de mapa son
        de referencia por sede.
      </p>
    </div>
  )
}
