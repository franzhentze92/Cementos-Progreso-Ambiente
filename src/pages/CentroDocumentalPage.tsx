import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  FolderOpen,
  Leaf,
  Loader2,
  Package,
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
import {
  loadDocumentosSummary,
  type DocumentosSummary,
} from '../lib/sectionSummariesApi'

const COLORS = ['#047935', '#5ab64b', '#c2d500', '#3d7ea6', '#c45c26', '#8b7355']

function iconFor(id: string) {
  switch (id) {
    case 'packs':
      return Package
    default:
      return FolderOpen
  }
}

export function CentroDocumentalPage() {
  const [summary, setSummary] = useState<DocumentosSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await loadDocumentosSummary()
        if (!cancelled) setSummary(data)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar el centro documental',
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
        <p>Cargando documentos desde la base de datos…</p>
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
          <p className="carbon-kicker">Documentos · Vista general</p>
          <h1>Centro documental</h1>
          <p>
            Estado de expedientes y packs de exportación disponibles para
            auditoría y gerencia.
          </p>
        </div>
        <div className="dash-header-actions">
          <span className="dash-live-badge">
            <Leaf size={14} />
            Datos vivos
          </span>
          {summary.modulesFailed.length > 0 && (
            <span
              className="dash-warn-badge"
              title={summary.modulesFailed.join(', ')}
            >
              <AlertTriangle size={14} />
              Error al cargar
            </span>
          )}
          <Link to="/exportes" className="btn-secondary-link">
            Exportes →
          </Link>
          <Link to="/biblioteca" className="btn-secondary-link">
            Biblioteca →
          </Link>
        </div>
      </div>

      <SectionKpiGrid kpis={summary.kpis} iconFor={iconFor} />

      <div className="dash-main-grid">
        <section className="dash-panel dash-chart-panel">
          <div className="dash-panel-head">
            <h2>Expedientes por tema</h2>
            <p>Distribución temática</p>
          </div>
          {summary.byTema.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={summary.byTema.slice(0, 10)}
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
                    width={120}
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={14}>
                    {summary.byTema.slice(0, 10).map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="Sin expedientes" to="/expedientes" />
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Expedientes por tipo</h2>
            <p>Clasificación documental</p>
          </div>
          {summary.byTipo.length > 0 ? (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.byTipo.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5e8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#5e5f61', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: '#5e5f61', fontSize: 12 }} />
                  <Tooltip contentStyle={dashTooltip} />
                  <Bar dataKey="value" fill="#047935" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="Sin tipología" to="/expedientes" />
          )}
        </section>
      </div>
    </div>
  )
}
