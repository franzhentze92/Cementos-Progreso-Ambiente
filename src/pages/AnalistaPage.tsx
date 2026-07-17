import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
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
import { MarkdownBrief } from '../components/MarkdownBrief'
import {
  ANALISTA_ESTADOS,
  CATEGORY_LABEL,
  WEEKLY_DRAFT_PROMPT,
  formFromRecord,
  formatNum,
  type AnalistaSignal,
  type AnalistaSignalCategory,
  type BriefingForm,
  type BriefingRecord,
} from '../data/analista'
import type { AnalistaReport } from '../data/analistaReport'
import {
  computeLiveAnalistaReport,
  deleteBriefing,
  generateWeeklyBriefing,
  loadBriefings,
  upsertBriefing,
} from '../lib/analistaApi'
import { askCopilot } from '../lib/chat/askCopilot'
import type { ChatDomainId } from '../lib/chat/types'
import { downloadCsv, stampFilename } from '../lib/exportDownload'
import { runExportPack } from '../lib/exportPacks'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
  Info: 'alert-warn',
}

const LEVEL_PILL: Record<string, string> = {
  Crítico: 'fase1-pill fase1-pill--danger',
  Atención: 'fase1-pill fase1-pill--warn',
  Positivo: 'fase1-pill fase1-pill--ok',
  Info: 'fase1-pill fase1-pill--info',
}

const COLORS = ['#047935', '#c45c26', '#3b82f6', '#94a3b8', '#5ab64b']

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const CATEGORIES = Object.keys(CATEGORY_LABEL) as AnalistaSignalCategory[]

const DRAFT_DOMAINS: ChatDomainId[] = [
  'analista',
  'cumplimiento',
  'capa',
  'metas',
  'umbrales',
  'intensidad',
  'circularidad',
  'expedientes',
]

