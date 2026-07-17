import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Pencil,
  Plus,
  Target,
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
  META_CATEGORIAS,
  META_ESTADOS,
  META_PERIODOS,
  META_SENTIDOS,
  META_SITIOS,
  META_UNIDADES,
  emptyMetaForm,
  formFromRecord,
  formatNum,
  nextCodigo,
  type MetaForm,
  type MetaRecord,
} from '../data/metas'
import { buildMetasReport, type MetasReport } from '../data/metasReport'
import { deleteMeta, loadMetas, seedMetasIfEmpty, upsertMeta } from '../lib/metasApi'
import { downloadCsv, stampFilename } from '../lib/exportDownload'
import { runExportPack } from '../lib/exportPacks'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const RISK_BADGE: Record<string, string> = {
  cumplida: 'fase1-pill fase1-pill--ok',
  ok: 'fase1-pill fase1-pill--ok',
  atencion: 'fase1-pill fase1-pill--warn',
  critico: 'fase1-pill fase1-pill--danger',
  'sin-dato': 'fase1-pill fase1-pill--muted',
}

const RISK_LABEL: Record<string, string> = {
  cumplida: 'Cumplida',
  ok: 'En curso',
  atencion: 'Atención',
  critico: 'Crítica',
  'sin-dato': 'Sin dato',
}

const COLORS = ['#047935', '#c45c26', '#3b82f6', '#94a3b8', '#5ab64b', '#8b7355']
const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}
const FILTER_ALL = 'all'

