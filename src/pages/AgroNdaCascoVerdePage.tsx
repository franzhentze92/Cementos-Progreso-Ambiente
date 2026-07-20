import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  HardHat,
  Loader2,
  Plus,
  Save,
  Sprout,
  Trash2,
} from 'lucide-react'
import {
  AGRO_NDA_CV_INSPECTORES,
  AGRO_NDA_CV_SEDES,
  MONITORING_MONTHS,
  avgNotaForMonth,
  emptyCascoVerdeRow,
  formRowsFromRecords,
  formatNum,
  monthFromFecha,
  monthHasCascoVerde,
  yearFromFecha,
  type AgroNdaCascoVerdeFormRow,
  type AgroNdaCascoVerdeRecord,
  type MonitoringMonth,
} from '../data/agroNdaCascoVerde'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import {
  loadAgroNdaCascoVerde,
  saveAgroNdaCascoVerdeMonth,
} from '../lib/agroNdaCascoVerdeApi'

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

export function AgroNdaCascoVerdePage() {
  const [records, setRecords] = useState<AgroNdaCascoVerdeRecord[]>([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [formRows, setFormRows] = useState<AgroNdaCascoVerdeFormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [filterYear, setFilterYear] = useState(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState(FILTER_ALL)
  const [filterSede, setFilterSede] = useState(FILTER_ALL)
  const [filterInspector, setFilterInspector] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      setRecords(await loadAgroNdaCascoVerde())
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar NDA Casco Verde',
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
    const maxNo = records.reduce(
      (m, r) => Math.max(m, r.noInspeccion ?? 0),
      0,
    )
    setFormRows(rows.length ? rows : [emptyCascoVerdeRow(maxNo + 1)])
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
      if (monthHasCascoVerde(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const monthAvg = avgNotaForMonth(records, year, month)

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const y = yearFromFecha(row.fecha)
      const m = monthFromFecha(row.fecha)
      if (filterYear !== FILTER_ALL && String(y) !== filterYear) return false
      if (filterMonth !== FILTER_ALL && m !== filterMonth) return false
      if (filterSede !== FILTER_ALL && row.plantaSede !== filterSede)
        return false
      if (filterInspector !== FILTER_ALL && row.inspector !== filterInspector)
        return false
      return true
    })
  }, [records, filterYear, filterMonth, filterSede, filterInspector])

  function patchRow(
    localId: string,
    patch: Partial<AgroNdaCascoVerdeFormRow>,
  ) {
    setFormRows((rows) =>
      rows.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    )
  }

  function addRow() {
    const maxNo = Math.max(
      0,
      ...records.map((r) => r.noInspeccion ?? 0),
      ...formRows.map((r) => Number(r.noInspeccion) || 0),
    )
    setFormRows((rows) => [...rows, emptyCascoVerdeRow(maxNo + 1)])
  }

  function removeRow(localId: string) {
    setFormRows((rows) => {
      const next = rows.filter((r) => r.localId !== localId)
      return next.length ? next : [emptyCascoVerdeRow(1)]
    })
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const toSave = formRows.filter(
        (r) => r.plantaSede.trim() && r.inspector.trim(),
      )
      const saved = await saveAgroNdaCascoVerdeMonth(year, month, toSave)
      setRecords((prev) => {
        const rest = prev.filter((r) => {
          const m = monthFromFecha(r.fecha)
          return !(yearFromFecha(r.fecha) === year && m === month)
        })
        return [...rest, ...saved].sort((a, b) =>
          b.fecha.localeCompare(a.fecha),
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
        <p>Cargando NDA Casco Verde…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-casco-verde-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · NDA General · Agroprogreso
          </p>
          <h1>Inspecciones casco verde</h1>
          <p>
            Réplica de la hoja <strong>AGRO NDA Casco verde</strong>. Captura
            por mes: sede, inspector, nota, hallazgos y observaciones.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/entrada-datos/nda-general?proyecto=agroprogreso"
            className="btn-secondary-link"
          >
            <ArrowLeft size={16} />
            Volver a NDA General
          </Link>
          <Link
            to="/operaciones/nda-casco-verde?proyecto=agroprogreso"
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
            {saving ? 'Guardando…' : 'Guardar mes'}
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
          <strong>AGRO NDA Casco verde</strong>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {month} {year}
          </strong>
        </div>
        <div>
          <span>Nota promedio mes</span>
          <strong>
            {monthAvg == null ? '—' : formatNum(monthAvg, 1)}
          </strong>
        </div>
        <div>
          <span>Registros</span>
          <strong>{records.length}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="hc-month-bar">
          <div className="agro-agua-period">
            <label htmlFor="agro-cv-year">Año</label>
            <select
              id="agro-cv-year"
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
                <HardHat
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Inspecciones del mes
              </h2>
              <p>
                Tipo fijo: Casco Verde. La semana se calcula automáticamente
                desde la fecha.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary-link"
              onClick={addRow}
            >
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
                    No. inspección
                    <input
                      value={row.noInspeccion}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          noInspeccion: e.target.value,
                        })
                      }
                      inputMode="numeric"
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
                      {AGRO_NDA_CV_SEDES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.plantaSede &&
                      !(AGRO_NDA_CV_SEDES as readonly string[]).includes(
                        row.plantaSede,
                      ) ? (
                        <option value={row.plantaSede}>{row.plantaSede}</option>
                      ) : null}
                    </select>
                  </label>
                  <label>
                    Inspector / Responsable
                    <select
                      value={row.inspector}
                      onChange={(e) =>
                        patchRow(row.localId, { inspector: e.target.value })
                      }
                    >
                      {AGRO_NDA_CV_INSPECTORES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.inspector &&
                      !(AGRO_NDA_CV_INSPECTORES as readonly string[]).includes(
                        row.inspector as (typeof AGRO_NDA_CV_INSPECTORES)[number],
                      ) ? (
                        <option value={row.inspector}>{row.inspector}</option>
                      ) : null}
                    </select>
                  </label>
                  <label>
                    Nota
                    <input
                      value={row.nota}
                      onChange={(e) =>
                        patchRow(row.localId, { nota: e.target.value })
                      }
                      inputMode="decimal"
                      placeholder="0–100"
                    />
                  </label>
                  <label>
                    Hallazgos críticos
                    <input
                      value={row.hallazgosCriticos}
                      onChange={(e) =>
                        patchRow(row.localId, {
                          hallazgosCriticos: e.target.value,
                        })
                      }
                      inputMode="numeric"
                    />
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
                  <label className="agro-insp-span-all">
                    Link informe
                    <input
                      value={row.link}
                      onChange={(e) =>
                        patchRow(row.localId, { link: e.target.value })
                      }
                      placeholder="https://…"
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
            {saving ? 'Guardando…' : 'Guardar mes'}
          </button>
        </div>
      </form>

      <section className="entry-section">
        <div className="entry-section-head">
          <div>
            <h2>Histórico</h2>
            <p>
              {filteredRecords.length} de {records.length} inspecciones
            </p>
          </div>
        </div>

        <div className="agro-table-filters" aria-label="Filtros Casco Verde">
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
              {AGRO_NDA_CV_SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Inspector
            <select
              value={filterInspector}
              onChange={(e) => setFilterInspector(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {AGRO_NDA_CV_INSPECTORES.map((s) => (
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
                <th>Sem.</th>
                <th>Sede</th>
                <th>No.</th>
                <th>Inspector</th>
                <th>Nota</th>
                <th>Hall.</th>
                <th>Obs.</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-exp">{row.fecha}</td>
                    <td className="agro-lic-cat">
                      {row.semana ?? '—'}
                    </td>
                    <td className="agro-lic-sede">{row.plantaSede}</td>
                    <td className="agro-lic-cat">
                      {row.noInspeccion ?? '—'}
                    </td>
                    <td className="agro-lic-name">{row.inspector}</td>
                    <td className="agro-lic-cat">
                      <span className="agro-lic-chip">
                        {formatNum(row.nota, 0)}
                      </span>
                    </td>
                    <td className="agro-lic-cat">{row.hallazgosCriticos}</td>
                    <td className="agro-obs-cell">{row.observaciones}</td>
                    <td>
                      {row.link ? (
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary-link"
                          title="Abrir informe"
                        >
                          <ExternalLink size={14} />
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
