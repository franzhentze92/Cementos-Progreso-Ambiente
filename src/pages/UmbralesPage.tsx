import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Gauge,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import type { AgroMonitoreoRecord } from '../data/agroMonitoreos'
import {
  UMBRAL_CRITICIDADES,
  UMBRAL_OPERADORES,
  UMBRAL_UNIDADES,
  emptyUmbralForm,
  formFromRecord,
  formatNum,
  umbralLabel,
  type UmbralForm,
  type UmbralRecord,
} from '../data/umbrales'
import {
  buildUmbralesReport,
  evaluateMonitoreos,
  type UmbralesReport,
} from '../data/umbralesReport'
import { loadAgroMonitoreos } from '../lib/agroMonitoreosApi'
import {
  deleteUmbral,
  loadUmbrales,
  seedUmbralesIfEmpty,
  upsertUmbral,
} from '../lib/umbralesApi'
import { downloadCsv, stampFilename } from '../lib/exportDownload'
import { runExportPack } from '../lib/exportPacks'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const RESULT_BADGE: Record<string, string> = {
  cumple: 'fase1-pill fase1-pill--ok',
  excede: 'fase1-pill fase1-pill--danger',
  'sin-umbral': 'fase1-pill fase1-pill--muted',
  'sin-dato': 'fase1-pill fase1-pill--muted',
}

const RESULT_LABEL: Record<string, string> = {
  cumple: 'Cumple',
  excede: 'Excede',
  'sin-umbral': 'Sin umbral',
  'sin-dato': 'Sin dato',
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}
const FILTER_ALL = 'all'