export function AnalistaPage() {
  const [live, setLive] = useState<AnalistaReport | null>(null)
  const [briefings, setBriefings] = useState<BriefingRecord[]>([])
  const [active, setActive] = useState<BriefingRecord | null>(null)
  const [form, setForm] = useState<BriefingForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')

  async function reload(keepId?: string) {
    setLoading(true)
    setError(null)
    try {
      const [report, rows] = await Promise.all([
        computeLiveAnalistaReport(),
        loadBriefings(),
      ])
      setLive(report)
      setBriefings(rows)

      let selected =
        (keepId && rows.find((r) => r.id === keepId)) ||
        rows.find((r) => r.semanaInicio === report.semanaInicio) ||
        rows[0] ||
        null

      if (!selected) {
        const created = await generateWeeklyBriefing({
          generadoPor: 'Analista automático',
        })
        const refreshed = await loadBriefings()
        setBriefings(refreshed)
        selected = refreshed.find((r) => r.id === created.id) ?? created
        setOkMsg('Briefing de la semana generado')
      }

      setActive(selected)
      setForm(selected ? formFromRecord(selected) : null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el analista',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (!okMsg) return
    const t = window.setTimeout(() => setOkMsg(null), 4000)
    return () => window.clearTimeout(t)
  }, [okMsg])

  const signals: AnalistaSignal[] = useMemo(() => {
    if (active?.signals?.length) return active.signals
    return live?.signals ?? []
  }, [active, live])

  const kpis = active?.kpis ?? live?.kpis
  const weekLabel = live?.weekLabel ?? active?.titulo ?? '—'

  const filteredSignals = useMemo(() => {
    if (filterCat === 'all') return signals
    return signals.filter((s) => s.category === filterCat)
  }, [signals, filterCat])

  const chartData = useMemo(() => {
    if (live?.byCategory?.length) {
      return live.byCategory.map((c) => ({
        name: CATEGORY_LABEL[c.name as AnalistaSignalCategory] ?? c.name,
        value: c.value,
        criticos: c.criticos,
      }))
    }
    const map = new Map<string, number>()
    for (const s of signals) {
      map.set(s.category, (map.get(s.category) ?? 0) + 1)
    }
    return [...map.entries()].map(([cat, value]) => ({
      name: CATEGORY_LABEL[cat as AnalistaSignalCategory] ?? cat,
      value,
      criticos: 0,
    }))
  }, [live, signals])

  async function handleRefreshSignals() {
    setBusy(true)
    setError(null)
    try {
      const row = await generateWeeklyBriefing({
        generadoPor: 'Analista automático',
        keepBorrador: true,
        existingId: active?.id,
      })
      setOkMsg('Señales actualizadas')
      await reload(row.id)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron regenerar señales',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveMeta() {
    if (!form || !active) return
    setBusy(true)
    setError(null)
    try {
      const saved = await upsertBriefing(
        { ...form, id: active.id },
        active.signals,
        active.kpis,
      )
      setOkMsg('Briefing guardado')
      await reload(saved.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  async function handleDraft() {
    if (!active) return
    setDrafting(true)
    setError(null)
    try {
      const signalBlock = signals
        .slice(0, 20)
        .map((s) => `- [${s.level}/${s.category}] ${s.title}: ${s.text}`)
        .join('\n')
      const question = `${WEEKLY_DRAFT_PROMPT}

SEMANA: ${active.semanaInicio} → ${active.semanaFin}
RESUMEN ACTUAL:
${active.resumen || live?.resumen || 'Sin resumen'}

SEÑALES:
${signalBlock || '- Sin señales'}

FORECAST:
${(live?.forecastLines ?? []).join('\n') || '- Sin forecast'}
`
      const result = await askCopilot({
        question,
        domainIds: DRAFT_DOMAINS,
      })
      if (result.error && !result.reply) {
        throw new Error(result.error)
      }
      const borrador = result.reply?.trim() || ''
      if (!borrador) throw new Error('El copiloto no devolvió borrador')

      const nextForm: BriefingForm = {
        ...formFromRecord(active),
        borradorMd: borrador,
        resumen: active.resumen || live?.resumen || '',
      }
      const saved = await upsertBriefing(nextForm, active.signals, active.kpis)
      setOkMsg(
        result.source === 'local'
          ? 'Borrador local generado'
          : 'Borrador ejecutivo generado',
      )
      await reload(saved.id)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo generar el borrador',
      )
    } finally {
      setDrafting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este briefing?')) return
    try {
      await deleteBriefing(id)
      setOkMsg('Briefing eliminado')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  function exportCsvLocal() {
    downloadCsv(
      stampFilename('analista_senales', 'csv'),
      ['Nivel', 'Categoría', 'Título', 'Detalle', 'Enlace', 'Score'],
      signals.map((s) => [
        s.level,
        CATEGORY_LABEL[s.category],
        s.title,
        s.text,
        s.href ?? '',
        s.score,
      ]),
    )
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando Briefing Semanal…</p>
      </div>
    )
  }

  return (
    <div className="carbon-page fase1-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Brain size={14} />
            Fase 4 · Predictivo
          </p>
          <h1>Briefing Semanal</h1>
          <p>
            Señales proactivas de la semana ({weekLabel}): vencimientos,
            anomalías, forecast de metas y riesgo operativo.
          </p>
        </div>
        <div className="hc-header-actions">
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void handleRefreshSignals()}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="hc-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Actualizar señales
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleDraft()}
            disabled={drafting || !active}
          >
            {drafting ? (
              <Loader2 className="hc-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            Generar borrador
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={exportCsvLocal}
          >
            <Download size={16} /> CSV
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void runExportPack('analista', 'pdf')}
          >
            <Download size={16} /> PDF
          </button>
          <Link to="/exportes" className="btn-secondary-link">
            Centro de exportes →
          </Link>
        </div>
      </div>

      {error && (
        <div className="hc-banner hc-banner-error" role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {okMsg && (
        <div className="hc-banner hc-banner-ok" role="status">
          <CheckCircle2 size={16} /> {okMsg}
        </div>
      )}

      {kpis && (
        <div className="carbon-kpi-grid">
          <div className={`carbon-kpi ${kpis.criticos > 0 ? 'warn' : ''}`}>
            <span>Críticos</span>
            <strong>{formatNum(kpis.criticos)}</strong>
          </div>
          <div className={`carbon-kpi ${kpis.atencion > 0 ? 'warn' : ''}`}>
            <span>Atención</span>
            <strong>{formatNum(kpis.atencion)}</strong>
          </div>
          <div className="carbon-kpi">
            <span>Vencimientos</span>
            <strong>{formatNum(kpis.vencimientos)}</strong>
          </div>
          <div className="carbon-kpi">
            <span>Anomalías</span>
            <strong>{formatNum(kpis.anomalias)}</strong>
          </div>
          <div className="carbon-kpi dark">
            <span>Metas en riesgo</span>
            <strong>{formatNum(kpis.metasRiesgo)}</strong>
          </div>
          <div className="carbon-kpi">
            <span>Sitios críticos</span>
            <strong>{formatNum(kpis.sitiosCriticos)}</strong>
          </div>
        </div>
      )}

      <div className="carbon-main-grid">
        <section className="carbon-section">
          <div className="fase1-section-head">
            <h2>Señales por categoría</h2>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="carbon-section">
          <div className="fase1-section-head">
            <h2>Briefing de la semana</h2>
          </div>
          {form && active ? (
            <div className="fase1-form" style={{ gridTemplateColumns: '1fr' }}>
              <label>
                Título
                <input
                  value={form.titulo}
                  onChange={(e) =>
                    setForm({ ...form, titulo: e.target.value })
                  }
                />
              </label>
              <label>
                Estado
                <select
                  value={form.estado}
                  onChange={(e) =>
                    setForm({ ...form, estado: e.target.value })
                  }
                >
                  {ANALISTA_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notas internas
                <textarea
                  rows={2}
                  value={form.notas}
                  onChange={(e) =>
                    setForm({ ...form, notas: e.target.value })
                  }
                />
              </label>
              <div className="fase1-export-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void handleSaveMeta()}
                  disabled={busy}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={() => void handleDelete(active.id)}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
              <p className="fase1-section-sub">
                Código {active.codigo} · {active.semanaInicio} →{' '}
                {active.semanaFin}
              </p>
            </div>
          ) : (
            <p className="fase1-section-sub">Sin briefing persistido aún.</p>
          )}
        </section>
      </div>

      <section className="carbon-section" style={{ marginTop: 16 }}>
        <div className="fase1-section-head">
          <div>
            <h2>Radar de señales</h2>
            {(live?.resumen || active?.resumen) && (
              <p className="fase1-section-sub" style={{ whiteSpace: 'pre-wrap' }}>
                {active?.resumen || live?.resumen}
              </p>
            )}
          </div>
          <div className="fase1-filters">
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="carbon-alerts">
          {filteredSignals.map((s) => (
            <article
              key={s.id}
              className={`carbon-alert ${ALERT_CLASS[s.level] ?? 'alert-warn'}`}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span className={LEVEL_PILL[s.level]}>{s.level}</span>
                <span className="fase1-pill fase1-pill--muted">
                  {CATEGORY_LABEL[s.category]}
                </span>
              </div>
              <strong>{s.title}</strong>
              <p>{s.text}</p>
              {s.href && (
                <Link to={s.href} className="fase1-inline-link">
                  Ir al módulo →
                </Link>
              )}
            </article>
          ))}
          {!filteredSignals.length && (
            <article className="carbon-alert alert-ok">
              <strong>Sin señales en este filtro</strong>
              <p>El portafolio ambiental opera estable en esta ventana.</p>
            </article>
          )}
        </div>
      </section>

      {active?.borradorMd && (
        <section className="carbon-section" style={{ marginTop: 16 }}>
          <div className="fase1-section-head">
            <h2>Borrador ejecutivo</h2>
          </div>
          <MarkdownBrief markdown={active.borradorMd} />
        </section>
      )}

      {briefings.length > 1 && (
        <section className="carbon-section" style={{ marginTop: 16 }}>
          <div className="fase1-section-head">
            <h2>Histórico</h2>
          </div>
          <div className="fase1-table-wrap">
            <table className="fase1-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Semana</th>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Críticos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {briefings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.codigo}</td>
                    <td>
                      {b.semanaInicio} → {b.semanaFin}
                    </td>
                    <td>{b.titulo}</td>
                    <td>{b.estado}</td>
                    <td>{formatNum(b.kpis.criticos)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary-link"
                        onClick={() => {
                          setActive(b)
                          setForm(formFromRecord(b))
                        }}
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
