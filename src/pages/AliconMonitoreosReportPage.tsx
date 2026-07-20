import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Factory,
  Loader2,
  Thermometer,
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
import { LabMonitoreosResultsSection } from '../components/LabMonitoreosResultsSection'
import {
  buildAliconMonitoreoReport,
  type AliconMonitoreoReport,
} from '../data/aliconMonitoreosReport'
import { formatNum } from '../data/aliconMonitoreos'
import {
  buildLabMonitoreosVisual,
  type LabMonitoreosVisual,
} from '../data/labMonitoreosReport'
import { loadLabMonitoreosByUnidad } from '../lib/agroMonitoreosApi'
import { loadAliconMonitoreos } from '../lib/aliconMonitoreosApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const TIPO_COLORS: Record<string, string> = {
  Interno: '#047935',
  Externo: '#1a5c3a',
}

const PARAM_COLORS = ['#047935', '#5ab64b', '#c9a227', '#1a5c3a', '#8bc34a']
const SEDE_COLORS = ['#047935', '#5ab64b', '#1a5c3a']

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

export function AliconMonitoreosReportPage() {
  const [report, setReport] = useState<AliconMonitoreoReport | null>(null)
  const [labVisual, setLabVisual] = useState<LabMonitoreosVisual | null>(null)
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
        const [records, labRows] = await Promise.all([
          loadAliconMonitoreos(),
          loadLabMonitoreosByUnidad('Alicón').catch(() => []),
        ])
        if (cancelled) return
        setRawCount(records.length)
        const built = buildAliconMonitoreoReport(records, year)
        const labBuilt = buildLabMonitoreosVisual(labRows, year)
        const yearSet = new Set([
          ...built.meta.years,
          ...labBuilt.meta.years,
        ])
        setYears([...yearSet].sort((a, b) => b - a))
        setReport(built)
        setLabVisual(labBuilt)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte de monitoreo',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year])

  const chartMonthly = useMemo(() => report?.monthlyCount ?? [], [report])

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando monitoreos de cumplimiento / control · Alicón…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/planta-alicon/monitoreo-ambiental"
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
    <div className="carbon-page alicon-monitoreos-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Factory size={14} />
            Operaciones · Planta Alicón
          </p>
          <h1>Monitoreos de cumplimiento / control</h1>
          <p>
            Resultados de laboratorio (agua, aire, ruido) y cronograma de
            ejecuciones · prioriza los parámetros medidos de los informes PDF
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Parámetros lab</span>
            <strong>{labVisual?.meta.totalRows ?? 0}</strong>
          </div>
          <div>
            <span>Puntos lab</span>
            <strong>{labVisual?.meta.puntos ?? 0}</strong>
          </div>
          <div>
            <span>Cronograma</span>
            <strong>
              {meta.ejecutados}/{meta.totalRows}
            </strong>
          </div>
          <div>
            <span>Periodo</span>
            <label
              className="agro-year-filter"
              htmlFor="alicon-moni-report-year"
            >
              <select
                id="alicon-moni-report-year"
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

      <div className="lab-import-cta content-panel">
        <div>
          <strong>Cargar resultados de laboratorio</strong>
          <p>
            Sube los PDFs de agua potable, material particulado y ruido. Los
            parámetros aparecen en esta página y en la tabla de entrada de
            datos.
          </p>
        </div>
        <Link
          to="/entrada-datos/monitoreo-ambiental?proyecto=planta-alicon"
          className="btn-primary"
        >
          Ir a captura →
        </Link>
      </div>

      {labVisual ? (
        <LabMonitoreosResultsSection
          visual={labVisual}
          entryHref="/entrada-datos/monitoreo-ambiental?proyecto=planta-alicon"
          title="Resultados de laboratorio"
          subtitle="Agua potable · material particulado · ruido"
        />
      ) : null}

      <section className="lab-results-report-split">
        <h2 className="lab-results-report-split-title">
          Cronograma · Ejecuciones Moni
        </h2>
        <p className="lab-results-report-split-sub">
          Programación y estado de monitoreos (captura manual por mes)
        </p>
      </section>

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
              <Thermometer
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Monitoreos por mes
            </h2>
            <p>Según fecha de inicio · Ejecutado / Programado</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="short" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar
                dataKey="ejecutados"
                name="Ejecutados"
                stackId="a"
                fill="#047935"
              />
              <Bar
                dataKey="programados"
                name="Programados"
                stackId="a"
                fill="#c9a227"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Tipo de monitoreo</h2>
            <p>Interno vs externo</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={report.tipoShare}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
              >
                {report.tipoShare.map((s) => (
                  <Cell
                    key={s.name}
                    fill={TIPO_COLORS[s.name] ?? '#047935'}
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
            <h2>Por sede</h2>
            <p>Cantidad de ejecuciones</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.sedeRanking}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="sede" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Monitoreos" radius={[6, 6, 0, 0]}>
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
            <h2>Parámetros</h2>
            <p>Distribución por parámetro medido</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.parametroShare} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Ejecuciones" radius={[0, 6, 6, 0]}>
                {report.parametroShare.map((s, i) => (
                  <Cell
                    key={s.name}
                    fill={PARAM_COLORS[i % PARAM_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head row">
          <div>
            <h2>Detalle de monitoreos</h2>
            <p>
              {report.detailRows.length} filas ({rawCount} totales)
            </p>
          </div>
          <Link
            to="/entrada-datos/planta-alicon/monitoreo-ambiental"
            className="btn-secondary-link"
          >
            Ir a captura →
          </Link>
        </div>
        <div className="carbon-table-wrap agro-detail-wrap">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Mes</th>
                <th>Sede</th>
                <th>Tipo</th>
                <th>Parámetro</th>
                <th>Puntos</th>
                <th>Estado</th>
                <th>Referencia</th>
                <th>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {report.detailRows.length === 0 ? (
                <tr>
                  <td colSpan={10}>Sin monitoreos en el periodo.</td>
                </tr>
              ) : (
                report.detailRows.map((row, i) => (
                  <tr key={`${row.fechaInicio}-${row.sede}-${row.parametro}-${i}`}>
                    <td>{row.fechaInicio}</td>
                    <td>{row.fechaFin}</td>
                    <td>{row.mes}</td>
                    <td>{row.sede}</td>
                    <td>{row.tipo}</td>
                    <td>{row.parametro}</td>
                    <td>{formatNum(row.puntos, 0)}</td>
                    <td>{row.estado}</td>
                    <td>{row.referencia}</td>
                    <td>{row.comentarios}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="agro-report-footnote">
        Puntos monitoreados en el periodo:{' '}
        <strong>{formatNum(totals.puntos, 0)}</strong>
        {totals.programados
          ? ` · ${totals.programados} programado(s)`
          : ''}
        . Solo datos reales (Planta Alicón · Ejecuciones Moni).
      </p>
    </div>
  )
}
