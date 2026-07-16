import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Gauge,
  Loader2,
  Save,
  Sprout,
} from 'lucide-react'
import {
  AGRO_NDA_SEDES,
  MONITORING_MONTHS,
  defaultMonthRows,
  fechaFromYearMonth,
  formRowsFromRecords,
  formatNum,
  monthFromFecha,
  monthHasNda,
  ndaFromFormRow,
  yearFromFecha,
  type AgroNdaGeneralFormRow,
  type AgroNdaGeneralRecord,
  type MonitoringMonth,
} from '../data/agroNdaGeneral'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import {
  loadAgroNdaGeneral,
  saveAgroNdaGeneralMonth,
} from '../lib/agroNdaGeneralApi'

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
            className={`hc-month-pill ${isActive ? 'active' : ''} ${has ? 'filled' : ''} ${has ? 'has-qty' : ''}`}
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

export function AgroNdaGeneralPage() {
  const [records, setRecords] = useState<AgroNdaGeneralRecord[]>([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [formRows, setFormRows] = useState<AgroNdaGeneralFormRow[]>(() =>
    defaultMonthRows(),
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [filterYear, setFilterYear] = useState(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState(FILTER_ALL)
  const [filterSede, setFilterSede] = useState(FILTER_ALL)

  const fecha = fechaFromYearMonth(year, month)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      setRecords(await loadAgroNdaGeneral())
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'No se pudo cargar NDA General',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    setFormRows(formRowsFromRecords(records, fecha))
  }, [records, fecha])

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
      if (monthHasNda(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const monthAvgNda = useMemo(() => {
    const vals = formRows
      .map(ndaFromFormRow)
      .filter((n): n is number => n != null)
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }, [formRows])

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const y = yearFromFecha(row.fecha)
      const m = monthFromFecha(row.fecha)
      if (filterYear !== FILTER_ALL && String(y) !== filterYear) return false
      if (filterMonth !== FILTER_ALL && m !== filterMonth) return false
      if (filterSede !== FILTER_ALL && row.plantaSede !== filterSede)
        return false
      return true
    })
  }, [records, filterYear, filterMonth, filterSede])

  function patchRow(
    localId: string,
    patch: Partial<AgroNdaGeneralFormRow>,
  ) {
    setFormRows((rows) =>
      rows.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    )
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveAgroNdaGeneralMonth(fecha, month, formRows)
      setRecords((prev) => {
        const rest = prev.filter((r) => r.fecha !== fecha)
        return [...rest, ...saved].sort(
          (a, b) =>
            b.fecha.localeCompare(a.fecha) ||
            a.plantaSede.localeCompare(b.plantaSede),
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
        <p>Cargando NDA General…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-nda-general-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · Agroprogreso
          </p>
          <h1>NDA General</h1>
          <p>
            Réplica de la hoja <strong>AGRO NDA</strong>. Puntajes mensuales
            por sede: IDA 40%, Casco verde 30%, Incidentes 15%, Compromisos
            15%.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/agroprogreso/nda-general"
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
          <strong>AGRO NDA</strong>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {month} {year}
          </strong>
        </div>
        <div>
          <span>NDA promedio mes</span>
          <strong>
            {monthAvgNda == null ? '—' : formatNum(monthAvgNda, 1)}
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
            <label htmlFor="agro-nda-year">Año</label>
            <select
              id="agro-nda-year"
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
            <span className="agro-fecha-chip">{fecha}</span>
          </div>
          <MonthRail month={month} onChange={setMonth} filled={filledMonths} />
        </div>

        <section className="entry-section">
          <div className="entry-section-head">
            <div>
              <h2>
                <Gauge
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Puntajes del mes
              </h2>
              <p>
                Completa los 4 componentes; el NDA se calcula solo. Deja vacío
                si la sede no aplica en el mes.
              </p>
            </div>
          </div>

          <div className="agro-insp-cards">
            {formRows.map((row) => {
              const nda = ndaFromFormRow(row)
              return (
                <article key={row.localId} className="agro-insp-card">
                  <header>
                    <strong>{row.plantaSede}</strong>
                    <span className="agro-lic-chip">
                      NDA {nda == null ? '—' : formatNum(nda, 1)}
                    </span>
                  </header>
                  <div className="agro-insp-grid">
                    <label className="agro-insp-span2">
                      Proyecto matriz
                      <input
                        value={row.proyectoMatriz}
                        onChange={(e) =>
                          patchRow(row.localId, {
                            proyectoMatriz: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      IDA (40%)
                      <input
                        value={row.notaIda}
                        onChange={(e) =>
                          patchRow(row.localId, { notaIda: e.target.value })
                        }
                        inputMode="decimal"
                        placeholder="—"
                      />
                    </label>
                    <label>
                      Casco verde (30%)
                      <input
                        value={row.cascoVerde}
                        onChange={(e) =>
                          patchRow(row.localId, {
                            cascoVerde: e.target.value,
                          })
                        }
                        inputMode="decimal"
                        placeholder="—"
                      />
                    </label>
                    <label>
                      Incidentes (15%)
                      <input
                        value={row.incidentes}
                        onChange={(e) =>
                          patchRow(row.localId, {
                            incidentes: e.target.value,
                          })
                        }
                        inputMode="decimal"
                        placeholder="—"
                      />
                    </label>
                    <label>
                      Compromisos (15%)
                      <input
                        value={row.compromisos}
                        onChange={(e) =>
                          patchRow(row.localId, {
                            compromisos: e.target.value,
                          })
                        }
                        inputMode="decimal"
                        placeholder="—"
                      />
                    </label>
                  </div>
                </article>
              )
            })}
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
              {filteredRecords.length} de {records.length} registros
            </p>
          </div>
        </div>

        <div className="agro-table-filters" aria-label="Filtros NDA">
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
              {AGRO_NDA_SEDES.map((s) => (
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
                <th>IDA</th>
                <th>Casco</th>
                <th>Inc.</th>
                <th>Comp.</th>
                <th>NDA</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-exp">{row.fecha}</td>
                    <td className="agro-lic-sede">{row.plantaSede}</td>
                    <td className="agro-lic-name">
                      {row.proyectoMatriz || '—'}
                    </td>
                    <td className="agro-lic-cat">
                      {formatNum(row.notaIda, 0)}
                    </td>
                    <td className="agro-lic-cat">
                      {formatNum(row.cascoVerde, 0)}
                    </td>
                    <td className="agro-lic-cat">
                      {formatNum(row.incidentes, 0)}
                    </td>
                    <td className="agro-lic-cat">
                      {formatNum(row.compromisos, 0)}
                    </td>
                    <td className="agro-lic-cat">
                      <span className="agro-lic-chip">
                        {formatNum(row.nda, 1)}
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
