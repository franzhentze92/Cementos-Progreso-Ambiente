import {
  ArrowUpRight,
  Bird,
  Bolt,
  Factory,
  Flame,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { DashboardMap } from '../components/DashboardMap'
import {
  BIODIVERSITY,
  COUNTRY_SITES,
  EMISSIONS_TREND,
  ENERGY_MIX,
  RECOMMENDATIONS,
  THERMAL_MIX,
} from '../data/dashboard'
import { SITES } from '../data/locations'

const PRIORITY_CLASS: Record<string, string> = {
  Alta: 'prio-high',
  Media: 'prio-mid',
  Baja: 'prio-low',
}

export function DashboardPage() {
  const { user } = useAuth()
  const operativeSites = SITES.filter((s) => s.status === 'Operativa').length

  return (
    <div className="dash-page">
      <div className="page-header dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Bienvenido, {user?.name}. Panorama ambiental 2026 de Cementos
            Progreso.
          </p>
        </div>
      </div>

      <div className="dash-kpi-grid">
        <div className="dash-kpi">
          <div className="dash-kpi-icon">
            <Bolt size={18} />
          </div>
          <div>
            <span>Energía renovable</span>
            <strong>62.1%</strong>
            <small>de 555.8 GWh eléctricos</small>
          </div>
        </div>
        <div className="dash-kpi lime">
          <div className="dash-kpi-icon">
            <Flame size={18} />
          </div>
          <div>
            <span>Sustitución térmica</span>
            <strong>9.8%</strong>
            <small>14,318 TJ energía térmica</small>
          </div>
        </div>
        <div className="dash-kpi dark">
          <div className="dash-kpi-icon">
            <Factory size={18} />
          </div>
          <div>
            <span>Sitios operativos</span>
            <strong>{operativeSites}</strong>
            <small>en {COUNTRY_SITES.length} países</small>
          </div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon">
            <Bird size={18} />
          </div>
          <div>
            <span>Biodiversidad</span>
            <strong>265</strong>
            <small>especies animales monitoreadas</small>
          </div>
        </div>
      </div>

      <div className="dash-main-grid">
        <section className="dash-panel dash-chart-panel">
          <div className="dash-panel-head">
            <h2>Tendencia de intensidad de CO₂</h2>
            <p>tCO₂ por tonelada de cemento equivalente (indicativa)</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={EMISSIONS_TREND}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#047935" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#047935" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c2d500" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#c2d500" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="year" tick={{ fill: '#5e5f61', fontSize: 12 }} />
                <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} domain={[0, 0.7]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e5e8',
                    fontSize: 13,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="alcance1"
                  name="Alcance 1"
                  stroke="#047935"
                  fill="url(#g1)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="alcance2"
                  name="Alcance 2"
                  stroke="#c2d500"
                  fill="url(#g2)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Mix energético 2026</h2>
            <p>Electricidad y térmica</p>
          </div>
          <div className="dash-donuts">
            <div className="dash-donut">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={ENERGY_MIX}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={3}
                  >
                    {ENERGY_MIX.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <strong>62.1% renovable</strong>
              <span>Energía eléctrica</span>
            </div>
            <div className="dash-donut">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={THERMAL_MIX}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={3}
                  >
                    {THERMAL_MIX.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <strong>9.8% alternos</strong>
              <span>Energía térmica</span>
            </div>
          </div>
        </section>
      </div>

      <div className="dash-secondary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Presencia regional</h2>
            <p>Sitios por país en el inventario georreferenciado</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={COUNTRY_SITES} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#5e5f61', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={90}
                  tick={{ fill: '#5e5f61', fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="sites" name="Sitios" radius={[0, 8, 8, 0]} barSize={16}>
                  {COUNTRY_SITES.map((entry) => (
                    <Cell
                      key={entry.country}
                      fill={entry.country === 'Guatemala' ? '#047935' : '#5ab64b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel dash-map-panel">
          <div className="dash-panel-head">
            <h2>Mapa de plantas</h2>
            <p>Vista satélite de operaciones de cemento y concreto</p>
          </div>
          <DashboardMap />
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Biodiversidad monitoreada</h2>
            <p>Registros desde 2007 en Guatemala</p>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={BIODIVERSITY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                <XAxis dataKey="name" tick={{ fill: '#5e5f61', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Especies" radius={[8, 8, 0, 0]}>
                  {BIODIVERSITY.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="dash-panel dash-recs">
        <div className="dash-panel-head row">
          <div>
            <h2>
              <Sparkles size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
              Recomendaciones ambientales
            </h2>
            <p>Sugerencias operativas basadas en los indicadores actuales</p>
          </div>
          <span className="dash-recs-badge">
            <Lightbulb size={14} />
            {RECOMMENDATIONS.length} acciones
          </span>
        </div>

        <div className="dash-recs-grid">
          {RECOMMENDATIONS.map((rec) => (
            <article key={rec.id} className="dash-rec-card">
              <div className="dash-rec-top">
                <span className={`dash-prio ${PRIORITY_CLASS[rec.priority]}`}>
                  {rec.priority}
                </span>
                <ArrowUpRight size={16} className="dash-rec-arrow" />
              </div>
              <h3>{rec.title}</h3>
              <p>{rec.detail}</p>
              <footer>{rec.action}</footer>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
