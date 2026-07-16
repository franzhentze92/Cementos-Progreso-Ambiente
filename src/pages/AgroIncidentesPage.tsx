import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Sprout,
  Trash2,
} from 'lucide-react'
import {
  AGRO_INCIDENTE_INSTRUMENTOS,
  AGRO_INCIDENTE_SEDES,
  INCIDENTE_ESTADOS,
  MONITORING_MONTHS,
  countAbiertosMes,
  emptyIncidenteRow,
  formRowsFromRecords,
  formatPctFromValor,
  monthFromFecha,
  monthHasIncidentes,
  yearFromFecha,
  type AgroIncidenteFormRow,
  type AgroIncidenteRecord,
  type MonitoringMonth,
} from '../data/agroIncidentes'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import {
  loadAgroIncidentes,
  saveAgroIncidentesMonth,
} from '../lib/agroIncidentesApi'

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

export function AgroIncidentesPage() {
  const [records, setRecords] = useState<AgroIncidenteRecord[]>([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [formRows, setFormRows] = useState<AgroIncidenteFormRow[]>([])
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
      const data = await loadAgroIncidentes()
      setRecords(data)
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'No se pudo cargar los incidentes',
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
    setFormRows(rows.length ? rows : [emptyIncidenteRow(year, month)])
  }, [records, year, month])

  useEffect(() => {
    if (!saveOk) return
    const t = window.setTimeout(() => setSaveOk(false), 3500)
    return () => window.clearTimeout(t)
  }, [saveOk])

  const years = useMemo(
    () =>
      selectableMonitoringYears(records.map((r) => yearFromFecha(r.fecha))),
    [records],
  )

  const recordYears = useMemo(
    () =>
      [...new Set(records.map((r) => yearFromFecha(r.fecha)))].sort(
        (a, b) => b - a,
      ),
    [records],
  )

  const filledMonths = useMemo(() => {
    const set = new Set<MonitoringMonth>()
    for (const m of MONITORING_MONTHS) {
      if (monthHasIncidentes(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const abiertosMes = useMemo(
    () => countAbiertosMes(records, year, month),
    [records, year, month],
  )

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const y = yearFromFecha(row.fecha)
      const m = monthFromFecha(row.fecha)
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
    patch: Partial<AgroIncidenteFormRow>,
  ) {
    setFormRows((rows) =>
      rows.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    )
  }

  function addRow() {
    setFormRows((rows) => [...rows, emptyIncidenteRow(year, month)])
  }

  function removeRow(localId: string) {
    setFormRows((rows) => {
      const next = rows.filter((r) => r.localId !== localId)
      return next.length ? next : [emptyIncidenteRow(year, month)]
    })
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const toSave = formRows.filter(
        (r) =>
          r.plantaSede.trim() &&
          (r.descripcion.trim() ||
            r.accionesRealizadas.trim() ||
            r.comentarios.trim() ||
            r.id),
      )
      const saved = await saveAgroIncidentesMonth(year, month, toSave)
      setRecords((prev) => {
        const rest = prev.filter((r) => {
          const m = monthFromFecha(r.fecha)
          return !(yearFromFecha(r.fecha) === year && m === month)
        })
        return [...rest, ...saved].sort((a, b) =>
          a.fecha === b.fecha
            ? a.plantaSede.localeCompare(b.plantaSede)
            : b.fecha.localeCompare(a.fecha),
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
        <p>Cargando incidentes ambientales Agroprogreso…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-incidentes-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · Agroprogreso
          </p>
          <h1>Incidentes ambientales</h1>
          <p>
            Réplica de la hoja <strong>Incidentes</strong> (solo Agroprogreso).
            Captura por mes: sede, descripción, valor, estado y evidencias.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/agroprogreso/incidentes-ambientales"
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
          <strong>Incidentes</strong>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {month} {year}
          </strong>
        </div>
        <div>
          <span>Abiertos en el mes</span>
          <strong>{abiertosMes}</strong>
        </div>
        <div>
          <span>Incidentes mes</span>
          <strong>{formRows.length}</strong>
        </div>
      </div>

      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="hc-month-bar">
          <div className="agro-agua-period">
            <label htmlFor="agro-inc-year">Año</label>
            <select
              id="agro-inc-year"
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
                <AlertTriangle
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Incidentes del mes
              </h2>
              <p>
                Valor se captura en % (el Excel lo guarda como decimal 0–1). Año
                mes y mes texto se calculan al guardar.
              </p>
            </div>
            <button type="button" className="btn-secondary-link" onClick={addRow}>
              <Plus size={16} />
              Agregar incidente
            </button>
          </div>

          <div className="agro-insp-cards">
            {formRows.map((row, idx) => (
              <article key={row.localId} className="agro-insp-card">
                <header>
                  <strong>Incidente {idx + 1}</strong>
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
                    Día
                    <select
                      value={row.dia}
                      onChange={(e) =>
                        patchRow(row.localId, { dia: e.target.value })
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
                      {AGRO_INCIDENTE_SEDES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.plantaSede &&
                      !(AGRO_INCIDENTE_SEDES as readonly string[]).includes(
                        row.plantaSede,
                      ) ? (
                        <option value={row.plantaSede}>{row.plantaSede}</option>
                      ) : null}
                    </select>
                  </label>
                  <label>
                    Instrumento
                    <select
                      value={row.instrumento}
                      onChange={(e) =>
                        patchRow(row.localId, { instrumento: e.target.value })
                      }
                    >
                      {AGRO_INCIDENTE_INSTRUMENTOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.instrumento &&
                      !(
                        AGRO_INCIDENTE_INSTRUMENTOS as readonly string[]
                      ).includes(row.instrumento) ? (
                        <option value={row.instrumento}>
                          {row.instrumento}
                        </option>
                      ) : null}
                    </select>
                  </label>
                  <label>
                    Valor incidente (%)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.valorPct}
                      onChange={(e) =>
                        patchRow(row.localId, { valorPct: e.target.value })
                      }
                      placeholder="ej. 17"
                    />
                  </label>
                  <label>
                    Estado
                    <select
                      value={row.estado}
                      onChange={(e) =>
                        patchRow(row.localId, { estado: e.target.value })
                      }
                    >
                      {INCIDENTE_ESTADOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Responsables
                    <input
                      type="text"
                      value={row.responsables}
                      onChange={(e) =>
                        patchRow(row.localId, { responsables: e.target.value })
                      }
                      placeholder="Nombre / Nombre"
                    />
                  </label>
                  <label className="agro-insp-span2">
                    Link evidencia
                    <input
                      type="url"
                      value={row.link}
                      onChange={(e) =>
                        patchRow(row.localId, { link: e.target.value })
                      }
                      placeholder="https://…"
                    />
                  </label>
                  <label className="agro-insp-span-all">
                    Descripción incidente
                    <textarea
                      rows={2}
                      value={row.descripcion}
                      onChange={(e) =>
                        patchRow(row.localId, { descripcion: e.target.value })
                      }
                      placeholder="Qué se observó…"
                    />
                  </label>
                  <label className="agro-insp-span-all">
                    Comentarios
                    <textarea
                      rows={2}
                      value={row.comentarios}
                      onChange={(e) =>
                        patchRow(row.localId, { comentarios: e.target.value })
                      }
                      placeholder="Incidente CSA / interno…"
                    />
                  </label>
                  <label className="agro-insp-span-all">
                    Acciones realizadas
                    <textarea
                      rows={2}
                      value={row.accionesRealizadas}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          accionesRealizadas: e.target.value,
                        })
                      }
                      placeholder="Limpieza, evidencia, seguimiento…"
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
            {filteredRecords.length} de {records.length} incidentes Agroprogreso
            · fuente hoja Incidentes.
          </p>
        </div>

        <div
          className="agro-table-filters"
          role="search"
          aria-label="Filtros de incidentes"
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
              {AGRO_INCIDENTE_SEDES.map((s) => (
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
              {INCIDENTE_ESTADOS.map((s) => (
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
                <th>Fecha</th>
                <th>Mes</th>
                <th>Sede</th>
                <th>Instrumento</th>
                <th>Descripción</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Responsables</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="alicon-empty">
                    No hay registros con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td>{row.fecha}</td>
                    <td>{monthFromFecha(row.fecha) ?? row.mesTexto}</td>
                    <td>{row.plantaSede}</td>
                    <td>{row.instrumento || '—'}</td>
                    <td className="agro-obs-cell">{row.descripcion || '—'}</td>
                    <td>{formatPctFromValor(row.valorIncidente)}</td>
                    <td>
                      <span
                        className={
                          row.estado.toLowerCase() === 'abierto'
                            ? 'agro-badge-warn'
                            : 'agro-badge-ok'
                        }
                      >
                        {row.estado || '—'}
                      </span>
                    </td>
                    <td>{row.responsables || '—'}</td>
                    <td>
                      {row.link ? (
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary-link"
                        >
                          Abrir
                        </a>
                      ) : (
                        '—'
                      )}
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
