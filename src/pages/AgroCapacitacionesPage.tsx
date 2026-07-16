import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Sprout,
  Trash2,
} from 'lucide-react'
import {
  AGRO_CAPACITACION_DETALLES,
  AGRO_CAPACITACION_ESTADOS,
  AGRO_CAPACITACION_PUBLICOS,
  AGRO_CAPACITACION_SEDES,
  MONITORING_MONTHS,
  emptyCapacitacionRow,
  formRowsFromRecords,
  monthFromFecha,
  monthHasCapacitaciones,
  yearFromFecha,
  type AgroCapacitacionFormRow,
  type AgroCapacitacionRecord,
  type MonitoringMonth,
} from '../data/agroCapacitaciones'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import {
  loadAgroCapacitaciones,
  saveAgroCapacitacionesMonth,
} from '../lib/agroCapacitacionesApi'

function MonthRail({
  month,
  onChange,
  filled,
}: {
  month: MonitoringMonth
  onChange: (m: MonitoringMonth) => void
  filled: Set<MonitoringMonth>
}) {
  return (
    <div className="hc-month-rail" role="tablist" aria-label="Meses del año">
      {MONITORING_MONTHS.map((m) => {
        const short = m.slice(0, 3)
        const isActive = m === month
        const has = filled.has(m)
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`hc-month-pill ${isActive ? 'active' : ''} ${has ? 'filled' : ''}`}
            onClick={() => onChange(m)}
          >
            <span>{short}</span>
            <i aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

const FILTER_ALL = 'all'
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1))

export function AgroCapacitacionesPage() {
  const [records, setRecords] = useState<AgroCapacitacionRecord[]>([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [formRows, setFormRows] = useState<AgroCapacitacionFormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [filterYear, setFilterYear] = useState<string>(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState<string>(FILTER_ALL)
  const [filterSede, setFilterSede] = useState<string>(FILTER_ALL)
  const [filterEstado, setFilterEstado] = useState<string>(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      setRecords(await loadAgroCapacitaciones())
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar las capacitaciones',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    const rows = formRowsFromRecords(records, year, month)
    setFormRows(rows.length ? rows : [emptyCapacitacionRow(year, month)])
  }, [records, year, month])

  useEffect(() => {
    if (!saveOk) return
    const t = window.setTimeout(() => setSaveOk(false), 3500)
    return () => window.clearTimeout(t)
  }, [saveOk])

  const years = useMemo(
    () =>
      selectableMonitoringYears(
        records.map((r) => yearFromFecha(r.fechaInicio)),
      ),
    [records],
  )

  const recordYears = useMemo(
    () =>
      [...new Set(records.map((r) => yearFromFecha(r.fechaInicio)))].sort(
        (a, b) => b - a,
      ),
    [records],
  )

  const filledMonths = useMemo(() => {
    const set = new Set<MonitoringMonth>()
    for (const m of MONITORING_MONTHS) {
      if (monthHasCapacitaciones(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const y = yearFromFecha(row.fechaInicio)
      const m = monthFromFecha(row.fechaInicio)
      if (filterYear !== FILTER_ALL && String(y) !== filterYear) return false
      if (filterMonth !== FILTER_ALL && m !== filterMonth) return false
      if (filterSede !== FILTER_ALL && row.plantaSede !== filterSede)
        return false
      if (filterEstado !== FILTER_ALL && row.estado !== filterEstado)
        return false
      return true
    })
  }, [records, filterYear, filterMonth, filterSede, filterEstado])

  function patchRow(
    localId: string,
    patch: Partial<AgroCapacitacionFormRow>,
  ) {
    setFormRows((rows) =>
      rows.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    )
  }

  function addRow() {
    setFormRows((rows) => [...rows, emptyCapacitacionRow(year, month)])
  }

  function removeRow(localId: string) {
    setFormRows((rows) => {
      const next = rows.filter((r) => r.localId !== localId)
      return next.length ? next : [emptyCapacitacionRow(year, month)]
    })
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const toSave = formRows.filter(
        (r) => r.plantaSede.trim() && r.detalle.trim(),
      )
      const saved = await saveAgroCapacitacionesMonth(year, month, toSave)
      setRecords((prev) => {
        const rest = prev.filter((r) => {
          const m = monthFromFecha(r.fechaInicio)
          return !(yearFromFecha(r.fechaInicio) === year && m === month)
        })
        return [...rest, ...saved].sort((a, b) =>
          b.fechaInicio.localeCompare(a.fechaInicio),
        )
      })
      setSaveOk(true)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'No se pudo guardar el mes',
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
        <p>Cargando capacitaciones Agroprogreso…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-capacitaciones-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · Agroprogreso
          </p>
          <h1>Capacitaciones</h1>
          <p>
            Réplica de la hoja <strong>Ejecuciones</strong> (tipo
            Capacitaciones · Agroprogreso). Captura por mes: sede, tema,
            público, fechas y estado.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/agroprogreso/capacitaciones"
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
            {saving ? <Loader2 className="hc-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Guardando…' : 'Guardar mes'}
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>No se pudo cargar:</strong> {loadError}
          <button type="button" className="btn-ghost" onClick={() => void reload()}>
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
          <strong>Ejecuciones · Capacitaciones</strong>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {month} {year}
          </strong>
        </div>
        <div>
          <span>En edición</span>
          <strong>{formRows.length}</strong>
        </div>
        <div>
          <span>Total base</span>
          <strong>{records.length}</strong>
        </div>
      </div>

      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="hc-month-bar">
          <div className="agro-agua-period">
            <label htmlFor="agro-cap-year">Año</label>
            <select
              id="agro-cap-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span className="hc-month-label">Mes en edición</span>
            <strong>{month}</strong>
          </div>
          <MonthRail month={month} onChange={setMonth} filled={filledMonths} />
        </div>

        <section className="entry-section">
          <div className="entry-section-head alicon-sheet-head">
            <div>
              <h2>
                <GraduationCap
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Capacitaciones del mes
              </h2>
              <p>
                Una tarjeta por evento. Fecha fin puede diferir del inicio
                dentro del mismo mes.
              </p>
            </div>
            <button type="button" className="btn-secondary-link" onClick={addRow}>
              <Plus size={16} />
              Agregar capacitación
            </button>
          </div>

          <div className="agro-insp-cards">
            {formRows.map((row, idx) => (
              <article key={row.localId} className="agro-insp-card">
                <header>
                  <strong>Capacitación {idx + 1}</strong>
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
                    Día inicio
                    <select
                      value={row.diaInicio}
                      onChange={(e) =>
                        patchRow(row.localId, { diaInicio: e.target.value })
                      }
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Día fin
                    <select
                      value={row.diaFin}
                      onChange={(e) =>
                        patchRow(row.localId, { diaFin: e.target.value })
                      }
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Planta / Sede
                    <select
                      value={row.plantaSede}
                      onChange={(e) =>
                        patchRow(row.localId, { plantaSede: e.target.value })
                      }
                    >
                      {AGRO_CAPACITACION_SEDES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.plantaSede &&
                      !(AGRO_CAPACITACION_SEDES as readonly string[]).includes(
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
                      {AGRO_CAPACITACION_ESTADOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="agro-insp-span2">
                    Detalle / tema
                    <select
                      value={row.detalle}
                      onChange={(e) =>
                        patchRow(row.localId, { detalle: e.target.value })
                      }
                    >
                      {AGRO_CAPACITACION_DETALLES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.detalle &&
                      !(AGRO_CAPACITACION_DETALLES as readonly string[]).includes(
                        row.detalle,
                      ) ? (
                        <option value={row.detalle}>{row.detalle}</option>
                      ) : null}
                    </select>
                  </label>
                  <label>
                    Público objetivo
                    <select
                      value={row.publicoObjetivo}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          publicoObjetivo: e.target.value,
                        })
                      }
                    >
                      {AGRO_CAPACITACION_PUBLICOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="agro-insp-span-all">
                    Comentarios
                    <textarea
                      rows={2}
                      value={row.comentarios}
                      onChange={(e) =>
                        patchRow(row.localId, { comentarios: e.target.value })
                      }
                      placeholder="Confirmado. Informe listo…"
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>
      </form>

      <section className="entry-section agro-records-section">
        <div className="entry-section-head">
          <h2>Datos registrados</h2>
          <p>
            {filteredRecords.length} de {records.length} capacitaciones
            Agroprogreso · fuente Ejecuciones.
          </p>
        </div>

        <div
          className="agro-table-filters"
          role="search"
          aria-label="Filtros de capacitaciones"
        >
          <label>
            Año
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {recordYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mes
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {MONITORING_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
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
              {AGRO_CAPACITACION_SEDES.map((s) => (
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
              {AGRO_CAPACITACION_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="alicon-table-wrap">
          <table className="alicon-data-table agro-records-table">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Mes</th>
                <th>Sede</th>
                <th>Detalle</th>
                <th>Público</th>
                <th>Fin</th>
                <th>Estado</th>
                <th>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="alicon-empty">
                    No hay registros con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td>{row.fechaInicio}</td>
                    <td>{monthFromFecha(row.fechaInicio) ?? '—'}</td>
                    <td>{row.plantaSede}</td>
                    <td>{row.detalle}</td>
                    <td>{row.publicoObjetivo}</td>
                    <td>{row.fechaFin}</td>
                    <td>
                      <span
                        className={
                          row.estado.toLowerCase() === 'ejecutado'
                            ? 'agro-badge-ok'
                            : row.estado.toLowerCase() === 'reprogramado'
                              ? 'agro-badge-warn'
                              : 'agro-badge-info'
                        }
                      >
                        {row.estado}
                      </span>
                    </td>
                    <td className="agro-obs-cell">{row.comentarios || '—'}</td>
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
