import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
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
  EXP_ESTADOS,
  EXP_MODULOS,
  EXP_SITIOS,
  EXP_TEMAS,
  EXP_TIPOS,
  EXP_UNIDADES,
  emptyExpedienteForm,
  formFromRecord,
  formatNum,
  nextCodigo,
  type ExpedienteForm,
  type ExpedienteRecord,
} from '../data/expedientes'
import {
  buildExpedientesReport,
  formatIsoDate,
  type ExpedientesReport,
} from '../data/expedientesReport'
import {
  deleteExpediente,
  loadExpedientes,
  seedExpedientesIfEmpty,
  upsertExpediente,
} from '../lib/expedientesApi'
import { downloadCsv, stampFilename } from '../lib/exportDownload'
import { runExportPack } from '../lib/exportPacks'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const ESTADO_PILL: Record<string, string> = {
  Vigente: 'fase1-pill fase1-pill--ok',
  Borrador: 'fase1-pill fase1-pill--warn',
  Obsoleto: 'fase1-pill fase1-pill--muted',
  'En revisión': 'fase1-pill fase1-pill--info',
}

const COLORS = ['#047935', '#c45c26', '#3b82f6', '#94a3b8', '#5ab64b', '#8b7355']

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}
const FILTER_ALL = 'all'

