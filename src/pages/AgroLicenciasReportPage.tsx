import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileBadge,
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
import { LicenciasMap } from '../components/LicenciasMap'
import {
  AGRO_LICENCIA_ESTADOS,
  formatNum,
} from '../data/agroLicencias'
import {
  buildAgroLicenciasReport,
  type AgroLicenciasReport,
} from '../data/agroLicenciasReport'
import { loadAgroLicencias } from '../lib/agroLicenciasApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const ESTADO_COLORS: Record<string, string> = {
  VIGENTE: '#047935',
  'EN PROCESO': '#3b82f6',
  DESISTIDO: '#94a3b8',
}

const CAT_COLORS = [
  '#047935',
  '#5ab64b',
  '#1a5c3a',
  '#8bc34a',
  '#2e7d32',
  '#66bb6a',
  '#a5d6a7',
]

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const FILTER_ALL = 'all'

function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}/${y}`
}

function estadoBadgeClass(estado: string): string {
  if (estado === 'VIGENTE') return 'agro-badge-ok'
  if (estado === 'EN PROCESO') return 'agro-badge-info'
  if (estado === 'DESISTIDO') return 'agro-badge-warn'
  return ''
}

function ganttBarClass(estado: string): string {
  if (estado === 'VIGENTE') return 'agro-lic-gantt-bar vigente'
  if (estado === 'EN PROCESO') return 'agro-lic-gantt-bar proceso'
  return 'agro-lic-gantt-bar desistido'
}

export function AgroLicenciasReportPage() {
  const [report, setReport] = useState<AgroLicenciasReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)
  const [filterSede, setFilterSede] = useState(FILTER_ALL)
  const [filterCategoria, setFilterCategoria] = useState(FILTER_ALL)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const records = await loadAgroLicencias()
        if (cancelled) return
        setReport(buildAgroLicenciasReport(records))
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte de licencias',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredDetail = useMemo(() => {
    if (!report) return []
    return report.detailRows.filter((row) => {
      if (filterEstado !== FILTER_ALL && row.estado !== filterEstado)
        return false
      if (filterSede !== FILTER_ALL && row.sede !== filterSede) return false
      if (filterCategoria !== FILTER_ALL) {
        const cat = row.categoria === '—' ? '' : row.categoria
        if (cat !== filterCategoria) return false
      }
      return true
    })
  }, [report, filterEstado, filterSede, filterCategoria])

  const sedeOptions = useMemo(
    () =>
      [...new Set(report?.detailRows.map((r) => r.sede) ?? [])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [report],
  )
  const categoriaOptions = useMemo(
    () =>
      [
        ...new Set(
          report?.detailRows
            .map((r) => (r.categoria === '—' ? '' : r.categoria))
            .filter(Boolean) ?? [],
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [report],
  )

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando analytics de licencias…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link
            to="/entrada-datos/agroprogreso/licencias-ambientales"
            className="btn-secondary-link"
          >
            Ir a captura →
          </Link>
        </div>
      </div>
    )
  }

  const { meta, kpis, insights } = report

  return (
    <div className="carbon-page agro-licencias-report">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Operaciones · Agroprogreso · Analytics
          </p>
          <h1>Licencias ambientales</h1>
          <p>
            Hoja C. Admin Licencias · estados, categorías, mapa por sede y
            ventana de vigencia · {formatNum(meta.totalRows)} registro(s)
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Vigentes</span>
            <strong>{meta.vigentes}</strong>
          </div>
          <div>
            <span>En proceso</span>
            <strong>{meta.enProceso}</strong>
          </div>
          <div>
            <span>Con vigencia</span>
            <strong>{meta.conVigencia}</strong>
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
          <LicenciasMap sites={report.mapSites} />
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Estado del catálogo</h2>
            <p>Distribución VIGENTE / EN PROCESO / DESISTIDO</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={report.byEstado}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {report.byEstado.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={ESTADO_COLORS[entry.name] ?? '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Por categoría</h2>
            <p>Instrumentos A / B1 / B2 / C / CR / …</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.byCategoria} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Licencias" radius={[6, 6, 0, 0]}>
                  {report.byCategoria.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={CAT_COLORS[i % CAT_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Por sede</h2>
            <p>Conteo apilado por estado</p>
          </div>
          <div className="carbon-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.bySede} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis
                  dataKey="sede"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={64}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  dataKey="vigente"
                  name="Vigente"
                  stackId="a"
                  fill="#047935"
                />
                <Bar
                  dataKey="enProceso"
                  name="En proceso"
                  stackId="a"
                  fill="#3b82f6"
                />
                <Bar
                  dataKey="desistido"
                  name="Desistido"
                  stackId="a"
                  fill="#94a3b8"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2>
            <FileBadge
              size={18}
              style={{ marginRight: 8, verticalAlign: -3 }}
            />
            Línea de vigencia
          </h2>
          <p>
            {report.ganttRange
              ? `${formatIsoDate(report.ganttRange.min)} → ${formatIsoDate(report.ganttRange.max)}`
              : 'Sin periodos de vigencia parseables'}
          </p>
        </div>
        {report.gantt.length === 0 ? (
          <p className="agro-lic-gantt-empty">
            No hay licencias con rango «Del … al …» para mostrar.
          </p>
        ) : (
          <div className="agro-lic-gantt">
            {report.gantt.map((bar) => (
              <div key={bar.id} className="agro-lic-gantt-row">
                <div className="agro-lic-gantt-label">
                  <strong>{bar.licencia}</strong>
                  <span>
                    {bar.sede} · {formatIsoDate(bar.inicio)} –{' '}
                    {formatIsoDate(bar.fin)}
                    {bar.daysLeft != null
                      ? ` · ${bar.daysLeft >= 0 ? `${formatNum(bar.daysLeft)} d restantes` : 'vencida'}`
                      : ''}
                  </span>
                </div>
                <div className="agro-lic-gantt-track">
                  <div
                    className={ganttBarClass(bar.estado)}
                    style={{
                      left: `${bar.leftPct}%`,
                      width: `${bar.widthPct}%`,
                    }}
                    title={`${bar.estado}: ${formatIsoDate(bar.inicio)} – ${formatIsoDate(bar.fin)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {report.proximoVencer.length > 0 ? (
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Vencen en ≤ 12 meses</h2>
            <p>Solo licencias VIGENTE con fecha fin</p>
          </div>
          <div className="carbon-table-wrap agro-lic-catalog-wrap">
            <table className="carbon-table agro-lic-catalog">
              <thead>
                <tr>
                  <th>Licencia</th>
                  <th>Sede</th>
                  <th>Fin</th>
                  <th>Días</th>
                </tr>
              </thead>
              <tbody>
                {report.proximoVencer.map((row) => (
                  <tr key={`${row.licencia}-${row.fin}`}>
                    <td className="agro-lic-name">{row.licencia}</td>
                    <td className="agro-lic-sede">{row.sede}</td>
                    <td className="agro-lic-vig">{formatIsoDate(row.fin)}</td>
                    <td className="agro-lic-cat">
                      <span className="agro-lic-chip">
                        {formatNum(row.daysLeft)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2>Detalle de licencias</h2>
            <p>
              {filteredDetail.length} de {report.detailRows.length} registros
            </p>
          </div>
          <Link
            to="/entrada-datos/agroprogreso/licencias-ambientales"
            className="btn-secondary-link"
          >
            Editar catálogo →
          </Link>
        </div>

        <div
          className="agro-table-filters"
          aria-label="Filtros detalle licencias"
        >
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
            Estado
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {AGRO_LICENCIA_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {categoriaOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="carbon-table-wrap agro-lic-catalog-wrap">
          <table className="carbon-table agro-lic-catalog">
            <colgroup>
              <col className="col-sede" />
              <col className="col-licencia" />
              <col className="col-exp" />
              <col className="col-cat" />
              <col className="col-vig" />
              <col className="col-est" />
            </colgroup>
            <thead>
              <tr>
                <th>Sede</th>
                <th>Licencia</th>
                <th>Expediente</th>
                <th>Cat.</th>
                <th>Vigencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredDetail.length === 0 ? (
                <tr>
                  <td colSpan={6} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredDetail.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-sede">{row.sede}</td>
                    <td className="agro-lic-name">{row.licencia}</td>
                    <td className="agro-lic-exp">{row.expediente}</td>
                    <td className="agro-lic-cat">
                      <span className="agro-lic-chip">{row.categoria}</span>
                    </td>
                    <td className="agro-lic-vig">{row.vigencia}</td>
                    <td className="agro-lic-est">
                      <span className={estadoBadgeClass(row.estado)}>
                        {row.estado}
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
        Solo licencias Agroprogreso. Coordenadas de mapa son de referencia
        operativa por sede.
      </p>
    </div>
  )
}
