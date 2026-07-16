import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Recycle,
  Sprout,
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
  AGRO_COMPOSTAJE_FINCAS,
  MONITORING_MONTHS,
  formatNum,
} from '../data/agroCompostaje'
import {
  buildAgroCompostajeReport,
  type AgroCompostajeReport,
} from '../data/agroCompostajeReport'
import { loadAgroCompostaje } from '../lib/agroCompostajeApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const FINCA_COLORS: Record<string, string> = {
  'Finca El Pilar': '#047935',
  'Finca San Miguel': '#5ab64b',
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const FILTER_ALL = 'all'

export function AgroCompostajeReportPage() {
  const [report, setReport] = useState<AgroCompostajeReport | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [filterFinca, setFilterFinca] = useState(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState(FILTER_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const records = await loadAgroCompostaje()
        if (cancelled) return
        const built = buildAgroCompostajeReport(records, year)
        setYears(built.meta.years)
        setReport(built)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte de compostaje',
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
      if (filterFinca !== FILTER_ALL && row.finca !== filterFinca) return false
      if (filterMonth !== FILTER_ALL && row.mes !== filterMonth) return false
      return true
    })
  }, [report, filterFinca, filterMonth])

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando analytics de compostaje…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/agroprogreso/compostaje"
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
    <div className="carbon-page agro-compostaje-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · Agroprogreso · Analytics
          </p>
          <h1>Compostaje</h1>
          <p>
            Hoja Compostaje desechos orgánicos · toneladas por finca y tendencia
            mensual · {meta.periodLabel}
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Total (t)</span>
            <strong>{formatNum(totals.total, 2)}</strong>
          </div>
          <div>
            <span>Meses con dato</span>
            <strong>{meta.monthsWithData}</strong>
          </div>
          <div>
            <span>Periodo</span>
            <label className="agro-year-filter" htmlFor="agro-compost-report-year">
              <select
                id="agro-compost-report-year"
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
              <Recycle
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Tendencia mensual
            </h2>
            <p>Toneladas compostadas por mes (apilado por finca)</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={report.monthly} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [
                    `${formatNum(Number(v ?? 0), 2)} t`,
                    '',
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="pilar"
                  name="Finca El Pilar"
                  stackId="1"
                  stroke="#047935"
                  fill="#047935"
                  fillOpacity={0.75}
                />
                <Area
                  type="monotone"
                  dataKey="sanMiguel"
                  name="Finca San Miguel"
                  stackId="1"
                  stroke="#5ab64b"
                  fill="#5ab64b"
                  fillOpacity={0.75}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Participación por finca</h2>
            <p>Distribución del total compostado</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={report.byFinca}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {report.byFinca.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={FINCA_COLORS[entry.name] ?? '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => `${formatNum(Number(v ?? 0), 2)} t`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2>Comparativo mensual</h2>
          <p>Barras por finca · total del periodo</p>
        </div>
        <div className="carbon-chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.monthly} margin={{ left: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => `${formatNum(Number(v ?? 0), 2)} t`}
              />
              <Legend />
              <Bar
                dataKey="pilar"
                name="Finca El Pilar"
                fill="#047935"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="sanMiguel"
                name="Finca San Miguel"
                fill="#5ab64b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2>Detalle</h2>
            <p>
              {filteredDetail.length} de {report.detailRows.length} registros
            </p>
          </div>
          <Link
            to="/entrada-datos/agroprogreso/compostaje"
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
            Finca
            <select
              value={filterFinca}
              onChange={(e) => setFilterFinca(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {AGRO_COMPOSTAJE_FINCAS.map((f) => (
                <option key={f} value={f}>
                  {f}
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
                <th>Mes</th>
                <th>Finca</th>
                <th>Toneladas</th>
              </tr>
            </thead>
            <tbody>
              {filteredDetail.length === 0 ? (
                <tr>
                  <td colSpan={4} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredDetail.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-exp">{row.fecha}</td>
                    <td className="agro-lic-sede">{row.mes}</td>
                    <td className="agro-lic-name">{row.finca}</td>
                    <td className="agro-lic-cat">
                      <span className="agro-lic-chip">
                        {formatNum(row.toneladas, 2)}
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
        Solo compostaje Agroprogreso (Finca El Pilar y Finca San Miguel).
      </p>
    </div>
  )
}
