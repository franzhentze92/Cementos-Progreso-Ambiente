import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
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
import { CapacitacionesMap } from '../components/CapacitacionesMap'
import {
  buildAgroCapacitacionesReport,
  formatNum,
  type AgroCapacitacionesReport,
} from '../data/agroCapacitacionesReport'
import { loadAgroCapacitaciones } from '../lib/agroCapacitacionesApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const ESTADO_COLORS: Record<string, string> = {
  Ejecutado: '#047935',
  Programado: '#3b82f6',
  Reprogramado: '#d97706',
}

const TEMA_COLORS = [
  '#047935',
  '#5ab64b',
  '#1a5c3a',
  '#8bc34a',
  '#2e7d32',
  '#66bb6a',
]

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const FILTER_ALL = 'all'

export function AgroCapacitacionesReportPage() {
  const [report, setReport] = useState<AgroCapacitacionesReport | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)
  const [filterSede, setFilterSede] = useState(FILTER_ALL)
  const [filterDetalle, setFilterDetalle] = useState(FILTER_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawCount, setRawCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const records = await loadAgroCapacitaciones()
        if (cancelled) return
        setRawCount(records.length)
        const built = buildAgroCapacitacionesReport(records, year)
        setYears(built.meta.years)
        setReport(built)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte de capacitaciones',
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
      if (filterDetalle !== FILTER_ALL && row.detalle !== filterDetalle)
        return false
      return true
    })
  }, [report, filterEstado, filterSede, filterDetalle])

  const sedeOptions = useMemo(
    () =>
      [...new Set(report?.detailRows.map((r) => r.sede) ?? [])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [report],
  )
  const detalleOptions = useMemo(
    () =>
      [...new Set(report?.detailRows.map((r) => r.detalle) ?? [])].sort(
        (a, b) => a.localeCompare(b),
      ),
    [report],
  )

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando analytics de capacitaciones…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/agroprogreso/capacitaciones"
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
    <div className="carbon-page agro-capacitaciones-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · Agroprogreso · Analytics
          </p>
          <h1>Capacitaciones</h1>
          <p>
            Hoja Ejecuciones · tipo Capacitaciones · mapa por sede, calendario
            mensual y mezcla de temas/público · {meta.periodLabel} (
            {meta.dateSpanLabel})
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Total / ejecutadas</span>
            <strong>
              {meta.totalRows}/{meta.ejecutado}
            </strong>
          </div>
          <div>
            <span>Tasa ejecución</span>
            <strong>
              {totals.executionRate == null
                ? '—'
                : `${formatNum(totals.executionRate, 0)}%`}
            </strong>
          </div>
          <div>
            <span>Periodo</span>
            <label className="agro-year-filter" htmlFor="agro-cap-report-year">
              <select
                id="agro-cap-report-year"
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
            <p>
              {report.mapSites.length} sede(s) con coordenadas de referencia
            </p>
          </div>
          <CapacitacionesMap sites={report.mapSites} />
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Estado</h2>
            <p>Ejecutado / Programado / Reprogramado</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={report.estadoShare}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={84}
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

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <GraduationCap
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Capacitaciones por mes
            </h2>
            <p>Serie temporal del programa 2026</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="short" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar
                dataKey="ejecutado"
                name="Ejecutado"
                stackId="a"
                fill="#047935"
              />
              <Bar
                dataKey="programado"
                name="Programado"
                stackId="a"
                fill="#3b82f6"
              />
              <Bar
                dataKey="reprogramado"
                name="Reprogramado"
                stackId="a"
                fill="#d97706"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Temas (detalle)</h2>
            <p>Distribución por contenido de la capacitación</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.detalleShare} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 10 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Eventos" radius={[0, 6, 6, 0]}>
                {report.detalleShare.map((s, i) => (
                  <Cell
                    key={s.name}
                    fill={TEMA_COLORS[i % TEMA_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Público objetivo</h2>
            <p>Interno vs comunitario</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={report.publicoShare}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
              >
                {report.publicoShare.map((s, i) => (
                  <Cell
                    key={s.name}
                    fill={i === 0 ? '#047935' : '#8bc34a'}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Timeline del programa</h2>
            <p>Orden cronológico por fecha de inicio</p>
          </div>
          <div className="agro-mon-timeline">
            {report.timeline.map((t, i) => (
              <article key={`${t.fecha}-${t.sede}-${t.detalle}-${i}`}>
                <header>
                  <strong>{t.fecha}</strong>
                  <span
                    className={
                      t.estado.toLowerCase() === 'ejecutado'
                        ? 'agro-badge-ok'
                        : t.estado.toLowerCase() === 'reprogramado'
                          ? 'agro-badge-warn'
                          : 'agro-badge-info'
                    }
                  >
                    {t.estado}
                  </span>
                </header>
                <p>
                  {t.sede} · {t.detalle} · {t.publico}
                </p>
                <p>{t.comentarios}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head row">
          <div>
            <h2>Detalle de capacitaciones</h2>
            <p>
              {filteredDetail.length} de {report.detailRows.length} filas (
              {rawCount} totales)
            </p>
          </div>
          <Link
            to="/entrada-datos/agroprogreso/capacitaciones"
            className="btn-secondary-link"
          >
            Ir a captura →
          </Link>
        </div>

        <div
          className="agro-table-filters"
          role="search"
          aria-label="Filtros detalle capacitaciones"
        >
          <label>
            Estado
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              <option value="Ejecutado">Ejecutado</option>
              <option value="Programado">Programado</option>
              <option value="Reprogramado">Reprogramado</option>
            </select>
          </label>
          <label>
            Sede
            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {sedeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tema
            <select
              value={filterDetalle}
              onChange={(e) => setFilterDetalle(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {detalleOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="carbon-table-wrap agro-detail-wrap">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Mes</th>
                <th>Sede</th>
                <th>Detalle</th>
                <th>Público</th>
                <th>Fin</th>
                <th>Estado</th>
                <th>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {filteredDetail.length === 0 ? (
                <tr>
                  <td colSpan={8}>Sin filas con esos filtros.</td>
                </tr>
              ) : (
                filteredDetail.map((row, i) => (
                  <tr key={`${row.inicio}-${row.sede}-${row.detalle}-${i}`}>
                    <td>{row.inicio}</td>
                    <td>{row.mes}</td>
                    <td>{row.sede}</td>
                    <td>{row.detalle}</td>
                    <td>{row.publico}</td>
                    <td>{row.fin}</td>
                    <td>{row.estado}</td>
                    <td>{row.comentarios}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="agro-report-footnote">
        Solo capacitaciones Agroprogreso. Coordenadas de mapa son
        referencia por sede (Finca El Pilar / Agro SM).
      </p>
    </div>
  )
}
