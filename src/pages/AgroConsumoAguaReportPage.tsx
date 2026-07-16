import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Loader2,
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
  buildAgroAguaReport,
  type AgroAguaReport,
} from '../data/agroConsumoAguaReport'
import { formatNum } from '../data/agroConsumoAgua'
import { loadAgroConsumoAgua } from '../lib/agroConsumoAguaApi'

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

function formatDelta(delta: number | null | undefined) {
  if (delta == null || Number.isNaN(delta)) return null
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}%`
}

export function AgroConsumoAguaReportPage() {
  const [report, setReport] = useState<AgroAguaReport | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawCount, setRawCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const records = await loadAgroConsumoAgua()
        if (cancelled) return
        setRawCount(records.length)
        const built = buildAgroAguaReport(records, year)
        setYears(built.meta.years)
        setReport(built)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte de consumo de agua',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year])

  const maxSitio = useMemo(
    () =>
      report?.sitioRanking.reduce((m, s) => Math.max(m, s.value), 0) ?? 0,
    [report],
  )

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando consumo de agua Agroprogreso…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/agroprogreso/consumo-de-agua"
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
    <div className="carbon-page agro-agua-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · Agroprogreso
          </p>
          <h1>Consumo de agua</h1>
          <p>
            Datos reales · hoja AGRO Consumo de agua ·{' '}
            {meta.periodLabel}
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Registros</span>
            <strong>
              {meta.recordsWithValue}/{meta.totalRecords}
            </strong>
          </div>
          <div>
            <span>Cobertura de lecturas</span>
            <strong>{meta.coveragePct.toFixed(0)}%</strong>
          </div>
          <div>
            <span>Periodo</span>
            <label className="agro-year-filter" htmlFor="agro-report-year">
              <select
                id="agro-report-year"
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
        {kpis.map((kpi) => {
          const deltaText = formatDelta(kpi.delta)
          const down = kpi.delta != null ? kpi.delta <= 0 : false
          return (
            <article key={kpi.id} className="carbon-kpi">
              <span>{kpi.label}</span>
              <strong>
                {kpi.value}
                {kpi.unit ? <small>{kpi.unit}</small> : null}
              </strong>
              {deltaText && kpi.deltaLabel ? (
                <div className={`carbon-delta ${down ? 'down' : 'up'}`}>
                  {deltaText} {kpi.deltaLabel}
                </div>
              ) : null}
              <p>{kpi.hint}</p>
            </article>
          )
        })}
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
              <Droplets size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Evolución mensual del consumo
            </h2>
            <p>Total m³ por mes (solo lecturas con valor)</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={report.monthlyTotal}>
              <defs>
                <linearGradient id="aguaTotalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#047935" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#047935" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="total"
                name="Consumo (m³)"
                stroke="#047935"
                fill="url(#aguaTotalFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Participación por sede</h2>
            <p>Distribución del volumen total del periodo</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={report.sedeShare}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
              >
                {report.sedeShare.map((s) => (
                  <Cell key={s.name} fill={s.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [
                  `${formatNum(Number(value))} m³`,
                  'Consumo',
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <ul className="agro-share-list">
            {report.sedeShare.map((s) => (
              <li key={s.name}>
                <i style={{ background: s.fill }} />
                <span>{s.name}</span>
                <strong>{formatNum(s.value)} m³</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Consumo mensual por finca</h2>
            <p>Finca El Pilar vs Finca San Miguel</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.monthlyBySede}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis
                dataKey={meta.selectedYear === 'all' ? 'fecha' : 'month'}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) =>
                  meta.selectedYear === 'all' ? String(v).slice(2, 7) : v
                }
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar
                dataKey="pilar"
                name="Finca El Pilar"
                stackId="s"
                fill="#047935"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="sanMiguel"
                name="Finca San Miguel"
                stackId="s"
                fill="#5ab64b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Ranking de sitios</h2>
            <p>Mayor a menor consumo acumulado (m³)</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={report.sitioRanking}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={118}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, _n, item) => [
                  `${formatNum(Number(value))} m³`,
                  (item?.payload as { sede?: string })?.sede ?? 'Sitio',
                ]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {report.sitioRanking.map((s) => (
                  <Cell key={`${s.sede}-${s.name}`} fill={s.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {report.sitioKeys.length > 0 ? (
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Composición mensual por sitio (top 6)</h2>
            <p>
              Los sitios de mayor volumen del periodo · apilados mes a mes
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.sitioMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {report.sitioKeys.map((sk, idx) => (
                <Bar
                  key={sk.key}
                  dataKey={sk.key}
                  name={sk.label}
                  stackId="sitios"
                  fill={sk.fill}
                  radius={
                    idx === report.sitioKeys.length - 1
                      ? [4, 4, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </section>
      ) : null}

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Cobertura de captura por sitio</h2>
            <p>
              Meses con lectura / meses del periodo · total acumulado
            </p>
          </div>
          <div className="carbon-table-wrap">
            <table className="carbon-table">
              <thead>
                <tr>
                  <th>Sede</th>
                  <th>Sitio</th>
                  <th>Meses con dato</th>
                  <th>Cobertura</th>
                  <th>Total m³</th>
                </tr>
              </thead>
              <tbody>
                {report.completeness.map((row) => (
                  <tr key={`${row.sede}-${row.sitio}`}>
                    <td>{row.sede.replace('Finca ', '')}</td>
                    <td>{row.sitio}</td>
                    <td>
                      {row.monthsWithData}/{row.monthsTotal}
                    </td>
                    <td>
                      <div className="agro-coverage-bar">
                        <span
                          style={{
                            width: `${Math.min(100, row.coveragePct)}%`,
                          }}
                        />
                        <em>{row.coveragePct.toFixed(0)}%</em>
                      </div>
                    </td>
                    <td>{formatNum(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Participación relativa de sitios</h2>
            <p>% del volumen total del periodo</p>
          </div>
          <div className="agro-share-bars">
            {report.sitioRanking.map((s) => (
              <div key={`${s.sede}-${s.name}`} className="agro-share-row">
                <div className="agro-share-meta">
                  <strong>{s.name}</strong>
                  <span>{s.sede.replace('Finca ', '')}</span>
                </div>
                <div className="agro-share-track">
                  <span
                    style={{
                      width: `${maxSitio ? (s.value / maxSitio) * 100 : 0}%`,
                      background: s.fill,
                    }}
                  />
                </div>
                <em>
                  {s.share.toFixed(1)}% · {formatNum(s.value)} m³
                </em>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head row">
          <div>
            <h2>Detalle de lecturas</h2>
            <p>
              {report.detailRows.length} filas con valor ({rawCount} totales)
            </p>
          </div>
          <Link
            to="/entrada-datos/agroprogreso/consumo-de-agua"
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
                <th>Sitio de consumo</th>
                <th>Consumo (m³)</th>
              </tr>
            </thead>
            <tbody>
              {report.detailRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>Sin lecturas numéricas en el periodo.</td>
                </tr>
              ) : (
                report.detailRows.map((row, i) => (
                  <tr key={`${row.fecha}-${row.sede}-${row.sitio}-${i}`}>
                    <td>{row.fecha}</td>
                    <td>{row.mes}</td>
                    <td>{row.sede}</td>
                    <td>{row.sitio}</td>
                    <td>{formatNum(row.consumo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="agro-report-footnote">
        Total del periodo: <strong>{formatNum(totals.totalM3)} m³</strong>
        {totals.avgMonthly != null
          ? ` · promedio ${formatNum(totals.avgMonthly)} m³/mes`
          : ''}
        {totals.topSitio ? ` · mayor sitio: ${totals.topSitio}` : ''}. Solo se
        muestran consumos con valor en base de datos (celdas vacías del Excel =
        sin lectura).
      </p>
    </div>
  )
}
