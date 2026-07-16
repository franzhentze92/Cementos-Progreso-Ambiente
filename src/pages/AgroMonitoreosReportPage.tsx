import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { MonitoreoMap } from '../components/MonitoreoMap'
import {
  buildAgroMonitoreosReport,
  formatNum,
  type AgroMonitoreosReport,
  type ParamSeries,
} from '../data/agroMonitoreosReport'
import { loadAgroMonitoreos } from '../lib/agroMonitoreosApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const CUMPLE_COLORS: Record<string, string> = {
  Si: '#047935',
  No: '#c0392b',
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

function formatDelta(d: number | null) {
  if (d == null || Number.isNaN(d)) return null
  const sign = d > 0 ? '+' : ''
  return `${sign}${d.toFixed(1)}%`
}

function seriesHasSignal(s: ParamSeries) {
  return s.points.some((p) => p.value != null)
}

export function AgroMonitoreosReportPage() {
  const [report, setReport] = useState<AgroMonitoreosReport | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [paramFocus, setParamFocus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawCount, setRawCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const records = await loadAgroMonitoreos()
        if (cancelled) return
        setRawCount(records.length)
        const built = buildAgroMonitoreosReport(records, year)
        setYears(built.meta.years)
        setReport(built)
        const first =
          built.paramSeries.find(seriesHasSignal)?.parametro ??
          built.paramSeries[0]?.parametro ??
          ''
        setParamFocus((prev) =>
          prev && built.paramSeries.some((p) => p.parametro === prev)
            ? prev
            : first,
        )
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

  const focusSeries = useMemo(
    () => report?.paramSeries.find((p) => p.parametro === paramFocus) ?? null,
    [report, paramFocus],
  )

  const smallMultiples = useMemo(() => {
    if (!report) return []
    return report.paramSeries.filter(seriesHasSignal).slice(0, 12)
  }, [report])

  const profileBars = useMemo(() => {
    if (!report) return []
    return report.latestProfile
      .filter((p) => p.resultado != null)
      .map((p) => ({
        name:
          p.parametro.length > 18
            ? `${p.parametro.slice(0, 16)}…`
            : p.parametro,
        full: p.parametro,
        value: p.resultado as number,
        cumple: p.cumple,
      }))
  }, [report])

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando analytics de monitoreo…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/agroprogreso/monitoreo-ambiental"
            className="btn-secondary-link"
          >
            Ir a captura →
          </Link>
        </div>
      </div>
    )
  }

  const { meta, kpis, insights, totals, dataQuality } = report

  return (
    <div className="carbon-page agro-monitoreos-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · Agroprogreso · Analytics
          </p>
          <h1>Monitoreo ambiental</h1>
          <p>
            Laboratorio + geografía: mapa de puntos, series temporales por
            parámetro, calidad de datos y perfil del último muestreo ·{' '}
            {meta.periodLabel} ({meta.dateSpanLabel})
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Muestreos / params</span>
            <strong>
              {meta.muestreos}/{meta.totalRows}
            </strong>
          </div>
          <div>
            <span>Cumplimiento</span>
            <strong>
              {totals.compliancePct == null
                ? '—'
                : `${formatNum(totals.compliancePct, 0)}%`}
            </strong>
          </div>
          <div>
            <span>Periodo</span>
            <label className="agro-year-filter" htmlFor="agro-mon-report-year">
              <select
                id="agro-mon-report-year"
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
              Mapa de puntos de muestreo
            </h2>
            <p>
              {report.mapSites.length} ubicación(es) con lat/lon · clic para
              detalle del último muestreo
            </p>
          </div>
          <MonitoreoMap sites={report.mapSites} />
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Calidad de datos</h2>
            <p>Cobertura de campos del laboratorio</p>
          </div>
          <ul className="agro-dq-list">
            <li>
              <span>Resultado numérico</span>
              <strong>
                {dataQuality.withResult}/{meta.totalRows}
                {dataQuality.resultCoveragePct != null
                  ? ` (${formatNum(dataQuality.resultCoveragePct, 0)}%)`
                  : ''}
              </strong>
            </li>
            <li>
              <span>Sin resultado</span>
              <strong>{dataQuality.withoutResult}</strong>
            </li>
            <li>
              <span>Con unidad de medida</span>
              <strong>
                {dataQuality.withUnit}/{meta.totalRows}
                {dataQuality.unitCoveragePct != null
                  ? ` (${formatNum(dataQuality.unitCoveragePct, 0)}%)`
                  : ''}
              </strong>
            </li>
            <li>
              <span>Con coordenadas</span>
              <strong>
                {dataQuality.withCoords}/{meta.totalRows}
              </strong>
            </li>
            <li>
              <span>Parámetros únicos</span>
              <strong>{meta.uniqueParams}</strong>
            </li>
            <li>
              <span>Puntos / sedes</span>
              <strong>{meta.uniqueSites}</strong>
            </li>
          </ul>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={report.cumpleShare}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={68}
                paddingAngle={2}
              >
                {report.cumpleShare.map((s) => (
                  <Cell
                    key={s.name}
                    fill={CUMPLE_COLORS[s.name] ?? '#047935'}
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
        <div className="dash-panel-head row">
          <div>
            <h2>
              <Activity
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Serie temporal por parámetro
            </h2>
            <p>
              Evolución del resultado en el tiempo. Con un solo muestreo verás
              un punto; al cargar más meses la tendencia se llena.
            </p>
          </div>
          <label className="agro-year-filter" htmlFor="agro-mon-param">
            Parámetro
            <select
              id="agro-mon-param"
              value={paramFocus}
              onChange={(e) => setParamFocus(e.target.value)}
            >
              {report.paramSeries.map((p) => (
                <option key={p.parametro} value={p.parametro}>
                  {p.parametro}
                  {p.n ? ` (${p.n})` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {focusSeries ? (
          <>
            <div className="agro-mon-series-meta">
              <div>
                <span>Último</span>
                <strong>{formatNum(focusSeries.latest)}</strong>
                {focusSeries.unidad ? (
                  <em>{focusSeries.unidad}</em>
                ) : null}
              </div>
              <div>
                <span>Media</span>
                <strong>{formatNum(focusSeries.mean)}</strong>
              </div>
              <div>
                <span>Min / Max</span>
                <strong>
                  {formatNum(focusSeries.min)} / {formatNum(focusSeries.max)}
                </strong>
              </div>
              <div>
                <span>Δ vs anterior</span>
                <strong>
                  {formatDelta(focusSeries.deltaPct) ?? '— (falta historia)'}
                </strong>
              </div>
              <div>
                <span>Cumple (último)</span>
                <strong>{focusSeries.latestCumple || '—'}</strong>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={focusSeries.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={focusSeries.parametro}
                  stroke="#047935"
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="agro-mon-empty">Sin serie seleccionada.</p>
        )}
      </section>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2>Pequeños múltiples — parámetros con valor</h2>
          <p>
            Vista rápida de hasta 12 parámetros. Cada panel usa su propia
            escala.
          </p>
        </div>
        <div className="agro-mon-multiples">
          {smallMultiples.length === 0 ? (
            <p className="agro-mon-empty">Sin valores numéricos.</p>
          ) : (
            smallMultiples.map((s) => (
              <button
                key={s.parametro}
                type="button"
                className={`agro-mon-mini ${paramFocus === s.parametro ? 'is-active' : ''}`}
                onClick={() => setParamFocus(s.parametro)}
              >
                <header>
                  <strong>{s.parametro}</strong>
                  <span>{formatNum(s.latest)}</span>
                </header>
                <ResponsiveContainer width="100%" height={70}>
                  <LineChart data={s.points}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#047935"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </button>
            ))
          )}
        </div>
      </section>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Droplets
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Perfil del último muestreo
            </h2>
            <p>
              {report.campaignTimeline[0]
                ? `${report.campaignTimeline[0].fecha} · ${report.campaignTimeline[0].punto}`
                : 'Sin campaña'}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={profileBars} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, _n, item) => [
                  formatNum(Number(value)),
                  (item?.payload as { full?: string })?.full ?? 'Resultado',
                ]}
              />
              <Bar dataKey="value" name="Resultado" radius={[0, 6, 6, 0]}>
                {profileBars.map((p) => (
                  <Cell
                    key={p.full}
                    fill={
                      p.cumple.toLowerCase() === 'no' ? '#c0392b' : '#047935'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>DBO vs DQO</h2>
            <p>Relación de biodegradabilidad por muestreo</p>
          </div>
          {report.dboDqo.length === 0 ? (
            <p className="agro-mon-empty">
              Faltan pares DBO/DQO numéricos en el periodo.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis
                  type="number"
                  dataKey="dbo"
                  name="DBO"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'DBO', position: 'insideBottom', offset: -2 }}
                />
                <YAxis
                  type="number"
                  dataKey="dqo"
                  name="DQO"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'DQO', angle: -90, position: 'insideLeft' }}
                />
                <ZAxis range={[80, 80]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) => [
                    formatNum(Number(value)),
                    String(name).toUpperCase(),
                  ]}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as
                      | { fecha?: string; ratio?: number }
                      | undefined
                    if (!p?.fecha) return ''
                    return `${p.fecha} · DQO/DBO ${formatNum(p.ratio ?? null, 2)}`
                  }}
                />
                <Scatter
                  name="Muestreos"
                  data={report.dboDqo}
                  fill="#047935"
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Actividad mensual</h2>
            <p>Parámetros medidos y cumplimiento</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
              <XAxis dataKey="short" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="cumpleSi" name="Cumple" stackId="a" fill="#047935" />
              <Bar
                dataKey="cumpleNo"
                name="No cumple"
                stackId="a"
                fill="#c0392b"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Timeline de campañas</h2>
            <p>Cada muestreo = fecha + sede + punto</p>
          </div>
          <div className="agro-mon-timeline">
            {report.campaignTimeline.length === 0 ? (
              <p className="agro-mon-empty">Sin campañas.</p>
            ) : (
              report.campaignTimeline.map((c) => (
                <article key={`${c.fecha}-${c.sede}-${c.punto}`}>
                  <header>
                    <strong>{c.fecha}</strong>
                    <span
                      className={
                        c.noCumple > 0 ? 'agro-badge-warn' : 'agro-badge-ok'
                      }
                    >
                      {c.cumplePct == null
                        ? '—'
                        : `${formatNum(c.cumplePct, 0)}% cumple`}
                    </span>
                  </header>
                  <p>
                    {c.sede} · {c.punto} · {c.tipoAgua}
                  </p>
                  <p>
                    {c.withValue}/{c.params} con valor
                    {c.lat != null && c.lng != null
                      ? ` · ${c.lat}, ${c.lng}`
                      : ''}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2>Estadísticos por parámetro</h2>
          <p>n, media, min/max, último y variación vs muestreo previo</p>
        </div>
        <div className="carbon-table-wrap agro-detail-wrap">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>n</th>
                <th>Media</th>
                <th>Min</th>
                <th>Max</th>
                <th>Último</th>
                <th>Δ %</th>
                <th>Cumple</th>
              </tr>
            </thead>
            <tbody>
              {report.paramSeries.map((s) => (
                <tr
                  key={s.parametro}
                  className={
                    paramFocus === s.parametro ? 'agro-row-active' : undefined
                  }
                  onClick={() => setParamFocus(s.parametro)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{s.parametro}</td>
                  <td>{s.n}</td>
                  <td>{formatNum(s.mean)}</td>
                  <td>{formatNum(s.min)}</td>
                  <td>{formatNum(s.max)}</td>
                  <td>{formatNum(s.latest)}</td>
                  <td>{formatDelta(s.deltaPct) ?? '—'}</td>
                  <td>{s.latestCumple || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dash-panel">
        <div className="dash-panel-head row">
          <div>
            <h2>Detalle de laboratorio</h2>
            <p>
              {report.detailRows.length} filas ({rawCount} totales)
            </p>
          </div>
          <Link
            to="/entrada-datos/agroprogreso/monitoreo-ambiental"
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
                <th>Punto</th>
                <th>Tipo</th>
                <th>Parámetro</th>
                <th>Resultado</th>
                <th>Unidad</th>
                <th>Límite</th>
                <th>Cumple</th>
                <th>Lat</th>
                <th>Lon</th>
              </tr>
            </thead>
            <tbody>
              {report.detailRows.length === 0 ? (
                <tr>
                  <td colSpan={12}>Sin registros en el periodo.</td>
                </tr>
              ) : (
                report.detailRows.map((row, i) => (
                  <tr key={`${row.fecha}-${row.parametro}-${i}`}>
                    <td>{row.fecha}</td>
                    <td>{row.mes}</td>
                    <td>{row.sede}</td>
                    <td>{row.punto}</td>
                    <td>{row.tipoAgua}</td>
                    <td>{row.parametro}</td>
                    <td>{formatNum(row.resultado)}</td>
                    <td>{row.unidad}</td>
                    <td>{row.limite}</td>
                    <td>{row.cumple}</td>
                    <td>{row.lat == null ? '—' : formatNum(row.lat, 6)}</td>
                    <td>{row.lng == null ? '—' : formatNum(row.lng, 6)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="agro-report-footnote">
        Analytics sobre datos reales. Las series y el Δ% se
        enriquecen automáticamente al capturar más muestreos en Entrada de
        Datos.
      </p>
    </div>
  )
}
