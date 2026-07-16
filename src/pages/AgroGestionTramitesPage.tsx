import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  FolderKanban,
  Loader2,
  Plus,
  Save,
  Sprout,
  Trash2,
} from 'lucide-react'
import {
  AGRO_TRAMITES_ASIGNADOS,
  AGRO_TRAMITES_ESTADOS,
  AGRO_TRAMITES_PRIORIDADES,
  AGRO_TRAMITES_PROYECTOS,
  AGRO_TRAMITES_SEDES,
  emptyTramiteRow,
  formRowsFromRecords,
  yearFromFecha,
  type AgroTramiteFormRow,
  type AgroTramiteRecord,
} from '../data/agroGestionTramites'
import {
  loadAgroGestionTramites,
  saveAgroGestionTramites,
} from '../lib/agroGestionTramitesApi'

const FILTER_ALL = 'all'

function estadoBadgeClass(estado: string): string {
  if (estado === 'Cerrado') return 'agro-badge-ok'
  if (estado === 'En proceso') return 'agro-badge-info'
  if (estado === 'Por solicitar') return 'agro-badge-warn'
  return ''
}

function prioridadBadgeClass(prioridad: string): string {
  if (prioridad === 'Alta') return 'agro-badge-warn'
  return 'agro-badge-ok'
}

