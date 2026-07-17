import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Pencil,
  Plus,
  Recycle,
  Trash2,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  CIRC_CLASIFICACIONES,
  CIRC_ESTADOS,
  CIRC_RUTAS,
  CIRC_SEDES,
  CIRC_UNIDADES,
  emptyCircularidadForm,
  formFromRecord,
  formatNum,
  nextCodigo,
  type CircularidadForm,
  type CircularidadRecord,
} from '../data/circularidad'
import {
  buildCircularidadReport,
  type CircularidadReport,
} from '../data/circularidadReport'
import { loadAgroResiduos } from '../lib/agroResiduosApi'
import {
  deleteCircularidad,
  loadCircularidad,
  seedCircularidadIfEmpty,
  upsertCircularidad,
} from '../lib/circularidadApi'
import { downloadCsv, stampFilename } from '../lib/exportDownload'
import { runExportPack } from '../lib/exportPacks'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const VALOR_PILL = {
  true: 'fase1-pill fase1-pill--ok',
  false: 'fase1-pill fase1-pill--muted',
} as const

const RUTA_COLORS = ['#047935', '#5ab64b', '#3b82f6', '#c45c26', '#94a3b8', '#8b7355']

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}
const FILTER_ALL = 'all'

export function CircularidadPage() {
  const [records, setRecords] = useState<CircularidadRecord[]>([])
  const [report, setReport] = useState<CircularidadReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [form, setForm] = useState<CircularidadForm>(() => emptyCircularidadForm())
  const [showForm, setShowForm] = useState(false)
  const [filterSede, setFilterSede] = useState(FILTER_ALL)
  const [filterRuta, setFilterRuta] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const seeded = await seedCircularidadIfEmpty()
      const flujos = await loadCircularidad()
      const agroResiduos = await loadAgroResiduos().catch(() => [])
      setRecords(flujos)
      setReport(buildCircularidadReport(flujos, agroResiduos))
      if (seeded > 0) setOkMsg(`Se cargaron ${seeded} flujos de ejemplo`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar circularidad',
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
      if (filterSede !== FILTER_ALL && r.sede !== filterSede) return false
      if (filterRuta !== FILTER_ALL && r.ruta !== filterRuta) return false
      return true
    })
  }, [report, filterSede, filterRuta])

  function openNew() {
    setForm(
      emptyCircularidadForm({
        codigo: nextCodigo(records.map((r) => r.codigo).filter(Boolean)),
      }),
    )
    setShowForm(true)
  }

  function openEdit(row: CircularidadRecord) {
    setForm(formFromRecord(row))
    setShowForm(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await upsertCircularidad(form)
      setOkMsg(form.id ? 'Flujo actualizado' : 'Flujo creado')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este flujo?')) return
    try {
      await deleteCircularidad(id)
      setOkMsg('Flujo eliminado')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  function exportCsvLocal() {
    downloadCsv(
      stampFilename('circularidad_filtrado', 'csv'),
      [
        'Codigo',
        'Sede',
        'Tipo residuo',
        'Ruta',
        'Cantidad lbs',
        'Valorizado',
        'Estado',
        'Gestor',
        'Manifiesto',
        'Fecha',
      ],
      filtered.map((r) => [
        r.codigo,
        r.sede,
        r.tipoResiduo,
        r.ruta,
        r.cantidadLbs,
        r.valorizado ? 'Si' : 'No',
        r.estado,
        r.gestor,
        r.manifiesto,
        r.fecha,
      ]),
    )
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando circularidad…</p>
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
    <div className="carbon-page fase1-page circularidad-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Recycle size={14} />
            Fase 3 · Economía circular
          </p>
          <h1>Circularidad y valorización</h1>
          <p>
            Trazabilidad generador → gestor ·{' '}
            {formatNum(report.meta.totalFlujos)} flujo(s) ·{' '}
            {report.meta.tasaValorizacionPct == null
              ? '—'
              : `${formatNum(report.meta.tasaValorizacionPct, 1)}% valorizado`}
          </p>
        </div>
        <div className="hc-header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nuevo flujo
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void runExportPack('circularidad', 'pdf')}
          >
            <Download size={16} /> PDF
          </button>
          <Link
            to="/operaciones/agroprogreso/gestion-de-residuos"
            className="btn-secondary-link"
          >
            Residuos Agro →
          </Link>
          <Link to="/expedientes" className="btn-secondary-link">
            Expedientes →
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
          <h2>Por ruta de gestion</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.byRuta}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="value" name="lbs" radius={[4, 4, 0, 0]}>
                  {report.byRuta.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.valorizado
                          ? RUTA_COLORS[i % RUTA_COLORS.length]
                          : '#94a3b8'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="carbon-section">
          <h2>Por sede (lbs vs valorizadas)</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.bySede}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="lbs" name="Total lbs" fill="#047935" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="valorizadas"
                  name="Valorizadas"
                  fill="#5ab64b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="carbon-section fase1-table-section">
        <div className="fase1-section-head">
          <div>
            <h2>Flujos y manifiestos</h2>
            <p className="fase1-section-sub">
              {filtered.length} de {report.detailRows.length} flujo(s)
            </p>
          </div>
          <div className="fase1-filters">
            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
              aria-label="Filtrar sede"
            >
              <option value={FILTER_ALL}>Todas las sedes</option>
              {CIRC_SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterRuta}
              onChange={(e) => setFilterRuta(e.target.value)}
              aria-label="Filtrar ruta"
            >
              <option value={FILTER_ALL}>Todas las rutas</option>
              {CIRC_RUTAS.map((r) => (
                <option key={r} value={r}>
                  {r}
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
                <th>Sede / residuo</th>
                <th>Ruta</th>
                <th>Cantidad</th>
                <th>Valorizado</th>
                <th>Estado</th>
                <th className="fase1-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>Sin flujos con los filtros actuales.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="fase1-td-code">
                      <code>{r.codigo || '—'}</code>
                    </td>
                    <td className="fase1-td-main">
                      <strong>{r.tipoResiduo || '—'}</strong>
                      <span className="fase1-meta">
                        {r.sede} · {r.unidadNegocio}
                      </span>
                    </td>
                    <td>
                      {r.ruta}
                      <span className="fase1-meta">{r.gestor || 'Sin gestor'}</span>
                    </td>
                    <td>
                      {formatNum(r.cantidadLbs, 0)} lbs
                      <span className="fase1-meta">
                        {r.costoGtq != null ? `Q ${formatNum(r.costoGtq, 0)}` : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={VALOR_PILL[String(r.valorizado) as 'true' | 'false']}>
                        {r.valorizado ? 'Si' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className="fase1-pill fase1-pill--muted">{r.estado}</span>
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
            aria-labelledby="circularidad-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fase1-modal-head">
              <h2 id="circularidad-modal-title">
                {form.id ? 'Editar flujo' : 'Nuevo flujo'}
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
                Unidad de negocio
                <select
                  value={form.unidadNegocio}
                  onChange={(e) =>
                    setForm({ ...form, unidadNegocio: e.target.value })
                  }
                >
                  {CIRC_UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sede
                <input
                  list="circ-sedes"
                  value={form.sede}
                  onChange={(e) => setForm({ ...form, sede: e.target.value })}
                />
                <datalist id="circ-sedes">
                  {CIRC_SEDES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label>
                Tipo residuo
                <input
                  value={form.tipoResiduo}
                  onChange={(e) =>
                    setForm({ ...form, tipoResiduo: e.target.value })
                  }
                />
              </label>
              <label>
                Clasificacion
                <select
                  value={form.clasificacion}
                  onChange={(e) =>
                    setForm({ ...form, clasificacion: e.target.value })
                  }
                >
                  {CIRC_CLASIFICACIONES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ruta
                <select
                  value={form.ruta}
                  onChange={(e) => setForm({ ...form, ruta: e.target.value })}
                >
                  {CIRC_RUTAS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Gestor
                <input
                  value={form.gestor}
                  onChange={(e) => setForm({ ...form, gestor: e.target.value })}
                />
              </label>
              <label>
                Manifiesto
                <input
                  value={form.manifiesto}
                  onChange={(e) =>
                    setForm({ ...form, manifiesto: e.target.value })
                  }
                />
              </label>
              <label>
                Cantidad (lbs)
                <input
                  type="number"
                  step="any"
                  value={form.cantidadLbs}
                  onChange={(e) =>
                    setForm({ ...form, cantidadLbs: e.target.value })
                  }
                />
              </label>
              <label>
                Costo (GTQ)
                <input
                  type="number"
                  step="any"
                  value={form.costoGtq}
                  onChange={(e) => setForm({ ...form, costoGtq: e.target.value })}
                />
              </label>
              <label>
                Fecha
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </label>
              <label>
                Valorizado
                <select
                  value={form.valorizado ? '1' : '0'}
                  onChange={(e) =>
                    setForm({ ...form, valorizado: e.target.value === '1' })
                  }
                >
                  <option value="1">Si</option>
                  <option value="0">No</option>
                </select>
              </label>
              <label>
                Estado
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {CIRC_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fase1-span-2">
                URL evidencia
                <input
                  value={form.evidenciaUrl}
                  onChange={(e) =>
                    setForm({ ...form, evidenciaUrl: e.target.value })
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
