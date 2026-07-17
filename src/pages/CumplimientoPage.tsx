import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
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
import {
  CUMPLIMIENTO_CRITICIDADES,
  CUMPLIMIENTO_ESTADOS,
  CUMPLIMIENTO_SITIOS,
  CUMPLIMIENTO_TIPOS,
  CUMPLIMIENTO_UNIDADES,
  emptyCumplimientoForm,
  formFromRecord,
  formatIsoDate,
  formatNum,
  nextCodigo,
  type CumplimientoForm,
  type CumplimientoRecord,
} from '../data/cumplimiento'
import {
  buildCumplimientoReport,
  type CumplimientoReport,
} from '../data/cumplimientoReport'
import {
  deleteCumplimiento,
  loadCumplimiento,
  syncLicenciasToCumplimiento,
  syncTramitesToCumplimiento,
  upsertCumplimiento,
} from '../lib/cumplimientoApi'
import { downloadCsv, stampFilename } from '../lib/exportDownload'
import { runExportPack } from '../lib/exportPacks'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const RISK_BADGE: Record<string, string> = {
  vencido: 'fase1-pill fase1-pill--danger',
  critico: 'fase1-pill fase1-pill--danger',
  atencion: 'fase1-pill fase1-pill--warn',
  ok: 'fase1-pill fase1-pill--ok',
  'sin-fecha': 'fase1-pill fase1-pill--muted',
}

const RISK_LABEL: Record<string, string> = {
  vencido: 'Vencido',
  critico: 'Crítico',
  atencion: 'Atención',
  ok: 'OK',
  'sin-fecha': 'Sin fecha',
}

const ESTADO_PILL: Record<string, string> = {
  Vigente: 'fase1-pill fase1-pill--ok',
  'Por vencer': 'fase1-pill fase1-pill--warn',
  Vencido: 'fase1-pill fase1-pill--danger',
  'En trámite': 'fase1-pill fase1-pill--info',
  Cumplido: 'fase1-pill fase1-pill--ok',
  Suspendido: 'fase1-pill fase1-pill--muted',
}

const COLORS = ['#047935', '#c45c26', '#3b82f6', '#94a3b8', '#5ab64b', '#8b7355']

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const FILTER_ALL = 'all'