export function MetasPage() {
  const [records, setRecords] = useState<MetaRecord[]>([])
  const [report, setReport] = useState<MetasReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [form, setForm] = useState<MetaForm>(() => emptyMetaForm())
  const [showForm, setShowForm] = useState(false)
  const [filterUnidad, setFilterUnidad] = useState(FILTER_ALL)
  const [filterCat, setFilterCat] = useState(FILTER_ALL)
  const [filterRisk, setFilterRisk] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const seeded = await seedMetasIfEmpty()
      const data = await loadMetas()
      setRecords(data)
      setReport(buildMetasReport(data))
      if (seeded > 0) setOkMsg(`Se cargaron ${seeded} metas de ejemplo`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar metas')
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
      if (filterCat !== FILTER_ALL && r.categoria !== filterCat) return false
      if (filterRisk !== FILTER_ALL && r.risk !== filterRisk) return false
      return true
    })
  }, [report, filterUnidad, filterCat, filterRisk])

  function openNew() {
    setForm(
      emptyMetaForm({
        codigo: nextCodigo(records.map((r) => r.codigo).filter(Boolean)),
      }),
    )
    setShowForm(true)
  }

  function openEdit(row: MetaRecord) {
    setForm(formFromRecord(row))
    setShowForm(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await upsertMeta(form)
      setOkMsg(form.id ? 'Meta actualizada' : 'Meta creada')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta meta?')) return
    try {
      await deleteMeta(id)
      setOkMsg('Meta eliminada')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  function exportCsvLocal() {
    if (!report) return
    downloadCsv(
      stampFilename('metas_filtrado', 'csv'),
      [
        'Código',
        'Indicador',
        'Categoría',
        'Unidad',
        'Sitio',
        'Meta',
        'Actual',
        'Avance %',
        'Estado',
        'Riesgo',
        'Responsable',
      ],
      filtered.map((r) => [
        r.codigo,
        r.indicador,
        r.categoria,
        r.unidadNegocio,
        r.sitio,
        r.metaValor,
        r.valorActual,
        r.progress,
        r.estadoDerivado,
        r.risk,
        r.responsable,
      ]),
    )
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando metas…</p>
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
    <div className="carbon-page fase1-page metas-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Target size={14} />
            Fase 2 · Gestión por resultados
          </p>
          <h1>Metas y KPIs ambientales</h1>
          <p>
            Portafolio de indicadores con umbrales de atención ·{' '}
            {formatNum(report.meta.total)} meta(s)
            {report.meta.avgProgress != null
              ? ` · avance prom. ${formatNum(report.meta.avgProgress, 1)}%`
              : ''}
          </p>
        </div>
        <div className="hc-header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nueva meta
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void runExportPack('metas', 'pdf')}
          >
            <Download size={16} /> PDF
          </button>
          <Link to="/umbrales" className="btn-secondary-link">
            Umbrales →
          </Link>
          <Link to="/exportes" className="btn-secondary-link">
            Exportes →
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
          <h2>Por categoría</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={report.byCategoria}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {report.byCategoria.map((_, i) => (
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
                <Bar dataKey="value" name="Metas" fill="#047935" radius={[4, 4, 0, 0]} />
                <Bar dataKey="enRiesgo" name="En riesgo" fill="#c45c26" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="carbon-section fase1-table-section">
        <div className="fase1-section-head">
          <div>
            <h2>Portafolio</h2>
            <p className="fase1-section-sub">
              {filtered.length} de {report.detailRows.length} meta(s)
            </p>
          </div>
          <div className="fase1-filters">
            <select
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
              aria-label="Filtrar unidad"
            >
              <option value={FILTER_ALL}>Todas las unidades</option>
              {META_UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              aria-label="Filtrar categoría"
            >
              <option value={FILTER_ALL}>Todas las categorías</option>
              {META_CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              aria-label="Filtrar riesgo"
            >
              <option value={FILTER_ALL}>Todo riesgo</option>
              {Object.entries(RISK_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={openNew}>
              <Plus size={14} /> Nueva
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
                <th>Código</th>
                <th>Indicador</th>
                <th>Sitio</th>
                <th>Meta / Actual</th>
                <th>Avance</th>
                <th>Estado</th>
                <th className="fase1-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>Sin metas con los filtros actuales.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="fase1-td-code">
                      <code>{r.codigo || '—'}</code>
                    </td>
                    <td className="fase1-td-main">
                      <strong>{r.indicador}</strong>
                      <span className="fase1-meta">
                        {r.categoria} · {r.unidadNegocio} · {r.periodoAnio}
                      </span>
                    </td>
                    <td className="fase1-td-loc">
                      <span>{r.sitio || '—'}</span>
                      <span className="fase1-meta">{r.responsable || 'Sin resp.'}</span>
                    </td>
                    <td>
                      {formatNum(r.metaValor, 2)} {r.unidadMedida}
                      <span className="fase1-meta">
                        actual {r.valorActual == null ? '—' : formatNum(r.valorActual, 2)}
                      </span>
                    </td>
                    <td>
                      <span className={RISK_BADGE[r.risk]}>
                        {r.progress == null ? '—' : `${formatNum(r.progress, 1)}%`}
                      </span>
                    </td>
                    <td>
                      <span className={RISK_BADGE[r.risk]}>
                        {RISK_LABEL[r.risk] ?? r.estadoDerivado}
                      </span>
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
            aria-labelledby="metas-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fase1-modal-head">
              <h2 id="metas-modal-title">
                {form.id ? 'Editar meta' : 'Nueva meta'}
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
                Categoría
                <select
                  value={form.categoria}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value })
                  }
                >
                  {META_CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fase1-span-2">
                Indicador *
                <input
                  required
                  value={form.indicador}
                  onChange={(e) =>
                    setForm({ ...form, indicador: e.target.value })
                  }
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
                  {META_UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sitio
                <input
                  list="metas-sitios"
                  value={form.sitio}
                  onChange={(e) => setForm({ ...form, sitio: e.target.value })}
                />
                <datalist id="metas-sitios">
                  {META_SITIOS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label>
                Meta numérica *
                <input
                  required
                  type="number"
                  step="any"
                  value={form.metaValor}
                  onChange={(e) =>
                    setForm({ ...form, metaValor: e.target.value })
                  }
                />
              </label>
              <label>
                Valor actual
                <input
                  type="number"
                  step="any"
                  value={form.valorActual}
                  onChange={(e) =>
                    setForm({ ...form, valorActual: e.target.value })
                  }
                />
              </label>
              <label>
                Unidad de medida
                <input
                  value={form.unidadMedida}
                  onChange={(e) =>
                    setForm({ ...form, unidadMedida: e.target.value })
                  }
                />
              </label>
              <label>
                Sentido
                <select
                  value={form.sentido}
                  onChange={(e) => setForm({ ...form, sentido: e.target.value })}
                >
                  {META_SENTIDOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Año
                <input
                  type="number"
                  value={form.periodoAnio}
                  onChange={(e) =>
                    setForm({ ...form, periodoAnio: e.target.value })
                  }
                />
              </label>
              <label>
                Periodo
                <select
                  value={form.periodoTipo}
                  onChange={(e) =>
                    setForm({ ...form, periodoTipo: e.target.value })
                  }
                >
                  {META_PERIODOS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
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
                Fin
                <input
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) =>
                    setForm({ ...form, fechaFin: e.target.value })
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
                Estado
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {META_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Umbral atención %
                <input
                  type="number"
                  value={form.umbralAtencionPct}
                  onChange={(e) =>
                    setForm({ ...form, umbralAtencionPct: e.target.value })
                  }
                />
              </label>
              <label>
                Umbral crítico %
                <input
                  type="number"
                  value={form.umbralCriticoPct}
                  onChange={(e) =>
                    setForm({ ...form, umbralCriticoPct: e.target.value })
                  }
                />
              </label>
              <label>
                Fuente de dato
                <input
                  value={form.fuenteDato}
                  onChange={(e) =>
                    setForm({ ...form, fuenteDato: e.target.value })
                  }
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