export function UmbralesPage() {
  const [umbrales, setUmbrales] = useState<UmbralRecord[]>([])
  const [monitoreos, setMonitoreos] = useState<AgroMonitoreoRecord[]>([])
  const [report, setReport] = useState<UmbralesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [form, setForm] = useState<UmbralForm>(() => emptyUmbralForm())
  const [showForm, setShowForm] = useState(false)
  const [filterActivo, setFilterActivo] = useState(FILTER_ALL)
  const [filterResult, setFilterResult] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const seeded = await seedUmbralesIfEmpty()
      const [u, m] = await Promise.all([loadUmbrales(), loadAgroMonitoreos()])
      setUmbrales(u)
      setMonitoreos(m)
      setReport(buildUmbralesReport(u, m))
      if (seeded > 0) setOkMsg(`Se cargaron ${seeded} umbrales de ejemplo`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar umbrales')
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

  const filteredUmbrales = useMemo(() => {
    return umbrales.filter((u) => {
      if (filterActivo === 'activos' && !u.activo) return false
      if (filterActivo === 'inactivos' && u.activo) return false
      return true
    })
  }, [umbrales, filterActivo])

  const evaluations = useMemo(
    () => evaluateMonitoreos(monitoreos, umbrales),
    [monitoreos, umbrales],
  )

  const filteredEvals = useMemo(() => {
    return evaluations.filter((e) => {
      if (filterResult !== FILTER_ALL && e.resultado !== filterResult) return false
      return true
    })
  }, [evaluations, filterResult])

  function openNew() {
    setForm(emptyUmbralForm())
    setShowForm(true)
  }

  function openEdit(row: UmbralRecord) {
    setForm(formFromRecord(row))
    setShowForm(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await upsertUmbral(form)
      setOkMsg(form.id ? 'Umbral actualizado' : 'Umbral creado')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este umbral?')) return
    try {
      await deleteUmbral(id)
      setOkMsg('Umbral eliminado')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  function exportCsvLocal() {
    if (!report) return
    downloadCsv(
      stampFilename('umbrales_excedencias', 'csv'),
      [
        'Fecha',
        'Sede',
        'Punto',
        'Parámetro',
        'Resultado',
        'Umbral',
        'Criticidad',
      ],
      report.excedencias.map((r) => [
        r.fecha,
        r.sede,
        r.punto,
        r.parametro,
        r.resultado,
        r.umbral,
        r.criticidad,
      ]),
    )
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando umbrales…</p>
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
    <div className="carbon-page fase1-page umbrales-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Gauge size={14} />
            Fase 2 · Evaluación automática
          </p>
          <h1>Umbrales de monitoreo</h1>
          <p>
            Catálogo de límites + evaluación de monitoreos Agro ·{' '}
            {formatNum(report.meta.activos)} activos ·{' '}
            {formatNum(report.meta.excede)} excedencia(s)
          </p>
        </div>
        <div className="hc-header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nuevo umbral
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void runExportPack('umbrales', 'pdf')}
          >
            <Download size={16} /> PDF
          </button>
          <Link to="/metas" className="btn-secondary-link">
            Metas →
          </Link>
          <Link
            to="/operaciones/agroprogreso/monitoreo-ambiental"
            className="btn-secondary-link"
          >
            Monitoreos →
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
          <h2>Cumple vs excede por parámetro</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.byParametro.slice(0, 10)}>
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
                <Bar dataKey="cumple" name="Cumple" fill="#047935" radius={[4, 4, 0, 0]} />
                <Bar dataKey="excede" name="Excede" fill="#b91c1c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="carbon-section">
          <h2>Excedencias recientes</h2>
          <div className="fase1-calendar">
            {report.excedencias.length === 0 ? (
              <p className="fase1-section-sub">Sin excedencias detectadas.</p>
            ) : (
              report.excedencias.slice(0, 8).map((e, i) => (
                <div key={`${e.fecha}-${e.parametro}-${i}`} className="fase1-cal-item risk-critico">
                  <strong>
                    {e.parametro}: {formatNum(e.resultado, 3)}
                  </strong>
                  <span>
                    {e.sede} · {e.punto}
                  </span>
                  <span className="fase1-cal-meta">
                    {e.fecha} · límite {e.umbral} · {e.criticidad}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="carbon-section fase1-table-section">
        <div className="fase1-section-head">
          <div>
            <h2>Catálogo de umbrales</h2>
            <p className="fase1-section-sub">
              {filteredUmbrales.length} de {umbrales.length}
            </p>
          </div>
          <div className="fase1-filters">
            <select
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
              aria-label="Filtrar activos"
            >
              <option value={FILTER_ALL}>Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
            <button type="button" className="btn-primary" onClick={openNew}>
              <Plus size={14} /> Nuevo
            </button>
          </div>
        </div>
        <div className="fase1-table-wrap">
          <table className="carbon-table fase1-table">
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>Tipo agua</th>
                <th>Límite</th>
                <th>Criticidad</th>
                <th>Estado</th>
                <th className="fase1-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUmbrales.length === 0 ? (
                <tr>
                  <td colSpan={6}>Sin umbrales.</td>
                </tr>
              ) : (
                filteredUmbrales.map((u) => (
                  <tr key={u.id}>
                    <td className="fase1-td-main">
                      <strong>{u.parametro}</strong>
                      <span className="fase1-meta">
                        {u.unidadNegocio} · {u.autoridadRef || 'Sin ref.'}
                      </span>
                    </td>
                    <td>{u.tipoAgua || '—'}</td>
                    <td>{umbralLabel(u)}</td>
                    <td>
                      <span
                        className={
                          u.criticidad === 'Alta'
                            ? 'fase1-pill fase1-pill--danger'
                            : u.criticidad === 'Media'
                              ? 'fase1-pill fase1-pill--warn'
                              : 'fase1-pill fase1-pill--muted'
                        }
                      >
                        {u.criticidad}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          u.activo
                            ? 'fase1-pill fase1-pill--ok'
                            : 'fase1-pill fase1-pill--muted'
                        }
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="fase1-row-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label="Editar"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label="Eliminar"
                        onClick={() => void handleDelete(u.id)}
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

      <section className="carbon-section fase1-table-section">
        <div className="fase1-section-head">
          <div>
            <h2>Evaluación automática</h2>
            <p className="fase1-section-sub">
              {filteredEvals.length} de {evaluations.length} medición(es)
            </p>
          </div>
          <div className="fase1-filters">
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              aria-label="Filtrar resultado"
            >
              <option value={FILTER_ALL}>Todos</option>
              {Object.entries(RESULT_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary-link"
              onClick={exportCsvLocal}
            >
              CSV excedencias
            </button>
          </div>
        </div>
        <div className="fase1-table-wrap">
          <table className="carbon-table fase1-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Sede / punto</th>
                <th>Parámetro</th>
                <th>Resultado</th>
                <th>Umbral</th>
                <th>Eval.</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvals.length === 0 ? (
                <tr>
                  <td colSpan={6}>Sin mediciones con los filtros actuales.</td>
                </tr>
              ) : (
                filteredEvals.slice(0, 80).map((e) => (
                  <tr key={e.record.id}>
                    <td className="fase1-td-date">{e.record.fecha}</td>
                    <td className="fase1-td-loc">
                      <span>{e.record.plantaSede}</span>
                      <span className="fase1-meta">{e.record.puntoMuestreo}</span>
                    </td>
                    <td>
                      {e.record.parametro}
                      <span className="fase1-meta">{e.record.tipoAgua}</span>
                    </td>
                    <td>
                      {e.record.resultado == null
                        ? '—'
                        : `${formatNum(e.record.resultado, 3)} ${e.record.unidad}`}
                    </td>
                    <td>{e.umbral ? umbralLabel(e.umbral) : '—'}</td>
                    <td>
                      <span className={RESULT_BADGE[e.resultado]}>
                        {RESULT_LABEL[e.resultado]}
                      </span>
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
            aria-labelledby="umbrales-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fase1-modal-head">
              <h2 id="umbrales-modal-title">
                {form.id ? 'Editar umbral' : 'Nuevo umbral'}
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
                Parámetro *
                <input
                  required
                  value={form.parametro}
                  onChange={(e) =>
                    setForm({ ...form, parametro: e.target.value })
                  }
                />
              </label>
              <label>
                Tipo de agua
                <input
                  value={form.tipoAgua}
                  onChange={(e) =>
                    setForm({ ...form, tipoAgua: e.target.value })
                  }
                />
              </label>
              <label>
                Unidad medida
                <input
                  value={form.unidadMedida}
                  onChange={(e) =>
                    setForm({ ...form, unidadMedida: e.target.value })
                  }
                />
              </label>
              <label>
                Operador
                <select
                  value={form.operador}
                  onChange={(e) =>
                    setForm({ ...form, operador: e.target.value })
                  }
                >
                  {UMBRAL_OPERADORES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Límite mín.
                <input
                  type="number"
                  step="any"
                  value={form.limiteMin}
                  onChange={(e) =>
                    setForm({ ...form, limiteMin: e.target.value })
                  }
                />
              </label>
              <label>
                Límite máx.
                <input
                  type="number"
                  step="any"
                  value={form.limiteMax}
                  onChange={(e) =>
                    setForm({ ...form, limiteMax: e.target.value })
                  }
                />
              </label>
              <label>
                Unidad negocio
                <select
                  value={form.unidadNegocio}
                  onChange={(e) =>
                    setForm({ ...form, unidadNegocio: e.target.value })
                  }
                >
                  {UMBRAL_UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
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
                  {UMBRAL_CRITICIDADES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fase1-span-2">
                Autoridad / referencia
                <input
                  value={form.autoridadRef}
                  onChange={(e) =>
                    setForm({ ...form, autoridadRef: e.target.value })
                  }
                />
              </label>
              <label>
                Activo
                <select
                  value={form.activo ? '1' : '0'}
                  onChange={(e) =>
                    setForm({ ...form, activo: e.target.value === '1' })
                  }
                >
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
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