export function CumplimientoPage() {
  const [records, setRecords] = useState<CumplimientoRecord[]>([])
  const [report, setReport] = useState<CumplimientoReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [form, setForm] = useState<CumplimientoForm>(() => emptyCumplimientoForm())
  const [showForm, setShowForm] = useState(false)

  const [filterUnidad, setFilterUnidad] = useState(FILTER_ALL)
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)
  const [filterRisk, setFilterRisk] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const data = await loadCumplimiento()
      setRecords(data)
      setReport(buildCumplimientoReport(data))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar cumplimiento',
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

  useEffect(() => {
    if (!showForm) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setShowForm(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [showForm])

  const filtered = useMemo(() => {
    if (!report) return []
    return report.detailRows.filter((r) => {
      if (filterUnidad !== FILTER_ALL && r.unidadNegocio !== filterUnidad)
        return false
      if (filterEstado !== FILTER_ALL && r.estadoDerivado !== filterEstado)
        return false
      if (filterRisk !== FILTER_ALL && r.risk !== filterRisk) return false
      return true
    })
  }, [report, filterUnidad, filterEstado, filterRisk])

  function openNew() {
    const code = nextCodigo(
      'OBL',
      records.map((r) => r.codigo).filter(Boolean),
    )
    setForm(emptyCumplimientoForm({ codigo: code }))
    setShowForm(true)
  }

  function openEdit(row: CumplimientoRecord) {
    setForm(formFromRecord(row))
    setShowForm(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await upsertCumplimiento(form)
      setOkMsg(form.id ? 'Obligación actualizada' : 'Obligación creada')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta obligación?')) return
    try {
      await deleteCumplimiento(id)
      setOkMsg('Obligación eliminada')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    try {
      const [nLic, nTram] = await Promise.all([
        syncLicenciasToCumplimiento(),
        syncTramitesToCumplimiento(),
      ])
      setOkMsg(
        `Sincronización: ${nLic} licencia(s) y ${nTram} trámite(s) nuevas`,
      )
      await reload()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo sincronizar orígenes',
      )
    } finally {
      setSyncing(false)
    }
  }

  function exportCsvLocal() {
    if (!report) return
    downloadCsv(
      stampFilename('cumplimiento_filtrado', 'csv'),
      [
        'Código',
        'Unidad',
        'Sitio',
        'Tipo',
        'Título',
        'Estado',
        'Vencimiento',
        'Días',
        'Riesgo',
        'Responsable',
      ],
      filtered.map((r) => [
        r.codigo,
        r.unidadNegocio,
        r.sitio,
        r.tipoObligacion,
        r.titulo,
        r.estadoDerivado,
        r.fechaVencimiento,
        r.days,
        r.risk,
        r.responsable,
      ]),
    )
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando Compliance Hub…</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
        </div>
      </div>
    )
  }

  return (
    <div className="carbon-page fase1-page cumplimiento-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Scale size={14} />
            Fase 1 · Compliance Hub
          </p>
          <h1>Cumplimiento legal</h1>
          <p>
            Obligaciones, vencimientos y calendario regulatorio transversal
            Agroprogreso + Alicón · {formatNum(report.meta.total)} registro(s)
          </p>
        </div>
        <div className="hc-header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nueva obligación
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void handleSync()}
            disabled={syncing}
          >
            {syncing ? <Loader2 className="hc-spin" size={16} /> : <RefreshCw size={16} />}
            Sync licencias / trámites
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void runExportPack('cumplimiento', 'pdf')}
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

      <div className="carbon-kpi-grid">
        {report.kpis.map((k) => (
          <div key={k.id} className={`carbon-kpi ${k.tone === 'warn' ? 'warn' : k.tone === 'ok' ? 'lime' : k.tone === 'dark' ? 'dark' : ''}`}>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
            <small>{k.hint}</small>
          </div>
        ))}
      </div>

      {report.insights.length > 0 && (
        <section className="carbon-section">
          <h2>Alertas</h2>
          <div className="carbon-alerts">
            {report.insights.map((ins) => (
              <article key={ins.id} className={`carbon-alert ${ALERT_CLASS[ins.level]}`}>
                <strong>{ins.title}</strong>
                <p>{ins.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="carbon-charts-grid">
        <section className="carbon-section">
          <h2>Por estado derivado</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={report.byEstado}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {report.byEstado.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="carbon-section">
          <h2>Por unidad</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={report.byUnidad}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="value" name="Total" fill="#047935" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vencidos" name="Vencidos" fill="#c45c26" radius={[4, 4, 0, 0]} />
                <Bar dataKey="porVencer" name="Por vencer" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="carbon-section">
        <div className="fase1-section-head">
          <h2>Calendario de vencimientos (120 días)</h2>
        </div>
        {report.calendar.length === 0 ? (
          <p className="fase1-empty">Sin vencimientos en la ventana.</p>
        ) : (
          <div className="fase1-calendar">
            {report.calendar.map((c) => (
              <div key={c.id} className={`fase1-cal-item risk-${c.risk}`}>
                <div>
                  <strong>{c.titulo}</strong>
                  <span>{c.sitio || 'Sin sitio'}</span>
                </div>
                <div className="fase1-cal-meta">
                  <span>{formatIsoDate(c.fecha)}</span>
                  <span className={RISK_BADGE[c.risk] || ''}>
                    {c.days < 0 ? `${Math.abs(c.days)}d vencido` : `${c.days}d`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="fase1-modal-backdrop"
          role="presentation"
          onClick={() => setShowForm(false)}
        >
          <div
            className="fase1-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cumpl-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fase1-modal-head">
              <h2 id="cumpl-modal-title">
                {form.id ? 'Editar obligación' : 'Nueva obligación'}
              </h2>
              <button
                type="button"
                className="fase1-modal-close"
                aria-label="Cerrar"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>
            <form className="fase1-form" onSubmit={handleSave}>
              <label>
                Código
                <input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                />
              </label>
              <label>
                Título *
                <input
                  required
                  autoFocus
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </label>
              <label>
                Unidad
                <select
                  value={form.unidadNegocio}
                  onChange={(e) =>
                    setForm({ ...form, unidadNegocio: e.target.value })
                  }
                >
                  {CUMPLIMIENTO_UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sitio
                <input
                  list="cumpl-sitios"
                  value={form.sitio}
                  onChange={(e) => setForm({ ...form, sitio: e.target.value })}
                />
                <datalist id="cumpl-sitios">
                  {CUMPLIMIENTO_SITIOS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label>
                Tipo
                <select
                  value={form.tipoObligacion}
                  onChange={(e) =>
                    setForm({ ...form, tipoObligacion: e.target.value })
                  }
                >
                  {CUMPLIMIENTO_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estado
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {CUMPLIMIENTO_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Criticidad
                <select
                  value={form.criticidad}
                  onChange={(e) =>
                    setForm({ ...form, criticidad: e.target.value })
                  }
                >
                  {CUMPLIMIENTO_CRITICIDADES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Responsable
                <input
                  value={form.responsable}
                  onChange={(e) =>
                    setForm({ ...form, responsable: e.target.value })
                  }
                />
              </label>
              <label>
                Autoridad
                <input
                  value={form.autoridad}
                  onChange={(e) =>
                    setForm({ ...form, autoridad: e.target.value })
                  }
                />
              </label>
              <label>
                Expediente
                <input
                  value={form.expediente}
                  onChange={(e) =>
                    setForm({ ...form, expediente: e.target.value })
                  }
                />
              </label>
              <label>
                Instrumento
                <input
                  value={form.instrumento}
                  onChange={(e) =>
                    setForm({ ...form, instrumento: e.target.value })
                  }
                />
              </label>
              <label>
                Inicio
                <input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) =>
                    setForm({ ...form, fechaInicio: e.target.value })
                  }
                />
              </label>
              <label>
                Vencimiento
                <input
                  type="date"
                  value={form.fechaVencimiento}
                  onChange={(e) =>
                    setForm({ ...form, fechaVencimiento: e.target.value })
                  }
                />
              </label>
              <label>
                Alerta (días)
                <input
                  type="number"
                  min={1}
                  value={form.alertaDias}
                  onChange={(e) =>
                    setForm({ ...form, alertaDias: e.target.value })
                  }
                />
              </label>
              <label>
                URL evidencia
                <input
                  value={form.evidenciaUrl}
                  onChange={(e) =>
                    setForm({ ...form, evidenciaUrl: e.target.value })
                  }
                />
              </label>
              <label className="fase1-span-2">
                Descripción
                <textarea
                  rows={2}
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                />
              </label>
              <label className="fase1-span-2">
                Notas
                <textarea
                  rows={2}
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </label>
              <div className="fase1-form-actions fase1-span-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="hc-spin" size={16} /> : null}
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="carbon-section fase1-table-section">
        <div className="fase1-section-head">
          <div>
            <h2>Portafolio de obligaciones</h2>
            <p className="fase1-section-sub">
              {formatNum(filtered.length)} de {formatNum(report.meta.total)}{' '}
              registro(s)
            </p>
          </div>
          <div className="fase1-filters">
            <select
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
              aria-label="Filtrar unidad"
            >
              <option value={FILTER_ALL}>Todas las unidades</option>
              {CUMPLIMIENTO_UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              aria-label="Filtrar estado"
            >
              <option value={FILTER_ALL}>Todos los estados</option>
              {CUMPLIMIENTO_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              aria-label="Filtrar riesgo"
            >
              <option value={FILTER_ALL}>Todo riesgo</option>
              <option value="vencido">Vencido</option>
              <option value="critico">Crítico (≤30d)</option>
              <option value="atencion">Atención</option>
              <option value="ok">OK</option>
              <option value="sin-fecha">Sin fecha</option>
            </select>
            <button
              type="button"
              className="btn-secondary-link"
              onClick={exportCsvLocal}
            >
              <Download size={14} /> CSV
            </button>
            <button type="button" className="btn-primary" onClick={openNew}>
              <Plus size={14} /> Nueva obligación
            </button>
          </div>
        </div>

        <div className="carbon-table-wrap fase1-table-wrap">
          <table className="carbon-table fase1-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Obligación</th>
                <th>Ubicación</th>
                <th>Tipo</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Riesgo</th>
                <th className="fase1-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`fase1-row risk-${r.risk}`}>
                  <td className="fase1-td-code">
                    <code>{r.codigo || '—'}</code>
                  </td>
                  <td className="fase1-td-main">
                    <strong>{r.titulo}</strong>
                    {r.responsable ? (
                      <span className="fase1-meta">Resp. {r.responsable}</span>
                    ) : null}
                  </td>
                  <td className="fase1-td-loc">
                    <span>{r.unidadNegocio}</span>
                    <span className="fase1-meta">{r.sitio || '—'}</span>
                  </td>
                  <td>
                    <span className="fase1-chip">{r.tipoObligacion}</span>
                  </td>
                  <td className="fase1-td-date">
                    <span>{formatIsoDate(r.fechaVencimiento)}</span>
                    {r.days != null ? (
                      <span
                        className={`fase1-meta ${r.days < 0 ? 'is-late' : ''}`}
                      >
                        {r.days < 0
                          ? `${Math.abs(r.days)}d vencido`
                          : `${r.days}d restantes`}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className={
                        ESTADO_PILL[r.estadoDerivado] ||
                        'fase1-pill fase1-pill--muted'
                      }
                    >
                      {r.estadoDerivado}
                    </span>
                  </td>
                  <td>
                    <span className={RISK_BADGE[r.risk] || 'fase1-pill'}>
                      {RISK_LABEL[r.risk] || r.risk}
                    </span>
                  </td>
                  <td className="fase1-row-actions">
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => void handleDelete(r.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="fase1-empty">
                    Sin obligaciones con estos filtros. Use{' '}
                    <button
                      type="button"
                      className="fase1-inline-link"
                      onClick={openNew}
                    >
                      Nueva obligación
                    </button>{' '}
                    o sincronice licencias/trámites.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
