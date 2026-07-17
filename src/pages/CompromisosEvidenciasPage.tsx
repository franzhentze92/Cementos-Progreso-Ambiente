import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Leaf,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { CompromisosSubnav } from '../components/CompromisosSubnav'
import { useAuth } from '../context/AuthContext'
import {
  COMPROMISO_AREAS,
  COMPROMISO_SITIOS,
  EVIDENCIA_ESTADOS,
  EVIDENCIA_TIPOS,
  emptyEvidenciaForm,
  formFromEvidencia,
  formatIsoDate,
  formatNum,
  type CompromisoRecord,
  type EvidenciaForm,
  type EvidenciaRecord,
} from '../data/compromisosAmbientales'
import {
  deleteEvidencia,
  loadCompromisos,
  loadEvidencias,
  upsertEvidencia,
} from '../lib/compromisosAmbientalesApi'

const FILTER_ALL = 'all'

const ESTADO_PILL: Record<string, string> = {
  'Pendiente de revisión': 'fase1-pill fase1-pill--warn',
  Aprobada: 'fase1-pill fase1-pill--ok',
  Rechazada: 'fase1-pill fase1-pill--danger',
  'Requiere corrección': 'fase1-pill fase1-pill--danger',
  Vencida: 'fase1-pill fase1-pill--muted',
  Sustituida: 'fase1-pill fase1-pill--muted',
}

