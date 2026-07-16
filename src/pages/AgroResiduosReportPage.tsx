import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sprout,
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
  buildAgroResiduosReport,
  type AgroResiduosReport,
} from '../data/agroResiduosReport'
import { formatNum } from '../data/agroResiduos'
import { loadAgroResiduos } from '../lib/agroResiduosApi'

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

export function AgroResiduosReportPage() {
  const [report, setReport] = useState<AgroResiduosReport | null>(null)
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
        const records = await loadAgroResiduos()
        if (cancelled) return
        setRawCount(records.length)
        const built = buildAgroResiduosReport(records, year)
        setYears(built.meta.years)
        setReport(built)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte de residuos',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year])

  const maxTipo = useMemo(
    () => report?.tipoRanking.reduce((m, s) => Math.max(m, s.value), 0) ?? 0,
    [report],
  )

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando gestión de residuos Agroprogreso…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/agroprogreso/gestion-de-residuos"
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
    <div className="carbon-page agro-residuos-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · Agroprogreso
          </p>
          <h1>Gestión de residuos</h1>
          <p>
            Datos reales · hoja AGRO Gestión de residuos fincas ·{' '}
            {meta.periodLabel}
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Filas / con cantidad</span>
            <strong>
              {meta.totalRows}/{meta.rowsWithQty}
            </strong>
          </div>
          <div>
            <span>Cantidad &gt; 0</span>
            <strong>{meta.rowsPositiveQty}</strong>
          </div>
          <div>
            <span>Periodo</span>
            <label className="agro-year-filter" htmlFor="agro-res-report-year">
              <select
                id="agro-res-report-year"
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
              <Trash2 size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Volumen mensual (lbs)
            </h2>
            <p>Suma de cantidades del mes (incluye ceros del Excel)</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={report.monthlyTonsLike}>
              <defs>
                <linearGradient id="resTotalFill" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="totalLbs"
                name="Cantidad (lbs)"
                stroke="#047935"
                fill="url(#resTotalFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Volumen por sede</h2>
            <p>Distribución de libras positivas</p>
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
                  `${formatNum(Number(value))} lbs`,
                  'Cantidad',
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
                <strong>{formatNum(s.value)} lbs</strong>
              </li>
            ))}
            {!report.sedeShare.length ? (
              <li>
                <span>Sin cantidades positivas en el periodo</span>
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Ruta de gestión (lbs &gt; 0)</h2>
            <p>Volumen por ruta de destino</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.rutaShare}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="lbs" radius={[6, 6, 0, 0]}>
                {report.rutaShare.map((s) => (
                  <Cell key={s.name} fill={s.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Tipos con mayor volumen</h2>
            <p>Ranking por libras positivas</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={report.tipoRanking}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {report.tipoRanking.map((s) => (
                  <Cell key={s.name} fill={s.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Clasificación técnica (filas)</h2>
            <p>Conteo de registros Ordinario / Especial / Peligroso</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={report.tecnicaShare}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
              >
                {report.tecnicaShare.map((s) => (
                  <Cell key={s.name} fill={s.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Clasificación operativa (filas)</h2>
            <p>Distribución del catálogo de gestión</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={report.operativaShare}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Filas" radius={[6, 6, 0, 0]}>
                {report.operativaShare.map((s) => (
                  <Cell key={s.name} fill={s.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Gestores / plantas (lbs &gt; 0)</h2>
            <p>Destino operativo del volumen positivo</p>
          </div>
          <div className="agro-share-bars">
            {report.gestorRanking.length === 0 ? (
              <p className="agro-report-footnote">
                Sin volúmenes positivos para detallar gestores.
              </p>
            ) : (
              report.gestorRanking.map((s) => (
                <div key={s.name} className="agro-share-row">
                  <div className="agro-share-meta">
                    <strong>{s.name}</strong>
                    <span>{s.rows} fila(s)</span>
                  </div>
                  <div className="agro-share-track">
                    <span
                      style={{
                        width: `${
                          maxTipo || totals.positiveLbs
                            ? (s.value / (totals.positiveLbs || 1)) * 100
                            : 0
                        }%`,
                        background: s.fill,
                      }}
                    />
                  </div>
                  <em>{formatNum(s.value)} lbs</em>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Cobertura mensual de captura</h2>
            <p>Filas del mes · con cantidad · positivas · total lbs</p>
          </div>
          <div className="carbon-table-wrap">
            <table className="carbon-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Filas</th>
                  <th>Con cantidad</th>
                  <th>&gt; 0 lbs</th>
                  <th>Total lbs</th>
                </tr>
              </thead>
              <tbody>
                {report.completeness.map((row) => (
                  <tr key={row.fecha}>
                    <td>
                      {row.month} · {row.fecha.slice(0, 7)}
                    </td>
                    <td>{row.filas}</td>
                    <td>{row.conCantidad}</td>
                    <td>{row.positivas}</td>
                    <td>{formatNum(row.totalLbs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head row">
          <div>
            <h2>Detalle de registros</h2>
            <p>
              {report.detailRows.length} filas ({rawCount} totales)
            </p>
          </div>
          <Link
            to="/entrada-datos/agroprogreso/gestion-de-residuos"
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
                <th>Clas. operativa</th>
                <th>Tipo</th>
                <th>Clas. técnica</th>
                <th>Cantidad (lbs)</th>
                <th>Ruta</th>
                <th>Gestor</th>
              </tr>
            </thead>
            <tbody>
              {report.detailRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>Sin registros en el periodo.</td>
                </tr>
              ) : (
                report.detailRows.map((row, i) => (
                  <tr key={`${row.fecha}-${row.sede}-${row.tipo}-${i}`}>
                    <td>{row.fecha}</td>
                    <td>{row.mes}</td>
                    <td>{row.sede}</td>
                    <td>{row.operativa}</td>
                    <td>{row.tipo}</td>
                    <td>{row.tecnica}</td>
                    <td>{formatNum(row.cantidad)}</td>
                    <td>{row.ruta}</td>
                    <td>{row.gestor}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="agro-report-footnote">
        Volumen positivo del periodo:{' '}
        <strong>{formatNum(totals.positiveLbs)} lbs</strong>
        {totals.totalLbs !== totals.positiveLbs
          ? ` · suma con ceros/null incluidos en filas numéricas: ${formatNum(totals.totalLbs)} lbs`
          : ''}
        . Solo datos reales.
      </p>
    </div>
  )
}
