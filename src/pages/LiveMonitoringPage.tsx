import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudFog,
  Droplets,
  Gauge,
  Radio,
  Thermometer,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  buildLiveMonitoringSnapshot,
  formatLiveNum,
  THRESHOLDS,
  type LiveMonitoringSnapshot,
  type StationStatus,
} from '../data/kunakLiveMonitoring'

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const STATUS_LABEL: Record<StationStatus, string> = {
  online: 'En línea',
  warning: 'Alerta',
  offline: 'Sin señal',
}

const REFRESH_MS = 5000

export function LiveMonitoringPage() {
  const [snap, setSnap] = useState<LiveMonitoringSnapshot>(() =>
    buildLiveMonitoringSnapshot(),
  )
  const [plantFilter, setPlantFilter] = useState<string>('all')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setSnap(buildLiveMonitoringSnapshot())
      setTick((t) => t + 1)
    }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [])

  const plants = snap.byPlant
  const stations =
    plantFilter === 'all'
      ? snap.stations
      : snap.stations.filter((s) => s.plantId === plantFilter)

  const plantCompare = snap.byPlant.map((p) => ({
    name: p.plant.replace('Planta ', ''),
    PM25: p.pm25,
    PM10: p.pm10,
    Ruido: p.noise,
  }))

  const secondsAgo = Math.max(
    0,
    Math.floor((Date.now() - snap.generatedAt.getTime()) / 1000),
  )

  return (
    <div className="dash-page live-mon-page">
      <div className="dash-header">
        <div>
          <p className="carbon-kicker">
            <Radio size={14} />
            Red Kunak · Indoor
          </p>
          <h1>Monitoreo en vivo</h1>
          <p>
            Clima indoor, material particulado y ruido en plantas Cementos
            Progreso · telemetría Kunak AIR Pro
          </p>
        </div>
        <div className="dash-header-actions live-mon-header-actions">
          <span className="dash-live-badge live-mon-pulse-badge">
            <span className="live-mon-dot" aria-hidden />
            En vivo
          </span>
          <span className="live-mon-meta">
            Actualizado hace {secondsAgo}s · ciclo #{tick + 1}
          </span>
          <label className="agro-year-filter" htmlFor="live-mon-plant">
            <select
              id="live-mon-plant"
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value)}
            >
              <option value="all">Todas las plantas</option>
              {plants.map((p) => (
                <option key={p.plantId} value={p.plantId}>
                  {p.plant}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="dash-kpi-grid live-mon-kpi-grid">
        <article className="dash-kpi">
          <Wifi size={22} />
          <div>
            <span>Estaciones online</span>
            <strong>
              {snap.kpis.online}/{snap.kpis.total}
            </strong>
            <p>Kunak AIR Pro Indoor</p>
          </div>
        </article>
        <article className="dash-kpi lime">
          <CloudFog size={22} />
          <div>
            <span>PM₂.₅ promedio</span>
            <strong>{formatLiveNum(snap.kpis.avgPm25, 1)}</strong>
            <p>µg/m³ · aviso {THRESHOLDS.pm25.warn}</p>
          </div>
        </article>
        <article className="dash-kpi dark">
          <Volume2 size={22} />
          <div>
            <span>Ruido promedio</span>
            <strong>{formatLiveNum(snap.kpis.avgNoise)}</strong>
            <p>dBA · aviso {THRESHOLDS.noise.warn}</p>
          </div>
        </article>
        <article
          className={`dash-kpi${snap.kpis.exceedances > 0 ? ' warn' : ''}`}
        >
          <Gauge size={22} />
          <div>
            <span>Excedencias activas</span>
            <strong>{snap.kpis.exceedances}</strong>
            <p>
              Temp {formatLiveNum(snap.kpis.avgTemp, 1)} °C · HR{' '}
              {formatLiveNum(snap.kpis.avgHumidity)} %
            </p>
          </div>
        </article>
      </div>

      {snap.alerts.length > 0 ? (
        <div className="carbon-alerts">
          {snap.alerts.map((alert) => (
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
                <p>
                  {alert.plant} · {alert.text}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="carbon-main-grid live-mon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Activity size={16} />
              Tendencia red (últimas 4 h)
            </h2>
            <p>Promedio estaciones online · intervalo 5 min</p>
          </div>
          <div className="live-mon-chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={snap.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe9" />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={36} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  width={36}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pm25"
                  name="PM₂.₅"
                  stroke="#047935"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pm10"
                  name="PM₁₀"
                  stroke="#c2d500"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="noise"
                  name="Ruido dBA"
                  stroke="#c45c26"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Thermometer size={16} />
              Clima indoor
            </h2>
            <p>Temperatura y humedad relativa</p>
          </div>
          <div className="live-mon-chart">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={snap.timeline}>
                <defs>
                  <linearGradient id="liveTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#047935" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#047935" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="liveHum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3d7ea6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3d7ea6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe9" />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  name="Temp °C"
                  stroke="#047935"
                  fill="url(#liveTemp)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="humidity"
                  name="HR %"
                  stroke="#3d7ea6"
                  fill="url(#liveHum)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="carbon-main-grid live-mon-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <CloudFog size={16} />
              Comparativo por planta
            </h2>
            <p>PM₂.₅, PM₁₀ y ruido promedio</p>
          </div>
          <div className="live-mon-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={plantCompare}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="PM25" name="PM₂.₅" fill="#047935" radius={[6, 6, 0, 0]} />
                <Bar dataKey="PM10" name="PM₁₀" fill="#5ab64b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Ruido" name="Ruido" fill="#c9a227" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              <Droplets size={16} />
              CO₂ indoor (red)
            </h2>
            <p>ppm · umbral aviso {THRESHOLDS.co2.warn}</p>
          </div>
          <div className="live-mon-chart">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={snap.timeline}>
                <defs>
                  <linearGradient id="liveCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5e5f61" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5e5f61" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe9" />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis tick={{ fontSize: 11 }} width={42} domain={[400, 'auto']} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="co2"
                  name="CO₂ ppm"
                  stroke="#5e5f61"
                  fill="url(#liveCo2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="dash-panel live-mon-stations">
        <div className="dash-panel-head">
          <h2>
            <Radio size={16} />
            Estaciones Kunak
          </h2>
          <p>
            {stations.length} dispositivo
            {stations.length === 1 ? '' : 's'} · lectura actual
          </p>
        </div>

        <div className="live-mon-station-grid">
          {stations.map((s) => (
            <article
              key={s.id}
              className={`live-mon-station live-mon-station--${s.status}`}
            >
              <header>
                <div>
                  <strong>{s.label}</strong>
                  <p>
                    {s.plant} · {s.zone}
                  </p>
                </div>
                <span className={`live-mon-status live-mon-status--${s.status}`}>
                  {s.status === 'offline' ? (
                    <WifiOff size={12} />
                  ) : (
                    <Wifi size={12} />
                  )}
                  {STATUS_LABEL[s.status]}
                </span>
              </header>

              <p className="live-mon-station-id">
                {s.id} · {s.model}
              </p>

              <div className="live-mon-metrics">
                <div>
                  <span>Temp</span>
                  <strong>{formatLiveNum(s.reading.temperature, 1)} °C</strong>
                </div>
                <div>
                  <span>HR</span>
                  <strong>{formatLiveNum(s.reading.humidity)} %</strong>
                </div>
                <div>
                  <span>PM₂.₅</span>
                  <strong
                    className={
                      s.reading.pm25 >= THRESHOLDS.pm25.warn
                        ? 'live-mon-metric-warn'
                        : undefined
                    }
                  >
                    {formatLiveNum(s.reading.pm25, 1)}
                  </strong>
                </div>
                <div>
                  <span>PM₁₀</span>
                  <strong
                    className={
                      s.reading.pm10 >= THRESHOLDS.pm10.warn
                        ? 'live-mon-metric-warn'
                        : undefined
                    }
                  >
                    {formatLiveNum(s.reading.pm10, 1)}
                  </strong>
                </div>
                <div>
                  <span>Ruido</span>
                  <strong
                    className={
                      s.reading.noise >= THRESHOLDS.noise.warn
                        ? 'live-mon-metric-warn'
                        : undefined
                    }
                  >
                    {formatLiveNum(s.reading.noise)} dBA
                  </strong>
                </div>
                <div>
                  <span>CO₂</span>
                  <strong>{formatLiveNum(s.reading.co2)} ppm</strong>
                </div>
                <div>
                  <span>PM₁</span>
                  <strong>{formatLiveNum(s.reading.pm1, 1)}</strong>
                </div>
                <div>
                  <span>NO₂</span>
                  <strong>{formatLiveNum(s.reading.no2, 1)} µg/m³</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
