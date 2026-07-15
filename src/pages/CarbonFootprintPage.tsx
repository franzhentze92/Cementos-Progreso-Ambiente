import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Factory,
  Flame,
  Leaf,
  Loader2,
  Package,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { CarbonFootprintMap } from '../components/CarbonFootprintMap'
import {
  buildCarbonReport,
  type CarbonReport,
} from '../data/carbonReport'
import { loadCarbonCampaign } from '../lib/carbonApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

function formatDelta(delta: number | null | undefined, unit = '%') {
  if (delta == null || Number.isNaN(delta)) return null
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}${unit}`
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

export function CarbonFootprintPage() {
  const [report, setReport] = useState<CarbonReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { state } = await loadCarbonCampaign()
        if (cancelled) return
        setReport(buildCarbonReport(state))
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el reporte',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando indicadores Alicon…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
          <Link to="/entrada-datos/huella-de-carbono" className="btn-secondary-link">
            Ir a captura →
          </Link>
        </div>
      </div>
    )
  }

  const { meta, kpis, insights, totals } = report

  return (
    <div className="carbon-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Leaf size={14} />
            Monitoreo operativo · Planta Alicon
          </p>
          <h1>Huella de Carbono</h1>
          <p>
            Planta {meta.plant} · {meta.periodLabel} · {meta.methodology}
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Planta</span>
            <strong>{meta.plant}</strong>
          </div>
          <div>
            <span>Periodo con datos</span>
            <strong>{meta.periodLabel}</strong>
          </div>
          <div>
            <span>Fuente</span>
            <strong>Monitoreo Alicon</strong>
          </div>
        </div>
      </div>

      <div className="carbon-kpi-grid">
        {kpis.map((kpi) => {
          const deltaText = formatDelta(
            kpi.delta,
            kpi.id === 'factor' ? ' pp' : '%',
          )
          const down =
            kpi.delta == null
              ? false
              : kpi.id === 'factor' || kpi.id === 'elec'
                ? kpi.delta <= 0
                : kpi.delta >= 0
          return (
            <article key={kpi.id} className="carbon-kpi">
              <span>{kpi.label}</span>
              <strong>
                {kpi.value}
                <small>{kpi.unit}</small>
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
              <Factory size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Producción mensual de cemento
            </h2>
            <p>Toneladas UGC vs CFB</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={report.monthlyProduction}>
                <defs>
                  <linearGradient id="ugcFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#047935" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#047935" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="cfbFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c2d500" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#c2d500" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="month" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => `${Number(v).toLocaleString('es-GT')} t`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="ugc"
                  name="UGC"
                  stackId="1"
                  stroke="#047935"
                  fill="url(#ugcFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cfb"
                  name="CFB"
                  stackId="1"
                  stroke="#c2d500"
                  fill="url(#cfbFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Mix de cemento vs materias primas</h2>
            <p>Participación acumulada del periodo</p>
          </div>
          <div className="carbon-scope-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={report.cementMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={74}
                  paddingAngle={3}
                >
                  {report.cementMix.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) =>
                    `${Number(v).toLocaleString('es-GT', { maximumFractionDigits: 0 })} t`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="carbon-scope-list">
              {report.cementMix.map((s) => {
                const share =
                  totals.totalCement > 0
                    ? (s.value / totals.totalCement) * 100
                    : 0
                return (
                  <li key={s.name}>
                    <i style={{ background: s.fill }} />
                    <div>
                      <strong>{s.name}</strong>
                      <span>
                        {s.value.toLocaleString('es-GT', {
                          maximumFractionDigits: 0,
                        })}{' '}
                        t · {share.toFixed(1)}%
                      </span>
                    </div>
                  </li>
                )
              })}
              <li>
                <i style={{ background: '#5e5f61' }} />
                <div>
                  <strong>Clinker ingreso / consumo</strong>
                  <span>
                    {totals.totalClinkerIn.toLocaleString('es-GT', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    /{' '}
                    {totals.totalClinkerOut.toLocaleString('es-GT', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    t
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <div className="carbon-secondary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Trayectoria del factor clinker</h2>
            <p>% clinker en UGC, CFB y promedio de planta</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={report.monthlyProduction}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="month" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis
                  domain={[50, 90]}
                  tick={{ fill: '#5e5f61', fontSize: 11 }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => `${Number(v).toFixed(1)}%`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="factorUGC"
                  name="Factor UGC"
                  stroke="#047935"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="factorCFB"
                  name="Factor CFB"
                  stroke="#5ab64b"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="factorPlanta"
                  name="Factor planta"
                  stroke="#c2d500"
                  strokeWidth={2.5}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Materias primas (acumulado)</h2>
            <p>Toneladas que entran al cemento en el periodo</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={report.materialMix}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e5e8"
                  horizontal={false}
                />
                <XAxis type="number" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fill: '#5e5f61', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v) => `${Number(v).toLocaleString('es-GT')} t`}
                />
                <Bar dataKey="value" name="ton" radius={[0, 8, 8, 0]} barSize={18}>
                  {report.materialMix.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel carbon-map-panel">
          <div className="dash-panel-head">
            <h2>Ubicación — planta Alicon</h2>
            <p>Indicadores del periodo en el mapa</p>
          </div>
          <CarbonFootprintMap plantSummary={report.plantSummary} />
        </section>
      </div>

      <div className="carbon-secondary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Zap size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Energía eléctrica mensual
            </h2>
            <p>kWh por uso · producción de cemento vs servicios</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={report.monthlyElectricity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="month" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => `${Number(v).toLocaleString('es-GT')} kWh`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="produccion"
                  name="Prod. cemento"
                  stackId="1"
                  stroke="#047935"
                  fill="#047935"
                  fillOpacity={0.75}
                />
                <Area
                  type="monotone"
                  dataKey="servicios"
                  name="Servicios"
                  stackId="1"
                  stroke="#5ab64b"
                  fill="#5ab64b"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="perdidas"
                  name="Pérdidas"
                  stackId="1"
                  stroke="#c2d500"
                  fill="#c2d500"
                  fillOpacity={0.85}
                />
                <Area
                  type="monotone"
                  dataKey="red"
                  name="Red eléctrica"
                  stackId="1"
                  stroke="#5e5f61"
                  fill="#5e5f61"
                  fillOpacity={0.7}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Intensidad eléctrica (proxy de Alcance 2)</h2>
            <p>kWh por tonelada de cemento</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={report.monthlyElectricity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="month" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5e5f61', fontSize: 11 }} unit=" kWh/t" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) =>
                    v == null ? '—' : `${Number(v).toFixed(1)} kWh/t`
                  }
                />
                <Bar
                  dataKey="kwhPerTon"
                  name="kWh/t"
                  fill="#047935"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="kwhPerTon"
                  name="Tendencia"
                  stroke="#c2d500"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Flame size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Diésel móvil (proxy Alcance 1)
            </h2>
            <p>Galones de flota propia · intensidad gal/t</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={report.monthlyFuel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="month" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#5e5f61', fontSize: 11 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="dieselMovil"
                  name="Diésel (gal)"
                  fill="#047935"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="galPerTon"
                  name="gal/t cemento"
                  stroke="#c2d500"
                  strokeWidth={2.5}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="carbon-tertiary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Droplets size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Agua y residuos
            </h2>
            <p>Consumo de agua (pipas) y disposición de residuos sólidos</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={report.monthlyWater}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="month" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  dataKey="pipas"
                  name="Agua pipas (m³)"
                  fill="#047935"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="aguaHumana"
                  name="Garrafones"
                  stroke="#5ab64b"
                  strokeWidth={2.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="carbon-inline-note">
            Tratamiento residual:{' '}
            {report.plantSummary.waterConfig.metodosTratamiento} ·{' '}
            {report.plantSummary.waterConfig.disposicionResidual}
          </p>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Disposición de residuos (acumulado)</h2>
            <p>Toneladas por vía de manejo en el periodo</p>
          </div>
          <div className="carbon-scope-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={report.wasteDisposition}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {report.wasteDisposition.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)} t`} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="carbon-scope-list">
              {report.wasteDisposition.map((s) => (
                <li key={s.name}>
                  <i style={{ background: s.fill }} />
                  <div>
                    <strong>{s.name}</strong>
                    <span>{s.value.toFixed(2)} t</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="dash-chart" style={{ marginTop: 8 }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={report.monthlyWaste}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="month" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  dataKey="vertedero"
                  name="Vertedero"
                  stackId="w"
                  fill="#5e5f61"
                />
                <Bar
                  dataKey="reciclados"
                  name="Reciclados"
                  stackId="w"
                  fill="#047935"
                />
                <Bar
                  dataKey="reutilizados"
                  name="Reutilizados"
                  stackId="w"
                  fill="#5ab64b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="carbon-secondary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Package size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Envasado e insumos
            </h2>
            <p>Sacos recibidos y cemento reprocesado por roturas</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={report.monthlySupplies}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="month" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#5e5f61', fontSize: 11 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="sacosMillares"
                  name="Sacos (millares)"
                  fill="#047935"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="reprocesado"
                  name="Cemento reprocesado (t)"
                  stroke="#c2d500"
                  strokeWidth={2.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head row">
            <div>
              <h2>Resumen operativo Alicon</h2>
              <p>Totales del periodo con datos cargados</p>
            </div>
            <Link
              to="/entrada-datos/huella-de-carbono"
              className="btn-secondary-link"
            >
              Ir a captura →
            </Link>
          </div>
          <div className="carbon-table-wrap">
            <table className="carbon-table">
              <tbody>
                <tr>
                  <td>
                    <strong>Producción cemento</strong>
                  </td>
                  <td>
                    {totals.totalCement.toLocaleString('es-GT', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    t
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>UGC / CFB</strong>
                  </td>
                  <td>
                    {totals.totalUGC.toLocaleString('es-GT', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    /{' '}
                    {totals.totalCFB.toLocaleString('es-GT', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    t
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Factor clinker promedio</strong>
                  </td>
                  <td>
                    {totals.avgFactorPlanta != null
                      ? `${totals.avgFactorPlanta.toFixed(1)} %`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Electricidad total</strong>
                  </td>
                  <td>
                    {(totals.totalElec / 1000).toLocaleString('es-GT', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    MWh ·{' '}
                    {totals.avgKwhPerTon != null
                      ? `${totals.avgKwhPerTon.toFixed(0)} kWh/t`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Diésel móvil</strong>
                  </td>
                  <td>
                    {totals.totalDiesel.toLocaleString('es-GT', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    gal
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Agua (pipas)</strong>
                  </td>
                  <td>
                    {totals.totalWater.toLocaleString('es-GT', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    m³
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Sacos / reprocesado</strong>
                  </td>
                  <td>
                    {totals.totalSacos.toLocaleString('es-GT', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    millares ·{' '}
                    {totals.totalReproc.toLocaleString('es-GT', {
                      maximumFractionDigits: 1,
                    })}{' '}
                    t reprocesadas
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Desvío de residuos</strong>
                  </td>
                  <td>
                    {totals.diversionRate != null
                      ? `${totals.diversionRate.toFixed(0)} %`
                      : '—'}{' '}
                    (reciclado + reutilizado)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className="carbon-disclaimer">
        Visualizaciones del monitoreo Alicon ({meta.periodLabel}). Aún no se
        calculan tCO₂e: faltan factores de emisión oficiales.
      </p>
    </div>
  )
}
