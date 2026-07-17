import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  buildAgroInspeccionReport,
  type AgroInspeccionReport,
} from '../data/agroInspeccionesReport'
import { formatNum } from '../data/agroInspecciones'
import { loadInspeccionesForScopes } from '../lib/operationalAggregateApi'
import { InspeccionAbrirLink } from '../components/InspeccionAbrirLink'
import {
  PROJECT_SCOPE_LABELS,
  scopesLabel,
  type ProjectScope,
} from '../data/operationalModules'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const RIESGO_COLORS: Record<string, string> = {
  Bajo: '#047935',
  Medio: '#c9a227',
  Alto: '#c0392b',
  '(sin dato)': '#9aa3a0',
}

const SEDE_COLORS = ['#047935', '#5ab64b', '#1a5c3a', '#8bc34a', '#2e7d32']

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

export function AgroInspeccionesReportPage({
  scopes = ['agroprogreso'],
}: {
  scopes?: ProjectScope[]
}) {
  const [report, setReport] = useState<AgroInspeccionReport | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawCount, setRawCount] = useState(0)

  const scopeKey = scopes.join(',')
  const projectLabel = scopesLabel(scopes)
  const entryScope = scopes[0] ?? 'agroprogreso'
  const entryPath = `/entrada-datos/inspeccion-ambiental?proyecto=${entryScope}`

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const records = await loadInspeccionesForScopes(scopes)
        if (cancelled) return
        setRawCount(records.length)
        const built = buildAgroInspeccionReport(records, year)
        setYears(built.meta.years)
        setReport(built)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte de inspecciones',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year, scopeKey])

  const chartMonthly = useMemo(
    () =>
      (report?.monthlyAvg ?? [])
        .filter((m) => m.count > 0 || year !== 'all')
        .map((m) => ({
          ...m,
          avgScore: m.avgScore ?? 0,
        })),
    [report, year],
  )

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando inspección ambiental ({projectLabel})…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link to={entryPath} className="btn-secondary-link">
            Ir a captura →
          </Link>
        </div>
      </div>
    )
  }

  const { meta, kpis, insights, totals } = report

  return (
    <div className="carbon-page agro-inspecciones-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · {projectLabel}
          </p>
          <h1>Inspección ambiental</h1>
          <p>
            Datos reales · Ejecuciones inspecciones
            ({scopes.map((s) => PROJECT_SCOPE_LABELS[s]).join(', ')}) ·{' '}
            {meta.periodLabel}
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Inspecciones</span>
            <strong>{meta.totalRows}</strong>
          </div>
          <div>
            <span>Con acción inmediata</span>
            <strong>{meta.accionInmediata}</strong>
          </div>
          <div>
            <span>Periodo</span>
            <label className="agro-year-filter" htmlFor="agro-insp-report-year">
              <select
                id="agro-insp-report-year"
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

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <ClipboardList
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Resultado promedio mensual
            </h2>
            <p>Puntaje 0–100 · línea de inspecciones por mes</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="short" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgScore"
                name="Promedio"
                stroke="#047935"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Inspecciones"
                stroke="#5ab64b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Nivel de riesgo</h2>
            <p>Distribución de inspecciones</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={report.riesgoShare}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
              >
                {report.riesgoShare.map((s) => (
                  <Cell
                    key={s.name}
                    fill={RIESGO_COLORS[s.name] ?? '#047935'}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Inspecciones por sede</h2>
            <p>Cantidad y resultado promedio</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.sedeRanking}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="sede" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Inspecciones" radius={[6, 6, 0, 0]}>
                {report.sedeRanking.map((s, i) => (
                  <Cell
                    key={s.sede}
                    fill={SEDE_COLORS[i % SEDE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Hallazgos por mes</h2>
            <p>Suma de no. de hallazgos</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="short" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="hallazgos"
                name="Hallazgos"
                fill="#c9a227"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head row">
          <div>
            <h2>Detalle de inspecciones</h2>
            <p>
              {report.detailRows.length} filas ({rawCount} totales)
            </p>
          </div>
          <Link
            to={entryPath}
            className="btn-secondary-link"
          >
            Ir a captura →
          </Link>
        </div>
        <div className="carbon-table-wrap agro-detail-wrap">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Mes</th>
                <th>Sede</th>
                <th>Responsable</th>
                <th>Resultado</th>
                <th>Hallazgos</th>
                <th>Riesgo</th>
                <th>Acción</th>
                <th>Observaciones</th>
                <th>Informe</th>
              </tr>
            </thead>
            <tbody>
              {report.detailRows.length === 0 ? (
                <tr>
                  <td colSpan={10}>Sin inspecciones en el periodo.</td>
                </tr>
              ) : (
                report.detailRows.map((row, i) => (
                  <tr key={`${row.fecha}-${row.sede}-${i}`}>
                    <td>{row.fecha}</td>
                    <td>{row.mes}</td>
                    <td>{row.sede}</td>
                    <td>{row.responsable}</td>
                    <td>{formatNum(row.resultado, 0)}</td>
                    <td>{formatNum(row.hallazgos, 0)}</td>
                    <td>{row.riesgo}</td>
                    <td>{row.accion}</td>
                    <td>{row.observaciones}</td>
                    <td>
                      <InspeccionAbrirLink
                        link={row.link}
                        fecha={row.fecha}
                        plantaSede={row.sede}
                        unidadNegocio={row.unidadNegocio}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="agro-report-footnote">
        Resultado promedio del periodo:{' '}
        <strong>{formatNum(totals.avgScore, 1)}</strong>
        {totals.totalHallazgos
          ? ` · ${totals.totalHallazgos} hallazgo(s) acumulados`
          : ''}
        . Solo datos reales ({projectLabel}
        {rawCount ? ` · ${rawCount} registro(s)` : ''}).
      </p>
    </div>
  )
}
