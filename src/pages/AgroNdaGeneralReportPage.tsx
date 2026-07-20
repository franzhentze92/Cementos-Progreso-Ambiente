import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  HardHat,
  Loader2,
  MapPin,
  Sprout,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { NdaGeneralMap } from '../components/NdaGeneralMap'
import {
  AGRO_NDA_SEDES,
  MONITORING_MONTHS,
  formatNum,
} from '../data/agroNdaGeneral'
import {
  buildAgroNdaGeneralReport,
  type AgroNdaGeneralReport,
} from '../data/agroNdaGeneralReport'
import { loadAgroNdaGeneral } from '../lib/agroNdaGeneralApi'

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

export function AgroNdaGeneralReportPage() {
  const [report, setReport] = useState<AgroNdaGeneralReport | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [filterSede, setFilterSede] = useState(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState(FILTER_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const records = await loadAgroNdaGeneral()
        if (cancelled) return
        const built = buildAgroNdaGeneralReport(records, year)
        setYears(built.meta.years)
        setReport(built)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte NDA General',
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
      if (filterMonth !== FILTER_ALL && row.mes !== filterMonth) return false
      return true
    })
  }, [report, filterSede, filterMonth])

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando analytics NDA General…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/agroprogreso/nda-general"
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
    <div className="carbon-page agro-nda-general-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · Agroprogreso · Analytics
          </p>
          <h1>NDA General</h1>
          <p>
            Hoja AGRO NDA · índice ponderado IDA / Casco / Incidentes /
            Compromisos · {meta.periodLabel}
          </p>
          <div className="hc-header-actions" style={{ marginTop: 12 }}>
            <Link
              to="/operaciones/nda-casco-verde?proyecto=agroprogreso"
              className="btn-primary"
            >
              <HardHat size={16} />
              Inspecciones casco verde
            </Link>
          </div>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>NDA prom.</span>
            <strong>
              {totals.avgNda == null ? '—' : formatNum(totals.avgNda, 1)}
            </strong>
          </div>
          <div>
            <span>Registros</span>
            <strong>{meta.totalRows}</strong>
          </div>
          <div>
            <span>Periodo</span>
            <label className="agro-year-filter" htmlFor="agro-nda-report-year">
              <select
                id="agro-nda-report-year"
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
            <p>{report.mapSites.length} sede(s) con NDA</p>
          </div>
          <NdaGeneralMap sites={report.mapSites} />
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Gauge
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Tendencia NDA
            </h2>
            <p>Promedio mensual del índice</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={report.monthly} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[90, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatNum(Number(v ?? 0), 1)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgNda"
                  name="NDA"
                  stroke="#047935"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="avgCasco"
                  name="Casco"
                  stroke="#5ab64b"
                  strokeWidth={1.75}
                  strokeDasharray="4 3"
                  dot={false}
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
            <h2>NDA por sede</h2>
            <p>Promedio del periodo</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.bySede} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis
                  dataKey="sede"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-14}
                  textAnchor="end"
                  height={68}
                />
                <YAxis domain={[90, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatNum(Number(v ?? 0), 1)}
                />
                <Legend />
                <Bar
                  dataKey="avgNda"
                  name="NDA"
                  fill="#047935"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="avgCasco"
                  name="Casco"
                  fill="#5ab64b"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Componentes (promedio)</h2>
            <p>Pesos Excel: 40 / 30 / 15 / 15</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={report.componentShare}
                margin={{ left: 4, right: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, _n, item) => {
                    const weight = (item?.payload as { weight?: number })
                      ?.weight
                    return [
                      `${formatNum(Number(v ?? 0), 1)}${weight != null ? ` · ${weight}%` : ''}`,
                      'Promedio',
                    ]
                  }}
                />
                <Bar
                  dataKey="avg"
                  name="Promedio"
                  fill="#1a5c3a"
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
            <h2>Detalle NDA</h2>
            <p>
              {filteredDetail.length} de {report.detailRows.length} filas
            </p>
          </div>
          <Link
            to="/entrada-datos/agroprogreso/nda-general"
            className="btn-secondary-link"
          >
            Editar captura →
          </Link>
        </div>

        <div className="agro-table-filters" aria-label="Filtros detalle NDA">
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
              {AGRO_NDA_SEDES.map((s) => (
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
                <th>IDA</th>
                <th>Casco</th>
                <th>Inc.</th>
                <th>Comp.</th>
                <th>NDA</th>
              </tr>
            </thead>
            <tbody>
              {filteredDetail.length === 0 ? (
                <tr>
                  <td colSpan={8} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredDetail.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-exp">{row.fecha}</td>
                    <td className="agro-lic-sede">{row.sede}</td>
                    <td className="agro-lic-name">{row.proyecto}</td>
                    <td className="agro-lic-cat">{formatNum(row.ida, 0)}</td>
                    <td className="agro-lic-cat">
                      {formatNum(row.casco, 0)}
                    </td>
                    <td className="agro-lic-cat">
                      {formatNum(row.incidentes, 0)}
                    </td>
                    <td className="agro-lic-cat">
                      {formatNum(row.compromisos, 0)}
                    </td>
                    <td className="agro-lic-cat">
                      <span className="agro-lic-chip">
                        {formatNum(row.nda, 1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="carbon-footnote">
        Solo NDA Agroprogreso. Fórmula: IDA×0.40 + Casco×0.30 +
        Incidentes×0.15 + Compromisos×0.15.
      </p>
    </div>
  )
}
