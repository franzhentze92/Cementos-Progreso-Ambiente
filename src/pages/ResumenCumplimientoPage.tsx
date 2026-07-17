import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ClipboardCheck,
  FileBadge,
  FolderKanban,
  Handshake,
  Leaf,
  Loader2,
  Scale,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  dashTooltip,
  EmptyPanel,
  SectionKpiGrid,
} from '../components/SectionDashBits'
import { formatIsoDate } from '../data/cumplimiento'
import {
  loadCumplimientoSectionSummary,
  type CumplimientoSectionSummary,
} from '../lib/sectionSummariesApi'

const BAR_COLORS = ['#047935', '#c45c26', '#c2d500', '#5e5f61', '#3d7ea6', '#8b7355']

function iconFor(id: string) {
  switch (id) {
    case 'venc':
    case 'crit':
      return Scale
    case 'capa':
      return ClipboardCheck
    case 'comp':
      return Handshake
    case 'lic':
      return FileBadge
    case 'tram':
      return FolderKanban
    default:
      return Scale
  }
}

export function ResumenCumplimientoPage() {
  const [summary, setSummary] = useState<CumplimientoSectionSummary | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await loadCumplimientoSectionSummary()
        if (!cancelled) setSummary(data)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar el resumen de cumplimiento',
          )
        }
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
      <div className="dash-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando cumplimiento desde la base de datos…</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="dash-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
        </div>
      </div>
    )
  }

  return (
    <div className="dash-page">
      <div className="page-header dash-header">
        <div>
          <p className="carbon-kicker">Cumplimiento · Vista general</p>
          <h1>Resumen de cumplimiento</h1>
          <p>
            Obligaciones, CAPAs, compromisos, licencias y trámites con datos
            vivos.
          </p>
        </div>
        <div className="dash-header-actions">
          <span className="dash-live-badge">
            <Leaf size={14} />
            {summary.modulesLoaded} módulos cargados
          </span>
          {summary.modulesFailed.length > 0 && (
            <span
              className="dash-warn-badge"
              title={summary.modulesFailed.join(', ')}
            >
              <AlertTriangle size={14} />
              {summary.modulesFailed.length} con error
            </span>
          )}
          <Link to="/calendario-legal" className="btn-secondary-link">
            Calendario →
          </Link>
        </div>
      </div>

      <SectionKpiGrid kpis={summary.kpis} iconFor={iconFor} />

      <div className="dash-main-grid">
        <section className="dash-panel dash-chart-panel">
          <div className="dash-panel-head">
            <h2>Obligaciones legales</h2>
            <p>Distribución por estado</p>
          </div>
          {summary.obligByEstado.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={summary.obligByEstado}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar dataKey="value" name="Cantidad" radius={[8, 8, 0, 0]}>
                    {summary.obligByEstado.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={BAR_COLORS[i % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="Sin obligaciones" to="/cumplimiento" />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Acciones correctivas (CAPA)</h2>
            <p>Por estado</p>
          </div>
          {summary.capaByEstado.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={summary.capaByEstado}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar dataKey="value" name="Cantidad" fill="#c45c26" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="Sin CAPAs" to="/capa" />
          )}
        </section>
      </div>

      <div className="dash-secondary-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Licencias ambientales</h2>
            <p>Por estado</p>
          </div>
          {summary.licByEstado.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={summary.licByEstado}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e5e8"
                    horizontal={false}
                  />
                  <XAxis type="number" tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar dataKey="value" fill="#047935" radius={[0, 8, 8, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin licencias"
              to="/operaciones/licencias-ambientales"
            />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Gestión de trámites</h2>
            <p>Por estado</p>
          </div>
          {summary.tramitesByEstado.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={summary.tramitesByEstado}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e5e8"
                    horizontal={false}
                  />
                  <XAxis type="number" tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar dataKey="value" fill="#5ab64b" radius={[0, 8, 8, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              text="Sin trámites"
              to="/operaciones/gestion-de-tramites"
            />
          )}
        </section>
      </div>

      <section className="dash-panel" style={{ marginTop: 16 }}>
        <div className="dash-panel-head">
          <h2>Próximos vencimientos</h2>
          <p>Obligaciones y CAPAs con fecha comprometida</p>
        </div>
        {summary.upcoming.length === 0 ? (
          <EmptyPanel text="Sin fechas próximas" to="/calendario-legal" />
        ) : (
          <div className="calendario-legal-list">
            {summary.upcoming.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className={`calendario-legal-row riesgo-${item.riesgo}`}
              >
                <time dateTime={item.fecha}>{formatIsoDate(item.fecha)}</time>
                <span className="calendario-legal-main">
                  <strong>{item.titulo}</strong>
                  <span>{item.origen}</span>
                </span>
                <span
                  className={`fase1-pill fase1-pill--${
                    item.riesgo === 'alto'
                      ? 'danger'
                      : item.riesgo === 'medio'
                        ? 'warn'
                        : 'ok'
                  }`}
                >
                  {item.riesgo === 'alto'
                    ? 'Urgente'
                    : item.riesgo === 'medio'
                      ? 'Próximo'
                      : 'Programado'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
