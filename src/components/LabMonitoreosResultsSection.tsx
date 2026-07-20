import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
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
import { formatNum } from '../data/agroMonitoreos'
import type { LabMonitoreosVisual } from '../data/labMonitoreosReport'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const MEDIO_COLORS = ['#047935', '#1a5c3a', '#5ab64b', '#c9a227', '#8bc34a']
const CUMPLE_COLORS = { Si: '#047935', No: '#c0392b', 'Sin dato': '#9aa3ab' }

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

type Props = {
  visual: LabMonitoreosVisual
  entryHref: string
  title?: string
  subtitle?: string
}

export function LabMonitoreosResultsSection({
  visual,
  entryHref,
  title = 'Resultados de laboratorio',
  subtitle = 'Parámetros extraídos de informes PDF o captura manual',
}: Props) {
  const { meta, kpis, compliance, byMedio, byPunto, monthly, detailRows, insights } =
    visual

  const pieData = [
    { name: 'Si', value: compliance.si },
    { name: 'No', value: compliance.no },
    { name: 'Sin dato', value: compliance.sinDato },
  ].filter((d) => d.value > 0)

  return (
    <div className="lab-results-report">
      <div className="dash-panel-head row lab-results-report-head">
        <div>
          <h2>
            <FlaskConical
              size={18}
              style={{ marginRight: 8, verticalAlign: -3 }}
            />
            {title}
          </h2>
          <p>
            {subtitle} · {meta.periodLabel}
          </p>
        </div>
        <Link to={entryHref} className="btn-secondary-link">
          Cargar / capturar →
        </Link>
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

      {meta.totalRows === 0 ? (
        <p className="lab-results-empty">
          Aún no hay resultados. En Entrada de datos puedes subir el PDF del
          laboratorio o capturar parámetros manualmente.
        </p>
      ) : (
        <>
          <div className="carbon-main-grid">
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Cumplimiento</h2>
                <p>Según veredicto del informe (Si / No)</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {pieData.map((s) => (
                      <Cell
                        key={s.name}
                        fill={
                          CUMPLE_COLORS[s.name as keyof typeof CUMPLE_COLORS] ??
                          '#9aa3ab'
                        }
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
                <h2>Por medio</h2>
                <p>Agua, aire, ruido u otro</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMedio}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Parámetros" radius={[6, 6, 0, 0]}>
                    {byMedio.map((s, i) => (
                      <Cell
                        key={s.name}
                        fill={MEDIO_COLORS[i % MEDIO_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>

          {monthly.length > 1 ? (
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Parámetros por mes</h2>
                <p>Volumen de resultados cargados</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                  <XAxis dataKey="short" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="params" name="Parámetros" fill="#047935" />
                  <Bar dataKey="noCumple" name="No cumplen" fill="#c0392b" />
                </BarChart>
              </ResponsiveContainer>
            </section>
          ) : null}

          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Puntos de muestreo</h2>
              <p>{byPunto.length} punto(s)</p>
            </div>
            <div className="carbon-table-wrap">
              <table className="carbon-table">
                <thead>
                  <tr>
                    <th>Punto</th>
                    <th>Medio</th>
                    <th>Última fecha</th>
                    <th>Parámetros</th>
                    <th>No cumplen</th>
                  </tr>
                </thead>
                <tbody>
                  {byPunto.map((p) => (
                    <tr key={`${p.punto}-${p.medio}`}>
                      <td>{p.punto}</td>
                      <td>{p.medio}</td>
                      <td>{p.fechaLatest}</td>
                      <td>{formatNum(p.params, 0)}</td>
                      <td>{formatNum(p.noCumple, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Detalle de parámetros</h2>
              <p>
                {Math.min(detailRows.length, 120)} de {detailRows.length} filas
              </p>
            </div>
            <div className="carbon-table-wrap agro-detail-wrap">
              <table className="carbon-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Punto</th>
                    <th>Medio</th>
                    <th>Parámetro</th>
                    <th>Resultado</th>
                    <th>Límite</th>
                    <th>Cumple</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.slice(0, 120).map((r) => (
                    <tr key={r.id}>
                      <td>{r.fecha}</td>
                      <td>{r.puntoMuestreo}</td>
                      <td>{r.medio || r.tipoAgua || '—'}</td>
                      <td>{r.parametro}</td>
                      <td>
                        {formatNum(r.resultado)}
                        {r.unidad ? ` ${r.unidad}` : ''}
                      </td>
                      <td>{r.limitePermisible || '—'}</td>
                      <td>{r.cumple || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
