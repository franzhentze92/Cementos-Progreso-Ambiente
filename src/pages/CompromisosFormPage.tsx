import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Leaf,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CompromisosSubnav } from '../components/CompromisosSubnav'
import { useAuth } from '../context/AuthContext'
import {
  COMPROMISO_AREAS,
  COMPROMISO_CRITICIDADES,
  COMPROMISO_ESTADOS,
  COMPROMISO_HITOS_ESTADOS,
  COMPROMISO_ORIGENES,
  COMPROMISO_PERIODICIDADES,
  COMPROMISO_PRIORIDADES,
  COMPROMISO_SITIOS,
  COMPROMISO_TIPOS,
  COMPROMISO_UNIDADES,
  emptyCompromisoForm,
  emptyHitoForm,
  formFromCompromiso,
  nextCodigo,
  type CompromisoForm,
} from '../data/compromisosAmbientales'
import {
  loadCompromisoById,
  loadCompromisos,
  loadHitos,
  upsertCompromiso,
} from '../lib/compromisosAmbientalesApi'

export function CompromisosFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState<CompromisoForm>(() => emptyCompromisoForm())
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!id) {
        try {
          const existing = await loadCompromisos()
          const code = nextCodigo(
            'CA',
            existing.map((r) => r.codigo).filter(Boolean),
          )
          if (!cancelled) {
            setForm(
              emptyCompromisoForm({
                codigo: code,
                createdBy: user?.name ?? user?.username ?? '',
              }),
            )
            setLoading(false)
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error
                ? err.message
                : 'No se pudo preparar el formulario',
            )
            setLoading(false)
          }
        }
        return
      }

      setLoading(true)
      try {
        const [row, hitos] = await Promise.all([
          loadCompromisoById(id),
          loadHitos(id),
        ])
        if (!row) {
          if (!cancelled) setError('Compromiso no encontrado')
          return
        }
        if (!cancelled) setForm(formFromCompromiso(row, hitos))
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'No se pudo cargar el compromiso',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [id, user?.name, user?.username])

  useEffect(() => {
    if (!okMsg) return
    const t = window.setTimeout(() => setOkMsg(null), 4000)
    return () => window.clearTimeout(t)
  }, [okMsg])

  function patch(p: Partial<CompromisoForm>) {
    setForm((prev) => ({ ...prev, ...p }))
  }

  function addHito() {
    setForm((prev) => ({
      ...prev,
      hitos: [
        ...prev.hitos,
        emptyHitoForm({ orden: prev.hitos.length }),
      ],
    }))
  }

  function updateHito(
    localId: string,
    p: Partial<(typeof form.hitos)[number]>,
  ) {
    setForm((prev) => ({
      ...prev,
      hitos: prev.hitos.map((h) =>
        h.localId === localId ? { ...h, ...p } : h,
      ),
    }))
  }

  function removeHito(localId: string) {
    setForm((prev) => ({
      ...prev,
      hitos: prev.hitos.filter((h) => h.localId !== localId),
    }))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const saved = await upsertCompromiso(form, {
        autor: user?.name ?? user?.username ?? form.createdBy,
      })
      setOkMsg(form.id ? 'Compromiso actualizado' : 'Compromiso creado')
      if (!form.id) {
        navigate(`/compromisos-ambientales/editar/${saved.id}`, {
          replace: true,
        })
      } else {
        const hitos = await loadHitos(saved.id)
        setForm(formFromCompromiso(saved, hitos))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando formulario…</p>
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
          <h1>{form.id ? 'Editar compromiso' : 'Crear compromiso'}</h1>
          <p>
            Defina qué debe hacerse, cuándo, dónde, quién lo hace y qué documento
            demuestra el cumplimiento.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link to="/compromisos-ambientales/lista" className="btn-secondary-link">
            ← Lista
          </Link>
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

      <form className="compromisos-form-page" onSubmit={handleSave}>
        <section className="carbon-section">
          <h2>Identificación</h2>
          <div className="compromisos-form-grid">
            <label>
              Código
              <input
                value={form.codigo}
                onChange={(e) => patch({ codigo: e.target.value })}
                required
              />
            </label>
            <label className="compromisos-span-2">
              Título
              <input
                value={form.titulo}
                onChange={(e) => patch({ titulo: e.target.value })}
                placeholder="Ej. Monitoreo trimestral de efluentes PTAR Alicón"
                required
              />
            </label>
            <label className="compromisos-span-3">
              Descripción operativa
              <textarea
                rows={3}
                value={form.descripcion}
                onChange={(e) => patch({ descripcion: e.target.value })}
                placeholder="Qué actividad concreta debe ejecutarse…"
              />
            </label>
          </div>
        </section>

        <section className="carbon-section">
          <h2>Alcance y origen</h2>
          <div className="compromisos-form-grid">
            <label>
              Unidad de negocio
              <select
                value={form.unidadNegocio}
                onChange={(e) => patch({ unidadNegocio: e.target.value })}
              >
                {COMPROMISO_UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sitio
              <select
                value={form.sitio}
                onChange={(e) => patch({ sitio: e.target.value })}
              >
                <option value="">Seleccione…</option>
                {COMPROMISO_SITIOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Área operativa
              <select
                value={form.areaOperativa}
                onChange={(e) => patch({ areaOperativa: e.target.value })}
              >
                <option value="">Seleccione…</option>
                {COMPROMISO_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Origen
              <select
                value={form.origen}
                onChange={(e) => patch({ origen: e.target.value })}
              >
                {COMPROMISO_ORIGENES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Referencia (licencia / resolución / CAPA…)
              <input
                value={form.origenRef}
                onChange={(e) => patch({ origenRef: e.target.value })}
                placeholder="Ej. Licencia 1234-MARN / CAPA-012"
              />
            </label>
            <label>
              Tipo
              <select
                value={form.tipo}
                onChange={(e) => patch({ tipo: e.target.value })}
              >
                {COMPROMISO_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="carbon-section">
          <h2>Responsables</h2>
          <div className="compromisos-form-grid">
            <label>
              Propietario (responsable principal)
              <input
                value={form.responsablePrincipal}
                onChange={(e) =>
                  patch({ responsablePrincipal: e.target.value })
                }
                required
              />
            </label>
            <label>
              Revisor de evidencias
              <input
                value={form.revisor}
                onChange={(e) => patch({ revisor: e.target.value })}
              />
            </label>
            <label>
              Aprobador de cierre
              <input
                value={form.aprobador}
                onChange={(e) => patch({ aprobador: e.target.value })}
              />
            </label>
            <label className="compromisos-span-3">
              Colaboradores / ejecutores (separados por coma)
              <input
                value={form.colaboradores}
                onChange={(e) => patch({ colaboradores: e.target.value })}
                placeholder="Nombre 1, Nombre 2"
              />
            </label>
          </div>
        </section>

        <section className="carbon-section">
          <h2>Plazos y criticidad</h2>
          <div className="compromisos-form-grid">
            <label>
              Fecha inicio
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => patch({ fechaInicio: e.target.value })}
              />
            </label>
            <label>
              Fecha vencimiento
              <input
                type="date"
                value={form.fechaVencimiento}
                onChange={(e) => patch({ fechaVencimiento: e.target.value })}
              />
            </label>
            <label>
              Próxima ejecución
              <input
                type="date"
                value={form.proximaEjecucion}
                onChange={(e) => patch({ proximaEjecucion: e.target.value })}
              />
            </label>
            <label>
              Periodicidad
              <select
                value={form.periodicidad}
                onChange={(e) => patch({ periodicidad: e.target.value })}
              >
                {COMPROMISO_PERIODICIDADES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridad
              <select
                value={form.prioridad}
                onChange={(e) => patch({ prioridad: e.target.value })}
              >
                {COMPROMISO_PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Criticidad
              <select
                value={form.criticidad}
                onChange={(e) => patch({ criticidad: e.target.value })}
              >
                {COMPROMISO_CRITICIDADES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estado
              <select
                value={form.estado}
                onChange={(e) => patch({ estado: e.target.value })}
              >
                {COMPROMISO_ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              % avance
              <input
                type="number"
                min={0}
                max={100}
                value={form.porcentajeAvance}
                onChange={(e) => patch({ porcentajeAvance: e.target.value })}
              />
            </label>
            <label>
              Alerta (días antes del vencimiento)
              <input
                type="number"
                min={0}
                value={form.alertaDias}
                onChange={(e) => patch({ alertaDias: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="carbon-section">
          <h2>Criterio de cumplimiento y evidencias</h2>
          <div className="compromisos-form-grid">
            <label className="compromisos-span-3">
              Criterio que determina el cumplimiento
              <textarea
                rows={3}
                value={form.criterioCumplimiento}
                onChange={(e) =>
                  patch({ criterioCumplimiento: e.target.value })
                }
                placeholder="Ej. Informe de laboratorio con parámetros dentro de límites y acuse de recibido MARN"
                required
              />
            </label>
            <label className="compromisos-span-3">
              Evidencias requeridas
              <textarea
                rows={2}
                value={form.evidenciasRequeridas}
                onChange={(e) =>
                  patch({ evidenciasRequeridas: e.target.value })
                }
                placeholder="Informe lab, fotos de muestreo, formulario F-AMB-xx…"
              />
            </label>
            <label className="compromisos-span-3">
              Notas
              <textarea
                rows={2}
                value={form.notas}
                onChange={(e) => patch({ notas: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="carbon-section">
          <div className="fase1-section-head">
            <div>
              <h2>Hitos / actividades</h2>
              <p className="fase1-section-sub">
                Desglose las actividades necesarias para evitar compromisos vagos
              </p>
            </div>
            <button type="button" className="btn-secondary-link" onClick={addHito}>
              <Plus size={14} /> Agregar hito
            </button>
          </div>

          {form.hitos.length === 0 ? (
            <p className="compromisos-muted">Sin hitos aún.</p>
          ) : (
            <div className="compromisos-hitos-list">
              {form.hitos.map((h, idx) => (
                <div key={h.localId} className="compromisos-hito-row">
                  <span className="compromisos-hito-num">{idx + 1}</span>
                  <input
                    placeholder="Título del hito"
                    value={h.titulo}
                    onChange={(e) =>
                      updateHito(h.localId, { titulo: e.target.value })
                    }
                  />
                  <input
                    type="date"
                    value={h.fechaObjetivo}
                    onChange={(e) =>
                      updateHito(h.localId, { fechaObjetivo: e.target.value })
                    }
                  />
                  <select
                    value={h.estado}
                    onChange={(e) =>
                      updateHito(h.localId, { estado: e.target.value })
                    }
                  >
                    {COMPROMISO_HITOS_ESTADOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Detalle"
                    value={h.descripcion}
                    onChange={(e) =>
                      updateHito(h.localId, { descripcion: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="btn-icon danger"
                    title="Quitar"
                    onClick={() => removeHito(h.localId)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="compromisos-form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="hc-spin" size={16} /> Guardando…
              </>
            ) : form.id ? (
              'Guardar cambios'
            ) : (
              'Crear compromiso'
            )}
          </button>
          {form.id ? (
            <>
              <Link
                to={`/compromisos-ambientales/evidencias?c=${form.id}`}
                className="btn-secondary-link"
              >
                Evidencias →
              </Link>
              <Link
                to={`/compromisos-ambientales/seguimiento?c=${form.id}`}
                className="btn-secondary-link"
              >
                Seguimiento →
              </Link>
            </>
          ) : null}
        </div>
      </form>
    </div>
  )
}
