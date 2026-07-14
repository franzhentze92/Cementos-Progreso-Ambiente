import {
  AlertTriangle,
  CheckCircle2,
  Factory,
  Flame,
  Leaf,
  Target,
  TrendingDown,
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
import { CarbonFootprintMap } from '../components/CarbonFootprintMap'
import {
  ABATEMENT_CURVE,
  ABATEMENT_LEVERS,
  CARBON_KPIS,
  CARBON_META,
  COUNTRY_FOOTPRINT,
  EMISSION_SOURCES,
  EXECUTIVE_ALERTS,
  INTENSITY_PATHWAY,
  MONTHLY_EMISSIONS,
  PLANT_EMISSIONS,
  SCOPE_BREAKDOWN,
} from '../data/carbonFootprint'

const STATUS_CLASS: Record<string, string> = {
  'En meta': 'status-ok',
  Atención: 'status-warn',
  Crítico: 'status-crit',
}

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const IMPACT_CLASS: Record<string, string> = {
  Alto: 'impact-high',
  Medio: 'impact-mid',
  Bajo: 'impact-low',
}

function formatDelta(delta: number) {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}%`
}

export function CarbonFootprintPage() {
  const plantsSorted = [...PLANT_EMISSIONS].sort((a, b) => b.tco2e - a.tco2e)

  return (
    <div className="carbon-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Leaf size={14} />
            Departamento de Ambiente · Vista ejecutiva
          </p>
          <h1>Huella de Carbono</h1>
          <p>
            Inventario GHG {CARBON_META.period} · Actualizado {CARBON_META.updatedAt}{' '}
            · {CARBON_META.methodology}
          </p>
        </div>
        <div className="carbon-header-meta">
          <div>
            <span>Línea base</span>
            <strong>{CARBON_META.baselineYear}</strong>
          </div>
          <div>
            <span>Meta</span>
            <strong>{CARBON_META.targetYear}</strong>
          </div>
          <div>
            <span>Ambición</span>
            <strong>−30% intensidad</strong>
          </div>
        </div>
      </div>

      <div className="carbon-kpi-grid">
        {CARBON_KPIS.map((kpi) => (
          <article key={kpi.id} className="carbon-kpi">
            <span>{kpi.label}</span>
            <strong>
              {kpi.value}
              <small>{kpi.unit}</small>
            </strong>
            <div className={`carbon-delta ${kpi.delta <= 0 ? 'down' : 'up'}`}>
              <TrendingDown size={14} />
              {formatDelta(kpi.delta)} {kpi.deltaLabel}
            </div>
            <p>{kpi.hint}</p>
          </article>
        ))}
      </div>

      <div className="carbon-alerts">
        {EXECUTIVE_ALERTS.map((alert) => (
          <article key={alert.id} className={`carbon-alert ${ALERT_CLASS[alert.level]}`}>
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

      <div className="carbon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Trayectoria de intensidad vs meta 2030</h2>
            <p>kgCO₂ por tonelada de cemento equivalente</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={INTENSITY_PATHWAY}>
                <defs>
                  <linearGradient id="carbonReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#047935" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#047935" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="year" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis
                  domain={[400, 660]}
                  tick={{ fill: '#5e5f61', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e5e8',
                    fontSize: 13,
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="real"
                  name="Real"
                  stroke="#047935"
                  fill="url(#carbonReal)"
                  strokeWidth={2.5}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  name="Meta corporativa"
                  stroke="#c2d500"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Distribución por alcance GHG</h2>
            <p>Millones de tCO₂e · protocolo GHG</p>
          </div>
          <div className="carbon-scope-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={SCOPE_BREAKDOWN}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {SCOPE_BREAKDOWN.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `${Number(v).toFixed(2)} MtCO₂e`}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="carbon-scope-list">
              {SCOPE_BREAKDOWN.map((s) => (
                <li key={s.name}>
                  <i style={{ background: s.fill }} />
                  <div>
                    <strong>{s.name}</strong>
                    <span>
                      {s.value} Mt · {s.share}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="carbon-secondary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Emisiones mensuales 2025</h2>
            <p>ktCO₂e por alcance</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={MONTHLY_EMISSIONS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="month" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="alcance1"
                  name="Alcance 1"
                  stackId="1"
                  stroke="#047935"
                  fill="#047935"
                  fillOpacity={0.75}
                />
                <Area
                  type="monotone"
                  dataKey="alcance2"
                  name="Alcance 2"
                  stackId="1"
                  stroke="#5ab64b"
                  fill="#5ab64b"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="alcance3"
                  name="Alcance 3"
                  stackId="1"
                  stroke="#c2d500"
                  fill="#c2d500"
                  fillOpacity={0.85}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Fuentes de emisión</h2>
            <p>% del inventario consolidado</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={EMISSION_SOURCES} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" horizontal={false} />
                <XAxis type="number" unit="%" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fill: '#5e5f61', fontSize: 11 }}
                />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="value" name="Participación" radius={[0, 8, 8, 0]} barSize={18}>
                  {EMISSION_SOURCES.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel carbon-map-panel">
          <div className="dash-panel-head">
            <h2>Mapa de intensidad por planta</h2>
            <p>Tamaño ≈ intensidad · color según semáforo</p>
          </div>
          <CarbonFootprintMap />
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head row">
          <div>
            <h2>
              <Factory size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Desempeño por planta de cemento
            </h2>
            <p>Emisiones absolutas, intensidad y palancas operativas</p>
          </div>
        </div>
        <div className="carbon-table-wrap">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>Planta</th>
                <th>País</th>
                <th>ktCO₂e</th>
                <th>Intensidad</th>
                <th>Sust. térmica</th>
                <th>% Renovable</th>
                <th>YoY</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {plantsSorted.map((plant) => (
                <tr key={plant.id}>
                  <td>
                    <strong>{plant.name}</strong>
                  </td>
                  <td>{plant.country}</td>
                  <td>{plant.tco2e.toLocaleString('es-GT')}</td>
                  <td>{plant.intensity} kg/t</td>
                  <td>{plant.thermalSub}%</td>
                  <td>{plant.renewableShare}%</td>
                  <td className={plant.yoy <= 0 ? 'delta-down' : 'delta-up'}>
                    {formatDelta(plant.yoy)}
                  </td>
                  <td>
                    <span className={`carbon-status ${STATUS_CLASS[plant.status]}`}>
                      {plant.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="carbon-tertiary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Huella por país</h2>
            <p>Contribución absoluta al inventario del grupo</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={COUNTRY_FOOTPRINT}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="country" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <Tooltip
                  formatter={(v, name) =>
                    name === 'tco2e'
                      ? [`${v} MtCO₂e`, 'Emisiones']
                      : [`${v}`, String(name)]
                  }
                />
                <Bar
                  dataKey="tco2e"
                  name="MtCO₂e"
                  radius={[8, 8, 0, 0]}
                  fill="#047935"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="carbon-country-chips">
            {COUNTRY_FOOTPRINT.map((c) => (
              <div key={c.country} className="carbon-chip">
                <strong>{c.country}</strong>
                <span>{c.share}% del total</span>
                <span>{c.intensity} kg/t</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Curva de abatimiento</h2>
            <p>Costo marginal vs potencial de reducción (USD/tCO₂e)</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={ABATEMENT_CURVE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="lever" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#5e5f61', fontSize: 11 }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="abatement"
                  name="ktCO₂e potenciales"
                  fill="#047935"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  name="USD/tCO₂e"
                  stroke="#c2d500"
                  strokeWidth={2.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head row">
          <div>
            <h2>
              <Target size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Palancas de descarbonización
            </h2>
            <p>Prioridades para la dirección de Ambiente y Operaciones</p>
          </div>
          <span className="dash-recs-badge">
            <Flame size={14} />
            {ABATEMENT_LEVERS.length} palancas
          </span>
        </div>
        <div className="carbon-levers-grid">
          {ABATEMENT_LEVERS.map((lever) => (
            <article key={lever.id} className="carbon-lever">
              <div className="carbon-lever-top">
                <span className={`carbon-impact ${IMPACT_CLASS[lever.impact]}`}>
                  Impacto {lever.impact}
                </span>
                <strong>{lever.potential}</strong>
              </div>
              <h3>{lever.title}</h3>
              <p>{lever.detail}</p>
              <div className="carbon-progress">
                <div className="carbon-progress-meta">
                  <span>Avance del plan</span>
                  <span>{lever.progress}%</span>
                </div>
                <div className="carbon-progress-bar">
                  <i style={{ width: `${lever.progress}%` }} />
                </div>
              </div>
              <footer>{lever.owner}</footer>
            </article>
          ))}
        </div>
      </section>

      <p className="carbon-disclaimer">
        Cifras ilustrativas para diseño del módulo ejecutivo. Sustituir por
        inventario verificado cuando se conecte la Entrada de Datos / Power BI
        corporativo.
      </p>
    </div>
  )
}
