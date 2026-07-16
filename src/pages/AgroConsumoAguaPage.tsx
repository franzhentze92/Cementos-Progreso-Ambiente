import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Droplets,
  Loader2,
  Save,
  Sprout,
  Trash2,
} from 'lucide-react'
import {
  AGRO_SEDES,
  MONITORING_MONTHS,
  allSitioRows,
  fechaFromYearMonth,
  formatNum,
  formRowsFromRecords,
  monthFromFecha,
  monthHasData,
  totalConsumoForMonth,
  yearFromFecha,
  type AgroConsumoAguaRecord,
  type AgroConsumoFormRow,
  type AgroSede,
  type MonitoringMonth,
} from '../data/agroConsumoAgua'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import {
  deleteAgroConsumoAguaRecord,
  loadAgroConsumoAgua,
  saveAgroConsumoAguaMonth,
} from '../lib/agroConsumoAguaApi'

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

export function AgroConsumoAguaPage() {
  const [records, setRecords] = useState<AgroConsumoAguaRecord[]>([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [formRows, setFormRows] = useState<AgroConsumoFormRow[]>(() =>
    allSitioRows(),
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [filterYear, setFilterYear] = useState<string>(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState<string>(FILTER_ALL)
  const [filterSede, setFilterSede] = useState<string>(FILTER_ALL)
  const [filterSitio, setFilterSitio] = useState<string>(FILTER_ALL)

  const fecha = fechaFromYearMonth(year, month)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await loadAgroConsumoAgua()
      setRecords(data)
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'No se pudo cargar el consumo de agua',
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

  const sedeOptions = useMemo(
    () => Object.keys(AGRO_SEDES) as AgroSede[],
    [],
  )

  const sitioOptions = useMemo(() => {
    const all = new Set<string>()
    for (const sitios of Object.values(AGRO_SEDES)) {
      for (const s of sitios) all.add(s)
    }
    return [...all].sort((a, b) => a.localeCompare(b))
  }, [])

  const filledMonths = useMemo(() => {
    const set = new Set<MonitoringMonth>()
    for (const m of MONITORING_MONTHS) {
      if (monthHasData(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const monthTotal = useMemo(
    () => totalConsumoForMonth(records, year, month),
    [records, year, month],
  )

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const y = yearFromFecha(row.fecha)
      const m = monthFromFecha(row.fecha)
      if (filterYear !== FILTER_ALL && String(y) !== filterYear) return false
      if (filterMonth !== FILTER_ALL && m !== filterMonth) return false
      if (filterSede !== FILTER_ALL && row.sede !== filterSede) return false
      if (filterSitio !== FILTER_ALL && row.sitioConsumo !== filterSitio)
        return false
      return true
    })
  }, [records, filterYear, filterMonth, filterSede, filterSitio])

  function patchField(
    sede: AgroSede,
    sitioConsumo: string,
    consumoM3: string,
  ) {
    setFormRows((rows) =>
      rows.map((row) =>
        row.sede === sede && row.sitioConsumo === sitioConsumo
          ? { ...row, consumoM3 }
          : row,
      ),
    )
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveAgroConsumoAguaMonth(fecha, formRows)
      setRecords((prev) => {
        const rest = prev.filter((r) => r.fecha !== fecha)
        return [...rest, ...saved].sort((a, b) =>
          a.fecha === b.fecha
            ? a.sede.localeCompare(b.sede) ||
              a.sitioConsumo.localeCompare(b.sitioConsumo)
            : b.fecha.localeCompare(a.fecha),
        )
      })
      setSaveOk(true)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'No se pudo guardar el registro',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAgroConsumoAguaRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'No se pudo eliminar el registro',
      )
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
        <p>Cargando consumo de agua Agroprogreso…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-agua-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · Agroprogreso
          </p>
          <h1>Consumo de agua</h1>
          <p>
            Réplica de la hoja <strong>AGRO Consumo de agua</strong>. Elige año y
            mes, completa los sitios y guarda: cada mes se captura por separado
            (m³).
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/agroprogreso/consumo-de-agua"
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
          <strong>AGRO Consumo de agua</strong>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {month} {year}
          </strong>
        </div>
        <div>
          <span>Total mes (m³)</span>
          <strong>{formatNum(monthTotal)}</strong>
        </div>
        <div>
          <span>Registros cargados</span>
          <strong>{records.length}</strong>
        </div>
      </div>

      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="hc-month-bar">
          <div className="agro-agua-period">
            <label htmlFor="agro-year">Año</label>
            <select
              id="agro-year"
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

        <div className="entry-form-grid agro-agua-grid">
          <div className="entry-form-main">
            {(Object.entries(AGRO_SEDES) as [AgroSede, readonly string[]][]).map(
              ([sede, sitios]) => (
                <section key={sede} className="entry-section">
                  <div className="entry-section-head">
                    <h2>
                      <Droplets size={18} />
                      {sede}
                    </h2>
                    <p>Sitios de consumo registrados para {month} {year}.</p>
                  </div>
                  <div className="hc-field-grid">
                    {sitios.map((sitio) => {
                      const row = formRows.find(
                        (r) => r.sede === sede && r.sitioConsumo === sitio,
                      )
                      return (
                        <div key={sitio} className="form-field hc-field">
                          <label>
                            {sitio}
                            <span className="hc-unit">m³</span>
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row?.consumoM3 ?? ''}
                            onChange={(e) =>
                              patchField(sede, sitio, e.target.value)
                            }
                            placeholder="—"
                          />
                        </div>
                      )
                    })}
                  </div>
                </section>
              ),
            )}
          </div>

          <aside className="hc-year-glance agro-agua-glance" aria-label="Vista anual">
            <div className="hc-year-glance-head">
              <div>
                <h3>Consumo Bunker — {year}</h3>
                <p>Referencia rápida del Excel · clic en mes para editarlo.</p>
              </div>
            </div>
            <div className="hc-year-glance-scroll">
              <table className="hc-year-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Bunker (m³)</th>
                    <th>Total sedes (m³)</th>
                  </tr>
                </thead>
                <tbody>
                  {MONITORING_MONTHS.map((m) => (
                    <tr
                      key={m}
                      className={m === month ? 'is-current' : ''}
                      onClick={() => setMonth(m)}
                    >
                      <td>{m}</td>
                      <td>
                        {formatNum(
                          records.find(
                            (r) =>
                              r.fecha === fechaFromYearMonth(year, m) &&
                              r.sede === 'Finca El Pilar' &&
                              r.sitioConsumo === 'Bunker',
                          )?.consumoM3,
                        )}
                      </td>
                      <td>{formatNum(totalConsumoForMonth(records, year, m))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </aside>
        </div>
      </form>

      <section className="entry-section agro-records-section">
        <div className="entry-section-head">
          <h2>Datos registrados</h2>
          <p>
            {filteredRecords.length} de {records.length} filas · columnas Fecha,
            Mes, Sede, Sitio de consumo, Consumo (m³).
          </p>
        </div>

        <div className="agro-table-filters" role="search" aria-label="Filtros de registros">
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
              {sedeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sitio
            <select
              value={filterSitio}
              onChange={(e) => setFilterSitio(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {sitioOptions.map((s) => (
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
                <th>Sitio de consumo</th>
                <th>Consumo (m³)</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="alicon-empty">
                    No hay registros con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td>{row.fecha}</td>
                    <td>{monthFromFecha(row.fecha) ?? '—'}</td>
                    <td>{row.sede}</td>
                    <td>{row.sitioConsumo}</td>
                    <td>{formatNum(row.consumoM3)}</td>
                    <td className="alicon-row-actions">
                      <button
                        type="button"
                        className="alicon-icon-btn"
                        title="Eliminar registro"
                        aria-label={`Eliminar ${row.sede} ${row.sitioConsumo}`}
                        onClick={() => void handleDelete(row.id)}
                      >
                        <Trash2 size={15} />
                      </button>
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
