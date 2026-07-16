import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  FileBadge,
  Loader2,
  Plus,
  Save,
  Sprout,
  Trash2,
} from 'lucide-react'
import {
  AGRO_LICENCIA_CATEGORIAS,
  AGRO_LICENCIA_ESTADOS,
  AGRO_LICENCIA_SEDES,
  emptyLicenciaRow,
  formRowsFromRecords,
  type AgroLicenciaFormRow,
  type AgroLicenciaRecord,
} from '../data/agroLicencias'
import { loadAgroLicencias, saveAgroLicencias } from '../lib/agroLicenciasApi'

const FILTER_ALL = 'all'

function estadoBadgeClass(estado: string): string {
  if (estado === 'VIGENTE') return 'agro-badge-ok'
  if (estado === 'EN PROCESO') return 'agro-badge-info'
  if (estado === 'DESISTIDO') return 'agro-badge-warn'
  return ''
}

export function AgroLicenciasPage() {
  const [records, setRecords] = useState<AgroLicenciaRecord[]>([])
  const [formRows, setFormRows] = useState<AgroLicenciaFormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [filterSede, setFilterSede] = useState(FILTER_ALL)
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)
  const [filterCategoria, setFilterCategoria] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      setRecords(await loadAgroLicencias())
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar las licencias',
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
    setFormRows(rows.length ? rows : [emptyLicenciaRow()])
  }, [records])

  useEffect(() => {
    if (!saveOk) return
    const t = window.setTimeout(() => setSaveOk(false), 3500)
    return () => window.clearTimeout(t)
  }, [saveOk])

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      if (filterSede !== FILTER_ALL && row.plantaSede !== filterSede)
        return false
      if (filterEstado !== FILTER_ALL && row.estado !== filterEstado)
        return false
      if (filterCategoria !== FILTER_ALL && row.categoria !== filterCategoria)
        return false
      return true
    })
  }, [records, filterSede, filterEstado, filterCategoria])

  const sedeOptions = useMemo(
    () =>
      [...new Set(records.map((r) => r.plantaSede))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [records],
  )
  const categoriaOptions = useMemo(
    () =>
      [...new Set(records.map((r) => r.categoria).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [records],
  )

  function patchRow(localId: string, patch: Partial<AgroLicenciaFormRow>) {
    setFormRows((rows) =>
      rows.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    )
  }

  function addRow() {
    setFormRows((rows) => [...rows, emptyLicenciaRow()])
  }

  function removeRow(localId: string) {
    setFormRows((rows) => {
      const next = rows.filter((r) => r.localId !== localId)
      return next.length ? next : [emptyLicenciaRow()]
    })
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const toSave = formRows.filter(
        (r) => r.licencia.trim() || r.expediente.trim(),
      )
      const saved = await saveAgroLicencias(toSave)
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
        <p>Cargando licencias Agroprogreso…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-licencias-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · Agroprogreso
          </p>
          <h1>Licencias ambientales</h1>
          <p>
            Réplica de la hoja <strong>C. Admin Licencias</strong> (solo
            Agroprogreso). Catálogo de licencias: sede, expediente, categoría,
            vigencia y estado.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/agroprogreso/licencias-ambientales"
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
          <strong>C. Admin Licencias</strong>
        </div>
        <div>
          <span>Unidad</span>
          <strong>Agroprogreso</strong>
        </div>
        <div>
          <span>Registros</span>
          <strong>{records.length}</strong>
        </div>
        <div>
          <span>Vigentes</span>
          <strong>
            {records.filter((r) => r.estado === 'VIGENTE').length}
          </strong>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="entry-section">
          <div className="entry-section-head alicon-sheet-head">
            <div>
              <h2>
                <FileBadge
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Catálogo de licencias
              </h2>
              <p>
                Una tarjeta por licencia. Vigencia: «Del D/M/AAAA al D/M/AAAA»
                o «NO APLICA».
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary-link"
              onClick={addRow}
            >
              <Plus size={16} />
              Agregar licencia
            </button>
          </div>

          <div className="agro-insp-cards">
            {formRows.map((row, idx) => (
              <article key={row.localId} className="agro-insp-card">
                <header>
                  <strong>Licencia {idx + 1}</strong>
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
                    Planta / Sede
                    <select
                      value={row.plantaSede}
                      onChange={(e) =>
                        patchRow(row.localId, { plantaSede: e.target.value })
                      }
                    >
                      {AGRO_LICENCIA_SEDES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.plantaSede &&
                      !(AGRO_LICENCIA_SEDES as readonly string[]).includes(
                        row.plantaSede,
                      ) ? (
                        <option value={row.plantaSede}>{row.plantaSede}</option>
                      ) : null}
                    </select>
                  </label>
                  <label>
                    Categoría
                    <select
                      value={row.categoria}
                      onChange={(e) =>
                        patchRow(row.localId, { categoria: e.target.value })
                      }
                    >
                      <option value="">—</option>
                      {AGRO_LICENCIA_CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      {row.categoria &&
                      !(AGRO_LICENCIA_CATEGORIAS as readonly string[]).includes(
                        row.categoria,
                      ) ? (
                        <option value={row.categoria}>{row.categoria}</option>
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
                      {AGRO_LICENCIA_ESTADOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.estado &&
                      !(AGRO_LICENCIA_ESTADOS as readonly string[]).includes(
                        row.estado as (typeof AGRO_LICENCIA_ESTADOS)[number],
                      ) ? (
                        <option value={row.estado}>{row.estado}</option>
                      ) : null}
                    </select>
                  </label>
                  <label>
                    No. expediente
                    <input
                      value={row.expediente}
                      onChange={(e) =>
                        patchRow(row.localId, { expediente: e.target.value })
                      }
                      placeholder="DABI-####-AAAA"
                    />
                  </label>
                  <label className="agro-insp-span2">
                    Licencia / instrumento
                    <input
                      value={row.licencia}
                      onChange={(e) =>
                        patchRow(row.localId, { licencia: e.target.value })
                      }
                      placeholder="Nombre de la licencia"
                      required
                    />
                  </label>
                  <label className="agro-insp-span2">
                    Vigencia
                    <input
                      value={row.vigencia}
                      onChange={(e) =>
                        patchRow(row.localId, { vigencia: e.target.value })
                      }
                      placeholder="Del D/M/AAAA al D/M/AAAA o NO APLICA"
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
              {filteredRecords.length} de {records.length} licencias
            </p>
          </div>
        </div>

        <div
          className="agro-table-filters"
          aria-label="Filtros de licencias"
        >
          <label>
            Sede
            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {sedeOptions.map((s) => (
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
              {AGRO_LICENCIA_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {categoriaOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="carbon-table-wrap agro-lic-catalog-wrap">
          <table className="carbon-table agro-lic-catalog">
            <colgroup>
              <col className="col-sede" />
              <col className="col-licencia" />
              <col className="col-exp" />
              <col className="col-cat" />
              <col className="col-vig" />
              <col className="col-est" />
            </colgroup>
            <thead>
              <tr>
                <th>Sede</th>
                <th>Licencia</th>
                <th>Expediente</th>
                <th>Cat.</th>
                <th>Vigencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-sede">{row.plantaSede}</td>
                    <td className="agro-lic-name">{row.licencia}</td>
                    <td className="agro-lic-exp">
                      {row.expediente || '—'}
                    </td>
                    <td className="agro-lic-cat">
                      <span className="agro-lic-chip">
                        {row.categoria || '—'}
                      </span>
                    </td>
                    <td className="agro-lic-vig">
                      {row.vigencia || 'NO APLICA'}
                    </td>
                    <td className="agro-lic-est">
                      <span className={estadoBadgeClass(row.estado)}>
                        {row.estado}
                      </span>
                    </td>
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
