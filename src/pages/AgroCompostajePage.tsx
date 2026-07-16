import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Loader2,
  Recycle,
  Save,
  Sprout,
} from 'lucide-react'
import {
  AGRO_COMPOSTAJE_FINCAS,
  MONITORING_MONTHS,
  emptyMonthRows,
  fechaFromYearMonth,
  formatNum,
  formRowsFromRecords,
  monthFromFecha,
  monthHasData,
  totalForFormRows,
  yearFromFecha,
  type AgroCompostajeFormRow,
  type AgroCompostajeRecord,
  type MonitoringMonth,
} from '../data/agroCompostaje'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import {
  loadAgroCompostaje,
  saveAgroCompostajeMonth,
} from '../lib/agroCompostajeApi'

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

export function AgroCompostajePage() {
  const [records, setRecords] = useState<AgroCompostajeRecord[]>([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [formRows, setFormRows] = useState<AgroCompostajeFormRow[]>(() =>
    emptyMonthRows(),
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [filterYear, setFilterYear] = useState(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState(FILTER_ALL)
  const [filterFinca, setFilterFinca] = useState(FILTER_ALL)

  const fecha = fechaFromYearMonth(year, month)
  const monthTotal = totalForFormRows(formRows)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      setRecords(await loadAgroCompostaje())
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el compostaje',
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
      if (monthHasData(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const y = yearFromFecha(row.fecha)
      const m = monthFromFecha(row.fecha)
      if (filterYear !== FILTER_ALL && String(y) !== filterYear) return false
      if (filterMonth !== FILTER_ALL && m !== filterMonth) return false
      if (filterFinca !== FILTER_ALL && row.finca !== filterFinca) return false
      return true
    })
  }, [records, filterYear, filterMonth, filterFinca])

  function patchFinca(finca: string, toneladas: string) {
    setFormRows((rows) =>
      rows.map((r) => (r.finca === finca ? { ...r, toneladas } : r)),
    )
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveAgroCompostajeMonth(fecha, formRows)
      setRecords((prev) => {
        const rest = prev.filter((r) => r.fecha !== fecha)
        return [...rest, ...saved].sort((a, b) =>
          b.fecha.localeCompare(a.fecha) || a.finca.localeCompare(b.finca),
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
        <p>Cargando compostaje Agroprogreso…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-compostaje-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · Agroprogreso
          </p>
          <h1>Compostaje</h1>
          <p>
            Réplica de la hoja <strong>Compostaje desechos orgánicos</strong>.
            Toneladas mensuales por finca (El Pilar y San Miguel).
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/agroprogreso/compostaje"
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
          <strong>Compostaje desechos orgánicos</strong>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {month} {year}
          </strong>
        </div>
        <div>
          <span>Total mes</span>
          <strong>{formatNum(monthTotal, 2)} t</strong>
        </div>
        <div>
          <span>Registros</span>
          <strong>{records.length}</strong>
        </div>
      </div>

      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="hc-month-bar">
          <div className="agro-agua-period">
            <label htmlFor="agro-compost-year">Año</label>
            <select
              id="agro-compost-year"
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
                <Recycle
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Toneladas del mes
              </h2>
              <p>
                Desechos orgánicos compostados en {month} {year} (toneladas).
              </p>
            </div>
          </div>

          <div className="hc-field-grid agro-compost-fields">
            {formRows.map((row) => (
              <div key={row.finca} className="form-field hc-field">
                <label>
                  {row.finca}
                  <span className="hc-unit">t</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.toneladas}
                  onChange={(e) => patchFinca(row.finca, e.target.value)}
                  placeholder="—"
                />
              </div>
            ))}
            <div className="form-field hc-field agro-compost-total">
              <label>
                Total toneladas
                <span className="hc-unit">t</span>
              </label>
              <input
                type="text"
                value={formatNum(monthTotal, 2)}
                readOnly
                tabIndex={-1}
              />
            </div>
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

        <div className="agro-table-filters" aria-label="Filtros compostaje">
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
            Finca
            <select
              value={filterFinca}
              onChange={(e) => setFilterFinca(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {AGRO_COMPOSTAJE_FINCAS.map((f) => (
                <option key={f} value={f}>
                  {f}
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
                <th>Mes</th>
                <th>Finca</th>
                <th>Toneladas</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="agro-lic-empty">
                    Sin registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td className="agro-lic-exp">{row.fecha}</td>
                    <td className="agro-lic-sede">
                      {monthFromFecha(row.fecha) ?? '—'}
                    </td>
                    <td className="agro-lic-name">{row.finca}</td>
                    <td className="agro-lic-cat">
                      <span className="agro-lic-chip">
                        {formatNum(row.toneladas, 2)}
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
