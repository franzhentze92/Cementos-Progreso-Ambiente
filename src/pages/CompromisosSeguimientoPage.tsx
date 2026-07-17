import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Leaf,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { CompromisosSubnav } from '../components/CompromisosSubnav'
import { useAuth } from '../context/AuthContext'
import {
  COMPROMISO_ESTADOS,
  SEGUIMIENTO_TIPOS,
  emptySeguimientoForm,
  formatDateTime,
  formatIsoDate,
  formatNum,
  seguimientoLabel,
  type CompromisoRecord,
  type SeguimientoForm,
  type SeguimientoRecord,
} from '../data/compromisosAmbientales'
import {
  createSeguimiento,
  deleteSeguimiento,
  loadCompromisos,
  loadSeguimiento,
} from '../lib/compromisosAmbientalesApi'

const FILTER_ALL = 'all'

export function CompromisosSeguimientoPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const preselect = searchParams.get('c') ?? ''

  const [compromisos, setCompromisos] = useState<CompromisoRecord[]>([])
  const [records, setRecords] = useState<SeguimientoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<SeguimientoForm>(() =>
    emptySeguimientoForm(),
  )
  const [filterCompromiso, setFilterCompromiso] = useState(
    preselect || FILTER_ALL,
  )
  const [filterTipo, setFilterTipo] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [comps, segs] = await Promise.all([
        loadCompromisos(),
        loadSeguimiento(),
      ])
      setCompromisos(comps)
      setRecords(segs)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el seguimiento',
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
    return new Map(compromisos.map((c) => [c.id, c]))
  }, [compromisos])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterCompromiso !== FILTER_ALL && r.compromisoId !== filterCompromiso)
        return false
      if (filterTipo !== FILTER_ALL && r.tipoEvento !== filterTipo) return false
      return true
    })
  }, [records, filterCompromiso, filterTipo])

  function openNew() {
    const autor = user?.name ?? user?.username ?? ''
    const cid =
      filterCompromiso !== FILTER_ALL ? filterCompromiso : preselect
    const c = cid ? byId.get(cid) : undefined
    setForm(
      emptySeguimientoForm({
        compromisoId: cid,
        autor,
        porcentajeAvance:
          c != null ? String(c.porcentajeAvance) : '',
        estadoAnterior: c?.estado ?? '',
      }),
    )
    setShowForm(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createSeguimiento({
        ...form,
        autor: form.autor || user?.name || user?.username || 'Sistema',
      })
      setOkMsg('Actualización registrada')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta entrada de seguimiento?')) return
    try {
      await deleteSeguimiento(id)
      setOkMsg('Entrada eliminada')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando seguimiento…</p>
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
          <h1>Seguimiento</h1>
          <p>
            Línea de tiempo operativa: avance, bloqueos, visitas y cambios de
            estado · {formatNum(filtered.length)} evento(s)
          </p>
        </div>
        <div className="hc-header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nueva actualización
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

      <div className="fase1-filters">
        <select
          value={filterCompromiso}
          onChange={(e) => {
            const v = e.target.value
            setFilterCompromiso(v)
            if (v === FILTER_ALL) setSearchParams({})
            else setSearchParams({ c: v })
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
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
        >
          <option value={FILTER_ALL}>Todos los eventos</option>
          {SEGUIMIENTO_TIPOS.map((t) => (
            <option key={t} value={t}>
              {seguimientoLabel(t)}
            </option>
          ))}
        </select>
      </div>

      <section className="carbon-section">
        {filtered.length === 0 ? (
          <p className="fase1-empty">
            <History size={16} /> Sin eventos de seguimiento.
          </p>
        ) : (
          <ol className="compromisos-timeline">
            {filtered.map((r) => {
              const c = byId.get(r.compromisoId)
              return (
                <li key={r.id} className="compromisos-timeline-item">
                  <div className="compromisos-timeline-dot" />
                  <div className="compromisos-timeline-body">
                    <div className="compromisos-timeline-head">
                      <strong>{seguimientoLabel(r.tipoEvento)}</strong>
                      <span>{formatDateTime(r.createdAt)}</span>
                    </div>
                    <p className="compromisos-timeline-comp">
                      {c ? (
                        <Link
                          to={`/compromisos-ambientales/editar/${c.id}`}
                        >
                          {c.codigo || c.titulo}
                        </Link>
                      ) : (
                        'Compromiso'
                      )}
                    </p>
                    {r.descripcion ? <p>{r.descripcion}</p> : null}
                    {r.comentario ? (
                      <p className="compromisos-muted">{r.comentario}</p>
                    ) : null}
                    {r.bloqueo ? (
                      <p className="compromisos-bloqueo">
                        Bloqueo: {r.bloqueo}
                      </p>
                    ) : null}
                    <div className="compromisos-timeline-meta">
                      {r.porcentajeAvance != null ? (
                        <span>Avance {formatNum(r.porcentajeAvance, 0)}%</span>
                      ) : null}
                      {r.estadoAnterior || r.estadoNuevo ? (
                        <span>
                          {r.estadoAnterior || '—'} → {r.estadoNuevo || '—'}
                        </span>
                      ) : null}
                      {r.fechaAnterior || r.fechaNueva ? (
                        <span>
                          Fecha {formatIsoDate(r.fechaAnterior)} →{' '}
                          {formatIsoDate(r.fechaNueva)}
                        </span>
                      ) : null}
                      <span>Por {r.autor || '—'}</span>
                      <button
                        type="button"
                        className="btn-icon danger"
                        title="Eliminar"
                        onClick={() => void handleDelete(r.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fase1-modal-head">
              <h2>Nueva actualización</h2>
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
                      estadoAnterior: c?.estado ?? '',
                      porcentajeAvance:
                        c != null ? String(c.porcentajeAvance) : '',
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
              <label>
                Tipo de evento
                <select
                  value={form.tipoEvento}
                  onChange={(e) =>
                    setForm({ ...form, tipoEvento: e.target.value })
                  }
                >
                  {SEGUIMIENTO_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {seguimientoLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Autor
                <input
                  value={form.autor}
                  onChange={(e) =>
                    setForm({ ...form, autor: e.target.value })
                  }
                />
              </label>
              <label className="fase1-span-2">
                Descripción
                <input
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  placeholder="Resumen del evento"
                />
              </label>
              <label className="fase1-span-2">
                Comentario
                <textarea
                  rows={3}
                  value={form.comentario}
                  onChange={(e) =>
                    setForm({ ...form, comentario: e.target.value })
                  }
                />
              </label>
              <label>
                % avance
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.porcentajeAvance}
                  onChange={(e) =>
                    setForm({ ...form, porcentajeAvance: e.target.value })
                  }
                />
              </label>
              <label>
                Nuevo estado
                <select
                  value={form.estadoNuevo}
                  onChange={(e) =>
                    setForm({ ...form, estadoNuevo: e.target.value })
                  }
                >
                  <option value="">(sin cambio)</option>
                  {COMPROMISO_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fase1-span-2">
                Bloqueo / dificultad
                <input
                  value={form.bloqueo}
                  onChange={(e) =>
                    setForm({ ...form, bloqueo: e.target.value })
                  }
                  placeholder="Ej. Laboratorio externo demorado"
                />
              </label>
              <label>
                Fecha anterior
                <input
                  type="date"
                  value={form.fechaAnterior}
                  onChange={(e) =>
                    setForm({ ...form, fechaAnterior: e.target.value })
                  }
                />
              </label>
              <label>
                Fecha nueva
                <input
                  type="date"
                  value={form.fechaNueva}
                  onChange={(e) =>
                    setForm({ ...form, fechaNueva: e.target.value })
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
                  {saving ? 'Guardando…' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
