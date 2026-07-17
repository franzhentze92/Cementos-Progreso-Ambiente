import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Save,
  Ship,
  Trash2,
} from 'lucide-react'
import {
  ACCION_INMEDIATA,
  DESCARGA_BARCOS_INSPECCION_SEDES,
  MATERIALES_DESCARGA,
  MONITORING_MONTHS,
  NIVELES_RIESGO,
  avgResultadoForMonth,
  emptyDescargaBarcosInspeccionRow,
  formRowsFromRecords,
  formatNum,
  monthFromFecha,
  monthHasInspections,
  type AgroInspeccionFormRow,
  type AgroInspeccionRecord,
  type MonitoringMonth,
} from '../data/descargaBarcosInspecciones'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import {
  loadDescargaBarcosInspecciones,
  saveDescargaBarcosInspeccionesMonth,
} from '../lib/descargaBarcosInspeccionesApi'
import { InspeccionAbrirLink } from '../components/InspeccionAbrirLink'

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

export function DescargaBarcosInspeccionesPage() {
  const [records, setRecords] = useState<AgroInspeccionRecord[]>([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [formRows, setFormRows] = useState<AgroInspeccionFormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [filterYear, setFilterYear] = useState<string>(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState<string>(FILTER_ALL)
  const [filterSede, setFilterSede] = useState<string>(FILTER_ALL)
  const [filterRiesgo, setFilterRiesgo] = useState<string>(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await loadDescargaBarcosInspecciones()
      setRecords(data)
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar las inspecciones',
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
    setFormRows(rows.length ? rows : [emptyDescargaBarcosInspeccionRow(year, month)])
  }, [records, year, month])

  useEffect(() => {
    if (!saveOk) return
    const t = window.setTimeout(() => setSaveOk(false), 3500)
    return () => window.clearTimeout(t)
  }, [saveOk])

  const years = useMemo(
    () => selectableMonitoringYears(records.map((r) => r.anio)),
    [records],
  )

  const recordYears = useMemo(
    () => [...new Set(records.map((r) => r.anio))].sort((a, b) => b - a),
    [records],
  )

  const filledMonths = useMemo(() => {
    const set = new Set<MonitoringMonth>()
    for (const m of MONITORING_MONTHS) {
      if (monthHasInspections(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const monthAvg = useMemo(
    () => avgResultadoForMonth(records, year, month),
    [records, year, month],
  )

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      if (filterYear !== FILTER_ALL && String(row.anio) !== filterYear)
        return false
      if (filterMonth !== FILTER_ALL && row.mes !== filterMonth) return false
      if (filterSede !== FILTER_ALL && row.plantaSede !== filterSede)
        return false
      if (filterRiesgo !== FILTER_ALL && row.nivelRiesgo !== filterRiesgo)
        return false
      return true
    })
  }, [records, filterYear, filterMonth, filterSede, filterRiesgo])

  function patchRow(
    localId: string,
    patch: Partial<AgroInspeccionFormRow>,
  ) {
    setFormRows((rows) =>
      rows.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    )
  }

  function addRow() {
    setFormRows((rows) => [...rows, emptyDescargaBarcosInspeccionRow(year, month)])
  }

  function removeRow(localId: string) {
    setFormRows((rows) => {
      const next = rows.filter((r) => r.localId !== localId)
      return next.length ? next : [emptyDescargaBarcosInspeccionRow(year, month)]
    })
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const toSave = formRows.filter(
        (r) =>
          r.plantaSede.trim() &&
          r.materialDescarga.trim() &&
          (r.resultadoGeneral.trim() ||
            r.observaciones.trim() ||
            r.link.trim() ||
            r.id),
      )
      const saved = await saveDescargaBarcosInspeccionesMonth(year, month, toSave)
      setRecords((prev) => {
        const rest = prev.filter((r) => !(r.anio === year && r.mes === month))
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
        <p>Cargando inspecciones Descarga Barcos…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-inspecciones-page alicon-inspecciones-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Ship size={14} />
            Entrada de Datos · Descarga Barcos
          </p>
          <h1>Inspecciones</h1>
          <p>
            Réplica de la hoja <strong>Ejecuciones inspecciones</strong> (solo
            sede Descarga Barcos). Captura por mes: día, resultado, hallazgos y
            evidencias.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/descarga-barcos/inspeccion-ambiental"
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
          <strong>Ejecuciones inspecciones</strong>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {month} {year}
          </strong>
        </div>
        <div>
          <span>Resultado prom.</span>
          <strong>{formatNum(monthAvg, 1)}</strong>
        </div>
        <div>
          <span>Inspecciones mes</span>
          <strong>{formRows.length}</strong>
        </div>
      </div>

      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="hc-month-bar">
          <div className="agro-agua-period">
            <label htmlFor="alicon-insp-year">Año</label>
            <select
              id="alicon-insp-year"
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
                <ClipboardList size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
                Inspecciones del mes
              </h2>
              <p>
                Completa día, material (Clinker/Coque), resultado (0–100),
                hallazgos, riesgo y observaciones. La semana y fecha se calculan
                al guardar.
              </p>
            </div>
            <button type="button" className="btn-secondary-link" onClick={addRow}>
              <Plus size={16} />
              Agregar inspección
            </button>
          </div>

          <div className="agro-insp-cards">
            {formRows.map((row, idx) => (
              <article key={row.localId} className="agro-insp-card">
                <header>
                  <strong>Inspección {idx + 1}</strong>
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
                    Material descargado
                    <select
                      value={row.materialDescarga}
                      required
                      onChange={(e) =>
                        patchRow(row.localId, {
                          materialDescarga: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccionar…</option>
                      {MATERIALES_DESCARGA.map((m) => (
                        <option key={m} value={m}>
                          {m}
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
                      {DESCARGA_BARCOS_INSPECCION_SEDES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.plantaSede &&
                      !(DESCARGA_BARCOS_INSPECCION_SEDES as readonly string[]).includes(
                        row.plantaSede,
                      ) ? (
                        <option value={row.plantaSede}>{row.plantaSede}</option>
                      ) : null}
                    </select>
                  </label>
                  <label>
                    Responsable
                    <input
                      type="text"
                      value={row.responsable}
                      onChange={(e) =>
                        patchRow(row.localId, { responsable: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Resultado general
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.resultadoGeneral}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          resultadoGeneral: e.target.value,
                        })
                      }
                      placeholder="0–100"
                    />
                  </label>
                  <label>
                    No. de hallazgos
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.numHallazgos}
                      onChange={(e) =>
                        patchRow(row.localId, { numHallazgos: e.target.value })
                      }
                      placeholder="0"
                    />
                  </label>
                  <label>
                    Nivel de riesgo
                    <select
                      value={row.nivelRiesgo}
                      onChange={(e) =>
                        patchRow(row.localId, { nivelRiesgo: e.target.value })
                      }
                    >
                      {NIVELES_RIESGO.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Acción inmediata
                    <select
                      value={row.requiereAccionInmediata}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          requiereAccionInmediata: e.target.value,
                        })
                      }
                    >
                      {ACCION_INMEDIATA.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="agro-insp-span2">
                    Link informe
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
                    Observaciones
                    <textarea
                      rows={2}
                      value={row.observaciones}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          observaciones: e.target.value,
                        })
                      }
                      placeholder="Hallazgos, seguimiento, acuerdos…"
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
            {filteredRecords.length} de {records.length} inspecciones
            Descarga Barcos · fuente Ejecuciones inspecciones.
          </p>
        </div>

        <div
          className="agro-table-filters"
          role="search"
          aria-label="Filtros de inspecciones"
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
              {DESCARGA_BARCOS_INSPECCION_SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Riesgo
            <select
              value={filterRiesgo}
              onChange={(e) => setFilterRiesgo(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {NIVELES_RIESGO.map((n) => (
                <option key={n} value={n}>
                  {n}
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
                <th>Material</th>
                <th>Sede</th>
                <th>Responsable</th>
                <th>Resultado</th>
                <th>Hallazgos</th>
                <th>Riesgo</th>
                <th>Acción</th>
                <th>Observaciones</th>
                <th>Informe</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="alicon-empty">
                    No hay registros con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td>{row.fecha}</td>
                    <td>{monthFromFecha(row.fecha) ?? row.mes}</td>
                    <td>{row.materialDescarga || '—'}</td>
                    <td>{row.plantaSede}</td>
                    <td>{row.responsable || '—'}</td>
                    <td>{formatNum(row.resultadoGeneral, 0)}</td>
                    <td>{formatNum(row.numHallazgos, 0)}</td>
                    <td>{row.nivelRiesgo || '—'}</td>
                    <td>{row.requiereAccionInmediata || '—'}</td>
                    <td className="agro-obs-cell">
                      {row.observaciones || '—'}
                    </td>
                    <td>
                      <InspeccionAbrirLink
                        link={row.link}
                        fecha={row.fecha}
                        plantaSede={row.plantaSede}
                        unidadNegocio={row.unidadNegocio}
                      />
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