export function AgroGestionTramitesPage() {
  const [records, setRecords] = useState<AgroTramiteRecord[]>([])
  const [formRows, setFormRows] = useState<AgroTramiteFormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)
  const [filterSede, setFilterSede] = useState(FILTER_ALL)
  const [filterPrioridad, setFilterPrioridad] = useState(FILTER_ALL)
  const [filterYear, setFilterYear] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      setRecords(await loadAgroGestionTramites())
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la gestión de trámites',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    const rows = formRowsFromRecords(records)
    setFormRows(rows.length ? rows : [emptyTramiteRow()])
  }, [records])

  useEffect(() => {
    if (!saveOk) return
    const t = window.setTimeout(() => setSaveOk(false), 3500)
    return () => window.clearTimeout(t)
  }, [saveOk])

  const recordYears = useMemo(
    () =>
      [...new Set(records.map((r) => yearFromFecha(r.fechaSolicitud)))].sort(
        (a, b) => b - a,
      ),
    [records],
  )

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      if (filterEstado !== FILTER_ALL && row.estado !== filterEstado)
        return false
      if (filterSede !== FILTER_ALL && row.plantaSede !== filterSede)
        return false
      if (filterPrioridad !== FILTER_ALL && row.prioridad !== filterPrioridad)
        return false
      if (
        filterYear !== FILTER_ALL &&
        String(yearFromFecha(row.fechaSolicitud)) !== filterYear
      )
        return false
      return true
    })
  }, [records, filterEstado, filterSede, filterPrioridad, filterYear])

  function patchRow(localId: string, patch: Partial<AgroTramiteFormRow>) {
    setFormRows((rows) =>
      rows.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    )
  }

  function addRow() {
    setFormRows((rows) => [...rows, emptyTramiteRow()])
  }

  function removeRow(localId: string) {
    setFormRows((rows) => {
      const next = rows.filter((r) => r.localId !== localId)
      return next.length ? next : [emptyTramiteRow()]
    })
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const toSave = formRows.filter(
        (r) => r.nombreProyecto.trim() && r.fechaSolicitud.trim(),
      )
      const saved = await saveAgroGestionTramites(toSave)
      setRecords(saved)
      setSaveOk(true)
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el catálogo',
      )
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void persist()
  }

  if (loading) {
    return (
      <div className="entry-page hc-entry hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando gestión de trámites…</p>
      </div>
    )
  }

  const enProceso = records.filter((r) => r.estado === 'En proceso').length

  return (
    <div className="entry-page hc-entry agro-tramites-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · Agroprogreso
          </p>
          <h1>Gestión de trámites</h1>
          <p>
            Réplica de la hoja <strong>C. Admin corporativo</strong> (solo
            Agroprogreso). Seguimiento de ETAR, licencias, instrumentos y
            enmiendas.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/agroprogreso/gestion-de-tramites"
            className="btn-secondary-link"
          >
            Ver reporte →
          </Link>
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={() => void persist()}
          >
            {saving ? (
              <Loader2 className="hc-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Guardando…' : 'Guardar catálogo'}
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>No se pudo cargar:</strong> {loadError}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void reload()}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {saveError ? (
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {saveError}
        </div>
      ) : null}

      {saveOk ? (
        <div className="hc-banner hc-banner-ok" role="status">
          <CheckCircle2 size={18} />
          Guardado correctamente
        </div>
      ) : null}

      <div className="entry-summary hc-summary">
        <div>
          <span>Hoja Excel</span>
          <strong>C. Admin corporativo</strong>
        </div>
        <div>
          <span>Trámites</span>
          <strong>{records.length}</strong>
        </div>
        <div>
          <span>En proceso</span>
          <strong>{enProceso}</strong>
        </div>
        <div>
          <span>Prioridad alta</span>
          <strong>
            {records.filter((r) => r.prioridad === 'Alta').length}
          </strong>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="entry-section">
          <div className="entry-section-head alicon-sheet-head">
            <div>
              <h2>
                <FolderKanban
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Catálogo de trámites
              </h2>
              <p>
                Una tarjeta por proceso: fecha de solicitud, sede, proyecto,
                estado, responsable y prioridad.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary-link"
              onClick={addRow}
            >
              <Plus size={16} />
              Agregar trámite
            </button>
          </div>

          <div className="agro-insp-cards">
            {formRows.map((row, idx) => (
              <article key={row.localId} className="agro-insp-card">
                <header>
                  <strong>Trámite {idx + 1}</strong>
                  <button
                    type="button"
                    className="alicon-icon-btn"
                    title="Quitar"
                    onClick={() => removeRow(row.localId)}
                  >
                    <Trash2 size={15} />
                  </button>
                </header>
                <div className="agro-insp-grid">
                  <label>
                    Fecha solicitud
                    <input
                      type="date"
                      value={row.fechaSolicitud}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          fechaSolicitud: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Planta / Sede
                    <select
                      value={row.plantaSede}
                      onChange={(e) =>
                        patchRow(row.localId, { plantaSede: e.target.value })
                      }
                    >
                      {AGRO_TRAMITES_SEDES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.plantaSede &&
                      !(AGRO_TRAMITES_SEDES as readonly string[]).includes(
                        row.plantaSede,
                      ) ? (
                        <option value={row.plantaSede}>{row.plantaSede}</option>
                      ) : null}
                    </select>
                  </label>
                  <label>
                    Estado
                    <select
                      value={row.estado}
                      onChange={(e) =>
                        patchRow(row.localId, { estado: e.target.value })
                      }
                    >
                      {AGRO_TRAMITES_ESTADOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Prioridad
                    <select
                      value={row.prioridad}
                      onChange={(e) =>
                        patchRow(row.localId, { prioridad: e.target.value })
                      }
                    >
                      {AGRO_TRAMITES_PRIORIDADES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="agro-insp-span2">
                    Nombre del proyecto
                    <select
                      value={row.nombreProyecto}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          nombreProyecto: e.target.value,
                        })
                      }
                    >
                      {AGRO_TRAMITES_PROYECTOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.nombreProyecto &&
                      !(AGRO_TRAMITES_PROYECTOS as readonly string[]).includes(
                        row.nombreProyecto as (typeof AGRO_TRAMITES_PROYECTOS)[number],
                      ) ? (
                        <option value={row.nombreProyecto}>
                          {row.nombreProyecto}
                        </option>
                      ) : null}
                    </select>
                  </label>
                  <label className="agro-insp-span2">
                    Proceso asignado a
                    <select
                      value={row.asignadoA}
                      onChange={(e) =>
                        patchRow(row.localId, { asignadoA: e.target.value })
                      }
                    >
                      {AGRO_TRAMITES_ASIGNADOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.asignadoA &&
                      !(AGRO_TRAMITES_ASIGNADOS as readonly string[]).includes(
                        row.asignadoA as (typeof AGRO_TRAMITES_ASIGNADOS)[number],
                      ) ? (
                        <option value={row.asignadoA}>{row.asignadoA}</option>
                      ) : null}
                    </select>
                  </label>
                  <label className="agro-insp-span-all">
                    Observaciones
                    <textarea
                      value={row.observaciones}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          observaciones: e.target.value,
                        })
                      }
                      rows={2}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="entry-footer">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <Loader2 className="hc-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Guardando…' : 'Guardar catálogo'}
          </button>
        </div>
      </form>

      <section className="entry-section">
        <div className="entry-section-head">
          <div>
            <h2>Vista del catálogo</h2>
            <p>
              {filteredRecords.length} de {records.length} trámites
            </p>
          </div>
        </div>

        <div className="agro-table-filters" aria-label="Filtros trámites">
          <label>
            Año
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {recordYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sede
            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {AGRO_TRAMITES_SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {AGRO_TRAMITES_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {AGRO_TRAMITES_PRIORIDADES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="carbon-table-wrap agro-lic-catalog-wrap">
          <table className="carbon-table agro-lic-catalog">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Sede</th>
                <th>Proyecto</th>
                <th>Estado</th>
                <th>Asignado</th>
                <th>Prioridad</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-exp">{row.fechaSolicitud}</td>
                    <td className="agro-lic-sede">{row.plantaSede}</td>
                    <td className="agro-lic-name">{row.nombreProyecto}</td>
                    <td className="agro-lic-est">
                      <span className={estadoBadgeClass(row.estado)}>
                        {row.estado}
                      </span>
                    </td>
                    <td className="agro-lic-name">{row.asignadoA || '—'}</td>
                    <td className="agro-lic-est">
                      <span className={prioridadBadgeClass(row.prioridad)}>
                        {row.prioridad}
                      </span>
                    </td>
                    <td className="agro-obs-cell">{row.observaciones}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