export function CompromisosEvidenciasPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const preselect = searchParams.get('c') ?? ''

  const [compromisos, setCompromisos] = useState<CompromisoRecord[]>([])
  const [records, setRecords] = useState<EvidenciaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EvidenciaForm>(() => emptyEvidenciaForm())

  const [filterCompromiso, setFilterCompromiso] = useState(
    preselect || FILTER_ALL,
  )
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)
  const [filterTipo, setFilterTipo] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [comps, evis] = await Promise.all([
        loadCompromisos(),
        loadEvidencias(),
      ])
      setCompromisos(comps)
      setRecords(evis)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar evidencias',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (preselect) setFilterCompromiso(preselect)
  }, [preselect])

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

  const byId = useMemo(() => {
    const m = new Map(compromisos.map((c) => [c.id, c]))
    return m
  }, [compromisos])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterCompromiso !== FILTER_ALL && r.compromisoId !== filterCompromiso)
        return false
      if (filterEstado !== FILTER_ALL && r.estadoRevision !== filterEstado)
        return false
      if (filterTipo !== FILTER_ALL && r.tipoEvidencia !== filterTipo)
        return false
      return true
    })
  }, [records, filterCompromiso, filterEstado, filterTipo])

  const kpis = useMemo(() => {
    const pendiente = records.filter((r) =>
      /pendiente/i.test(r.estadoRevision),
    ).length
    const aprobadas = records.filter((r) => /aprobad/i.test(r.estadoRevision))
      .length
    const rechazadas = records.filter((r) =>
      /rechaz|correcci/i.test(r.estadoRevision),
    ).length
    return {
      total: records.length,
      pendiente,
      aprobadas,
      rechazadas,
    }
  }, [records])

  function openNew() {
    const autor = user?.name ?? user?.username ?? ''
    setForm(
      emptyEvidenciaForm({
        compromisoId:
          filterCompromiso !== FILTER_ALL ? filterCompromiso : preselect,
        cargadoPor: autor,
        sitio:
          filterCompromiso !== FILTER_ALL
            ? (byId.get(filterCompromiso)?.sitio ?? '')
            : '',
      }),
    )
    setShowForm(true)
  }

  function openEdit(row: EvidenciaRecord) {
    setForm(formFromEvidencia(row))
    setShowForm(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await upsertEvidencia(form, {
        autor: user?.name ?? user?.username ?? form.cargadoPor,
      })
      setOkMsg(form.id ? 'Evidencia actualizada' : 'Evidencia registrada')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta evidencia?')) return
    try {
      await deleteEvidencia(id)
      setOkMsg('Evidencia eliminada')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando evidencias…</p>
      </div>
    )
  }

  return (
    <div className="carbon-page fase1-page compromisos-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Leaf size={14} />
            Ambiente · Cementos Progreso
          </p>
          <h1>Evidencias</h1>
          <p>
            Pruebas verificables de ejecución · no basta marcar cumplido sin
            documento
          </p>
        </div>
        <div className="hc-header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nueva evidencia
          </button>
        </div>
      </div>

      <CompromisosSubnav />

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
        <div className="carbon-kpi">
          <span>Total</span>
          <strong>{formatNum(kpis.total)}</strong>
          <small>Archivos / registros</small>
        </div>
        <div className="carbon-kpi warn">
          <span>Pendientes</span>
          <strong>{formatNum(kpis.pendiente)}</strong>
          <small>Por revisar</small>
        </div>
        <div className="carbon-kpi lime">
          <span>Aprobadas</span>
          <strong>{formatNum(kpis.aprobadas)}</strong>
          <small>Validadas</small>
        </div>
        <div className="carbon-kpi dark">
          <span>Rechazo / corrección</span>
          <strong>{formatNum(kpis.rechazadas)}</strong>
          <small>Requieren acción</small>
        </div>
      </div>

      <section className="carbon-section fase1-table-section">
        <div className="fase1-filters">
          <select
            value={filterCompromiso}
            onChange={(e) => {
              const v = e.target.value
              setFilterCompromiso(v)
              if (v === FILTER_ALL) {
                setSearchParams({})
              } else {
                setSearchParams({ c: v })
              }
            }}
          >
            <option value={FILTER_ALL}>Todos los compromisos</option>
            {compromisos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo ? `${c.codigo} · ` : ''}
                {c.titulo}
              </option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value={FILTER_ALL}>Todos los estados</option>
            {EVIDENCIA_ESTADOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value={FILTER_ALL}>Todos los tipos</option>
            {EVIDENCIA_TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="fase1-table-wrap">
          <table className="fase1-table">
            <thead>
              <tr>
                <th>Evidencia</th>
                <th>Compromiso</th>
                <th>Tipo</th>
                <th>Fecha / periodo</th>
                <th>Sitio</th>
                <th>Archivo</th>
                <th>Revisión</th>
                <th>Versión</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="fase1-empty">
                    <FolderOpen size={16} /> No hay evidencias con estos filtros.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const c = byId.get(r.compromisoId)
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.titulo}</strong>
                        {r.descripcion ? (
                          <div className="compromisos-muted">
                            {r.descripcion.slice(0, 70)}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {c ? (
                          <Link
                            to={`/compromisos-ambientales/editar/${c.id}`}
                          >
                            {c.codigo || c.titulo}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{r.tipoEvidencia}</td>
                      <td>
                        {formatIsoDate(r.fechaCumplimiento)}
                        {r.periodo ? (
                          <div className="compromisos-muted">{r.periodo}</div>
                        ) : null}
                      </td>
                      <td>{r.sitio || c?.sitio || '—'}</td>
                      <td>
                        {r.archivoUrl ? (
                          <a
                            href={r.archivoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="compromisos-file-link"
                          >
                            {r.archivoNombre || 'Abrir'}{' '}
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="compromisos-muted">Sin URL</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={
                            ESTADO_PILL[r.estadoRevision] ??
                            'fase1-pill fase1-pill--info'
                          }
                        >
                          {r.estadoRevision}
                        </span>
                        {r.revisadoPor ? (
                          <div className="compromisos-muted">
                            {r.revisadoPor}
                          </div>
                        ) : null}
                      </td>
                      <td>v{r.version}</td>
                      <td className="fase1-row-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Editar"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon danger"
                          title="Eliminar"
                          onClick={() => void handleDelete(r.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fase1-modal-head">
              <h2>{form.id ? 'Editar evidencia' : 'Nueva evidencia'}</h2>
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
              <label className="fase1-span-2">
                Compromiso
                <select
                  value={form.compromisoId}
                  onChange={(e) => {
                    const cid = e.target.value
                    const c = byId.get(cid)
                    setForm({
                      ...form,
                      compromisoId: cid,
                      sitio: form.sitio || c?.sitio || '',
                    })
                  }}
                  required
                >
                  <option value="">Seleccione…</option>
                  {compromisos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo ? `${c.codigo} · ` : ''}
                      {c.titulo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fase1-span-2">
                Título
                <input
                  value={form.titulo}
                  onChange={(e) =>
                    setForm({ ...form, titulo: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Tipo
                <select
                  value={form.tipoEvidencia}
                  onChange={(e) =>
                    setForm({ ...form, tipoEvidencia: e.target.value })
                  }
                >
                  {EVIDENCIA_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha de cumplimiento
                <input
                  type="date"
                  value={form.fechaCumplimiento}
                  onChange={(e) =>
                    setForm({ ...form, fechaCumplimiento: e.target.value })
                  }
                />
              </label>
              <label>
                Periodo
                <input
                  value={form.periodo}
                  onChange={(e) =>
                    setForm({ ...form, periodo: e.target.value })
                  }
                  placeholder="Q2 2026 / Junio 2026"
                />
              </label>
              <label>
                Sitio
                <select
                  value={form.sitio}
                  onChange={(e) =>
                    setForm({ ...form, sitio: e.target.value })
                  }
                >
                  <option value="">—</option>
                  {COMPROMISO_SITIOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Área
                <select
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                >
                  <option value="">—</option>
                  {COMPROMISO_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fase1-span-2">
                URL del archivo
                <input
                  value={form.archivoUrl}
                  onChange={(e) =>
                    setForm({ ...form, archivoUrl: e.target.value })
                  }
                  placeholder="https://… o enlace a Drive/SharePoint"
                />
              </label>
              <label>
                Nombre del archivo
                <input
                  value={form.archivoNombre}
                  onChange={(e) =>
                    setForm({ ...form, archivoNombre: e.target.value })
                  }
                />
              </label>
              <label>
                Versión
                <input
                  type="number"
                  min={1}
                  value={form.version}
                  onChange={(e) =>
                    setForm({ ...form, version: e.target.value })
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
              <label>
                Estado de revisión
                <select
                  value={form.estadoRevision}
                  onChange={(e) =>
                    setForm({ ...form, estadoRevision: e.target.value })
                  }
                >
                  {EVIDENCIA_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Revisado por
                <input
                  value={form.revisadoPor}
                  onChange={(e) =>
                    setForm({ ...form, revisadoPor: e.target.value })
                  }
                />
              </label>
              <label>
                Fecha revisión
                <input
                  type="date"
                  value={form.fechaRevision}
                  onChange={(e) =>
                    setForm({ ...form, fechaRevision: e.target.value })
                  }
                />
              </label>
              <label>
                Cargado por
                <input
                  value={form.cargadoPor}
                  onChange={(e) =>
                    setForm({ ...form, cargadoPor: e.target.value })
                  }
                />
              </label>
              <label className="fase1-span-2">
                Notas de revisión
                <textarea
                  rows={2}
                  value={form.notasRevision}
                  onChange={(e) =>
                    setForm({ ...form, notasRevision: e.target.value })
                  }
                />
              </label>
              <div className="fase1-form-actions">
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
