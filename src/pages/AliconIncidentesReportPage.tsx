import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Factory,
  Loader2,
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
import {
  buildAgroIncidentesReport,
  formatNum,
  type AgroIncidentesReport,
} from '../data/agroIncidentesReport'
import { formatPctFromValor } from '../data/aliconIncidentes'
import { loadAliconIncidentes } from '../lib/aliconIncidentesApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const ESTADO_COLORS: Record<string, string> = {
  Abierto: '#c0392b',
  Cerrado: '#047935',
}

const SEDE_COLORS = ['#047935', '#5ab64b', '#1a5c3a', '#8bc34a', '#2e7d32']

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

export function AliconIncidentesReportPage() {
  const [report, setReport] = useState<AgroIncidentesReport | null>(null)
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
        const records = await loadAliconIncidentes()
        if (cancelled) return
        setRawCount(records.length)
        const built = buildAgroIncidentesReport(records, year)
        setYears(built.meta.years)
        setReport(built)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte de incidentes',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year])

  const chartMonthly = useMemo(
    () => report?.monthlyCount ?? [],
    [report],
  )

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando incidentes Alicón…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/planta-alicon/incidentes-ambientales"
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
    <div className="carbon-page alicon-incidentes-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Factory size={14} />
            Operaciones · Planta Alicón
          </p>
          <h1>Incidentes ambientales</h1>
          <p>
            Datos reales · hoja Incidentes (Planta Alicón) ·{' '}
            {meta.periodLabel}
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Total / abiertos</span>
            <strong>
              {meta.totalRows}/{meta.abiertos}
            </strong>
          </div>
          <div>
            <span>Cerrados</span>
            <strong>{meta.cerrados}</strong>
          </div>
          <div>
            <span>Periodo</span>
            <label className="agro-year-filter" htmlFor="agro-inc-report-year">
              <select
                id="agro-inc-report-year"
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
              <AlertTriangle
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Incidentes por mes
            </h2>
            <p>Total, abiertos y cerrados</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="short" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar
                dataKey="abiertos"
                name="Abiertos"
                stackId="a"
                fill="#c0392b"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="cerrados"
                name="Cerrados"
                stackId="a"
                fill="#047935"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Estado</h2>
            <p>Distribución Abierto / Cerrado</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={report.estadoShare}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
              >
                {report.estadoShare.map((s) => (
                  <Cell
                    key={s.name}
                    fill={ESTADO_COLORS[s.name] ?? '#047935'}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2>Incidentes por sede</h2>
          <p>Cantidad y abiertos por planta/sede</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={report.sedeRanking}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
            <XAxis dataKey="sede" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="count" name="Total" radius={[6, 6, 0, 0]}>
              {report.sedeRanking.map((s, i) => (
                <Cell
                  key={s.sede}
                  fill={SEDE_COLORS[i % SEDE_COLORS.length]}
                />
              ))}
            </Bar>
            <Bar dataKey="abiertos" name="Abiertos" fill="#c0392b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="dash-panel">
        <div className="dash-panel-head row">
          <div>
            <h2>Detalle de incidentes</h2>
            <p>
              {report.detailRows.length} filas ({rawCount} totales)
            </p>
          </div>
          <Link
            to="/entrada-datos/planta-alicon/incidentes-ambientales"
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
                <th>Instrumento</th>
                <th>Descripción</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Responsables</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {report.detailRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>Sin incidentes en el periodo.</td>
                </tr>
              ) : (
                report.detailRows.map((row, i) => (
                  <tr key={`${row.fecha}-${row.sede}-${i}`}>
                    <td>{row.fecha}</td>
                    <td>{row.mes}</td>
                    <td>{row.sede}</td>
                    <td>{row.instrumento}</td>
                    <td>{row.descripcion}</td>
                    <td>{formatPctFromValor(row.valor)}</td>
                    <td>{row.estado}</td>
                    <td>{row.responsables}</td>
                    <td>
                      {row.link ? (
                        <a href={row.link} target="_blank" rel="noreferrer">
                          Abrir
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

      <p className="agro-report-footnote">
        Valor promedio del periodo:{' '}
        <strong>{formatPctFromValor(totals.valorAvg)}</strong>
        {totals.abiertos
          ? ` · ${totals.abiertos} abierto(s) pendientes`
          : ' · sin abiertos'}
        . Solo datos reales (Planta Alicón). {formatNum(meta.totalRows)}{' '}
        registro(s).
      </p>
    </div>
  )
}
