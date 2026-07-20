import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Factory,
  FlaskConical,
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
  const [scheduleReport, setScheduleReport] =
    useState<AliconMonitoreoReport | null>(null)
  const [labVisual, setLabVisual] = useState<LabMonitoreosVisual | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [scheduleRows, labRows] = await Promise.all([
          loadAliconMonitoreos().catch(() => []),
          loadLabMonitoreosByUnidad('Alicón'),
        ])
        if (cancelled) return
        const built = buildAliconMonitoreoReport(scheduleRows, year)
        const labBuilt = buildLabMonitoreosVisual(labRows, year)
        const yearSet = new Set([
          ...built.meta.years,
          ...labBuilt.meta.years,
        ])
        setYears([...yearSet].sort((a, b) => b - a))
        setScheduleReport(built)
        setLabVisual(labBuilt)
        // Solo auto-abrir cronograma si no hay lab (evitar confundirlo con datos reales)
        if (labBuilt.meta.totalRows === 0 && built.meta.totalRows > 0) {
          setShowSchedule(true)
        } else if (labBuilt.meta.totalRows > 0) {
          setShowSchedule(false)
        }
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

  const chartMonthly = useMemo(
    () => scheduleReport?.monthlyCount ?? [],
    [scheduleReport],
  )

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando monitoreos de cumplimiento / control · Alicón…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error}
          <Link
            to="/entrada-datos/monitoreo-ambiental?proyecto=planta-alicon"
            className="btn-secondary-link"
          >
            Ir a captura →
          </Link>
        </div>
      </div>
    )
  }

  const labCount = labVisual?.meta.totalRows ?? 0
  const scheduleCount = scheduleReport?.meta.totalRows ?? 0

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
            Resultados reales de laboratorio (agua potable, material
            particulado, ruido). El cronograma de ejecuciones es solo
            programación operativa y se muestra aparte.
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Parámetros lab</span>
            <strong>{labCount}</strong>
          </div>
          <div>
            <span>Puntos lab</span>
            <strong>{labVisual?.meta.puntos ?? 0}</strong>
          </div>
          <div>
            <span>Medios</span>
            <strong>{labVisual?.meta.medios ?? 0}</strong>
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
          <strong>
            <FlaskConical
              size={16}
              style={{ marginRight: 6, verticalAlign: -3 }}
            />
            Resultados de laboratorio
          </strong>
          <p>
            Sube los PDFs de agua, aire y ruido. Aquí se grafican y detallan
            los parámetros medidos (pH, PM2.5, LAeq, etc.), no el cronograma
            ARO/ARE.
          </p>
        </div>
        <Link
          to="/entrada-datos/monitoreo-ambiental?proyecto=planta-alicon"
          className="btn-primary"
        >
          Cargar PDF / ver entrada →
        </Link>
      </div>

      {labCount === 0 ? (
        <div className="hc-banner hc-banner-warn" role="status">
          <AlertTriangle size={18} />
          <span>
            Aún no hay resultados de laboratorio guardados para Alicón. Sube
            un PDF en Entrada de datos y pulsa «Guardar todo el informe». Lo
            que ves abajo como ARO / ARE / MP es solo el{' '}
            <strong>cronograma de ejecuciones</strong>, no mediciones.
          </span>
        </div>
      ) : null}

      {labVisual && labCount > 0 ? (
        <LabMonitoreosResultsSection
          visual={labVisual}
          entryHref="/entrada-datos/monitoreo-ambiental?proyecto=planta-alicon"
          title="Resultados reales de laboratorio"
          subtitle="Parámetros de informes PDF · agua potable · material particulado · ruido"
        />
      ) : null}

      <section className="alicon-schedule-report-section">
        <div className="alicon-schedule-report-head">
          <div>
            <h2>
              <Thermometer
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Cronograma de ejecuciones (opcional)
            </h2>
            <p>
              Programación operativa (Interno/Externo, ARO, ARE, MP).{' '}
              <strong>No son resultados de laboratorio</strong> ni sustituyen
              los parámetros medidos arriba.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => setShowSchedule((v) => !v)}
          >
            {showSchedule
              ? 'Ocultar cronograma'
              : `Mostrar cronograma (${scheduleCount})`}
          </button>
        </div>

        {showSchedule && scheduleReport ? (
          <>
            <div className="hc-banner hc-banner-warn" role="note">
              <AlertTriangle size={18} />
              <span>
                Esta sección es el plan/estado de campañas (Ejecuciones Moni).
                Para cumplimiento por analito (coliformes, PM10, LAeq…) usa
                «Resultados reales de laboratorio».
              </span>
            </div>

            <div className="carbon-kpi-grid">
              {scheduleReport.kpis.map((kpi) => (
                <article key={kpi.id} className="carbon-kpi">
                  <span>{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  <p>{kpi.hint}</p>
                </article>
              ))}
            </div>

            {scheduleReport.insights.length > 0 ? (
              <div className="carbon-alerts">
                {scheduleReport.insights.map((alert) => (
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
                  <h2>Ejecuciones por mes</h2>
                  <p>Según fecha de inicio · Ejecutado / Programado</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
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
                  <h2>Tipo (cronograma)</h2>
                  <p>Interno vs externo</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={scheduleReport.tipoShare}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {scheduleReport.tipoShare.map((s) => (
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
                  <h2>Por sede (cronograma)</h2>
                  <p>Cantidad de ejecuciones programadas/hechas</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={scheduleReport.sedeRanking}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                    <XAxis dataKey="sede" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="count"
                      name="Ejecuciones"
                      radius={[6, 6, 0, 0]}
                    >
                      {scheduleReport.sedeRanking.map((s, i) => (
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
                  <h2>Categorías del cronograma</h2>
                  <p>ARO / ARE / MP (no son analitos de lab)</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={scheduleReport.parametroShare}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="value"
                      name="Ejecuciones"
                      radius={[0, 6, 6, 0]}
                    >
                      {scheduleReport.parametroShare.map((s, i) => (
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
                  <h2>Detalle del cronograma</h2>
                  <p>
                    {scheduleReport.detailRows.length} filas · Ejecuciones Moni
                    (programación)
                  </p>
                </div>
                <Link
                  to="/entrada-datos/monitoreo-ambiental?proyecto=planta-alicon"
                  className="btn-secondary-link"
                >
                  Editar cronograma →
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
                      <th>Categoría</th>
                      <th>Puntos</th>
                      <th>Estado</th>
                      <th>Referencia</th>
                      <th>Comentarios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleReport.detailRows.length === 0 ? (
                      <tr>
                        <td colSpan={10}>Sin ejecuciones en el periodo.</td>
                      </tr>
                    ) : (
                      scheduleReport.detailRows.map((row, i) => (
                        <tr
                          key={`${row.fechaInicio}-${row.sede}-${row.parametro}-${i}`}
                        >
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
              Cronograma: {formatNum(scheduleReport.totals.puntos, 0)} puntos ·{' '}
              {scheduleReport.totals.programados} programado(s). Fuente:
              Ejecuciones Moni (no laboratorio).
            </p>
          </>
        ) : null}
      </section>

      {labCount > 0 ? (
        <p className="agro-report-footnote">
          Laboratorio: <strong>{labCount}</strong> parámetros en{' '}
          <strong>{labVisual?.meta.puntos ?? 0}</strong> punto(s) · fuente
          informes PDF (agua / aire / ruido).
        </p>
      ) : null}
    </div>
  )
}