export function ExpedientesPage() {
  const [records, setRecords] = useState<ExpedienteRecord[]>([])
  const [report, setReport] = useState<ExpedientesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [form, setForm] = useState<ExpedienteForm>(() => emptyExpedienteForm())
  const [showForm, setShowForm] = useState(false)
  const [filterTema, setFilterTema] = useState(FILTER_ALL)
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const seeded = await seedExpedientesIfEmpty()
      const data = await loadExpedientes()
      setRecords(data)
      setReport(buildExpedientesReport(data))
      if (seeded > 0) setOkMsg(`Se cargaron ${seeded} expedientes de ejemplo`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar expedientes',
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
      if (filterTema !== FILTER_ALL && r.tema !== filterTema) return false
      if (filterEstado !== FILTER_ALL && r.estado !== filterEstado) return false
      return true
    })
  }, [report, filterTema, filterEstado])

  function openNew() {
    setForm(
      emptyExpedienteForm({
        codigo: nextCodigo(records.map((r) => r.codigo).filter(Boolean)),
      }),
    )
    setShowForm(true)
  }

  function openEdit(row: ExpedienteRecord) {
    setForm(formFromRecord(row))
    setShowForm(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await upsertExpediente(form)
      setOkMsg(form.id ? 'Expediente actualizado' : 'Expediente creado')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este expediente?')) return
    try {
      await deleteExpediente(id)
      setOkMsg('Expediente eliminado')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  function exportCsvLocal() {
    downloadCsv(
      stampFilename('expedientes_filtrado', 'csv'),
      [
        'Codigo',
        'Titulo',
        'Tema',
        'Sitio',
        'Tipo',
        'Estado',
        'Fecha',
        'Responsable',
        'Modulo ligado',
        'Archivo URL',
      ],
      filtered.map((r) => [
        r.codigo,
        r.titulo,
        r.tema,
        r.sitio,
        r.tipoDocumento,
        r.estado,
        r.fechaDocumento,
        r.responsable,
        r.moduloLigado,
        r.archivoUrl,
      ]),
    )
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando expedientes…</p>
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
    <div className="carbon-page fase1-page expedientes-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <FolderOpen size={14} />
            Fase 3 · Repositorio documental
          </p>
          <h1>Expedientes ambientales</h1>
          <p>
            Resoluciones, estudios, actas y monitores ·{' '}
            {formatNum(report.meta.total)} expediente(s) ·{' '}
            {formatNum(report.meta.vigentes)} vigente(s)
          </p>
        </div>
        <div className="hc-header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nuevo expediente
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void runExportPack('expedientes', 'pdf')}
          >
            <Download size={16} /> PDF
          </button>
          <Link to="/cumplimiento" className="btn-secondary-link">
            Cumplimiento →
          </Link>
          <Link to="/biblioteca" className="btn-secondary-link">
            Biblioteca →
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
          <div
            key={k.id}
            className={`carbon-kpi ${k.tone === 'warn' ? 'warn' : k.tone === 'ok' ? 'lime' : k.tone === 'dark' ? 'dark' : ''}`}
          >
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
              <article
                key={ins.id}
                className={`carbon-alert ${ALERT_CLASS[ins.level]}`}
              >
                <strong>{ins.title}</strong>
                <p>{ins.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="carbon-charts-grid">
        <section className="carbon-section">
          <h2>Por tema</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={report.byTema}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {report.byTema.map((_, i) => (
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
          <h2>Por sitio</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={report.bySitio}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={70}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="value" name="Expedientes" fill="#047935" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="carbon-section fase1-table-section">
        <div className="fase1-section-head">
          <div>
            <h2>Repositorio</h2>
            <p className="fase1-section-sub">
              {filtered.length} de {report.detailRows.length} expediente(s)
            </p>
          </div>
          <div className="fase1-filters">
            <select
              value={filterTema}
              onChange={(e) => setFilterTema(e.target.value)}
              aria-label="Filtrar tema"
            >
              <option value={FILTER_ALL}>Todos los temas</option>
              {EXP_TEMAS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              aria-label="Filtrar estado"
            >
              <option value={FILTER_ALL}>Todos los estados</option>
              {EXP_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={openNew}>
              <Plus size={14} /> Nuevo
            </button>
            <button
              type="button"
              className="btn-secondary-link"
              onClick={exportCsvLocal}
            >
              CSV
            </button>
          </div>
        </div>
        <div className="fase1-table-wrap">
          <table className="carbon-table fase1-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Titulo</th>
                <th>Sitio / tema</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Archivo</th>
                <th className="fase1-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>Sin expedientes con los filtros actuales.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="fase1-td-code">
                      <code>{r.codigo || '—'}</code>
                    </td>
                    <td className="fase1-td-main">
                      <strong>{r.titulo}</strong>
                      <span className="fase1-meta">
                        v{r.version} · {formatIsoDate(r.fechaDocumento)}
                      </span>
                    </td>
                    <td className="fase1-td-loc">
                      <span>{r.sitio || '—'}</span>
                      <span className="fase1-meta">
                        {r.tema} · {r.unidadNegocio}
                      </span>
                    </td>
                    <td>{r.tipoDocumento}</td>
                    <td>
                      <span
                        className={
                          ESTADO_PILL[r.estado] ?? 'fase1-pill fase1-pill--muted'
                        }
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td>
                      {r.archivoUrl.trim() ? (
                        <a
                          href={r.archivoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon"
                          title={r.archivoNombre || 'Abrir archivo'}
                          aria-label="Abrir archivo"
                        >
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="fase1-row-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label="Editar"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label="Eliminar"
                        onClick={() => void handleDelete(r.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
            aria-labelledby="expedientes-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fase1-modal-head">
              <h2 id="expedientes-modal-title">
                {form.id ? 'Editar expediente' : 'Nuevo expediente'}
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
                Codigo
                <input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                />
              </label>
              <label>
                Estado
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {EXP_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fase1-span-2">
                Titulo *
                <input
                  required
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </label>
              <label>
                Unidad de negocio
                <select
                  value={form.unidadNegocio}
                  onChange={(e) =>
                    setForm({ ...form, unidadNegocio: e.target.value })
                  }
                >
                  {EXP_UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sitio
                <input
                  list="exp-sitios"
                  value={form.sitio}
                  onChange={(e) => setForm({ ...form, sitio: e.target.value })}
                />
                <datalist id="exp-sitios">
                  {EXP_SITIOS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label>
                Tema
                <select
                  value={form.tema}
                  onChange={(e) => setForm({ ...form, tema: e.target.value })}
                >
                  {EXP_TEMAS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo documento
                <select
                  value={form.tipoDocumento}
                  onChange={(e) =>
                    setForm({ ...form, tipoDocumento: e.target.value })
                  }
                >
                  {EXP_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Version
                <input
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </label>
              <label>
                Fecha documento
                <input
                  type="date"
                  value={form.fechaDocumento}
                  onChange={(e) =>
                    setForm({ ...form, fechaDocumento: e.target.value })
                  }
                />
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
                Modulo ligado
                <select
                  value={form.moduloLigado}
                  onChange={(e) =>
                    setForm({ ...form, moduloLigado: e.target.value })
                  }
                >
                  {EXP_MODULOS.map((m) => (
                    <option key={m || 'none'} value={m}>
                      {m || 'Ninguno'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ref. ligada
                <input
                  value={form.refLigada}
                  onChange={(e) =>
                    setForm({ ...form, refLigada: e.target.value })
                  }
                />
              </label>
              <label>
                Nombre archivo
                <input
                  value={form.archivoNombre}
                  onChange={(e) =>
                    setForm({ ...form, archivoNombre: e.target.value })
                  }
                />
              </label>
              <label className="fase1-span-2">
                URL archivo
                <input
                  value={form.archivoUrl}
                  onChange={(e) =>
                    setForm({ ...form, archivoUrl: e.target.value })
                  }
                />
              </label>
              <label className="fase1-span-2">
                Tags
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </label>
              <label className="fase1-span-2">
                Notas
                <textarea
                  rows={3}
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </label>
              <div className="fase1-form-actions fase1-span-2">
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
