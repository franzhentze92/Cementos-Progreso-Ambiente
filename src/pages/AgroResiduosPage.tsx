import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Loader2,
  Save,
  Sprout,
} from 'lucide-react'
import {
  AGRO_RESIDUOS_SEDES,
  MONITORING_MONTHS,
  fechaFromYearMonth,
  formRowsFromRecords,
  formatNum,
  monthFromFecha,
  monthHasQuantity,
  monthHasRows,
  totalLbsForMonth,
  yearFromFecha,
  type AgroResiduosFormRow,
  type AgroResiduosRecord,
  type MonitoringMonth,
} from '../data/agroResiduos'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import {
  loadAgroResiduos,
  saveAgroResiduosMonth,
} from '../lib/agroResiduosApi'

function MonthRail({
  month,
  onChange,
  filled,
  withQty,
}: {
  month: MonitoringMonth
  onChange: (m: MonitoringMonth) => void
  filled: Set<MonitoringMonth>
  withQty: Set<MonitoringMonth>
}) {
  return (
    <div className="hc-month-rail" role="tablist" aria-label="Meses del año">
      {MONITORING_MONTHS.map((m) => {
        const short = m.slice(0, 3)
        const isActive = m === month
        const has = filled.has(m)
        const qty = withQty.has(m)
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`hc-month-pill ${isActive ? 'active' : ''} ${has ? 'filled' : ''} ${qty ? 'has-qty' : ''}`}
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

export function AgroResiduosPage() {
  const [records, setRecords] = useState<AgroResiduosRecord[]>([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [formRows, setFormRows] = useState<AgroResiduosFormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [filterYear, setFilterYear] = useState<string>(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState<string>(FILTER_ALL)
  const [filterSede, setFilterSede] = useState<string>(FILTER_ALL)
  const [filterRuta, setFilterRuta] = useState<string>(FILTER_ALL)

  const fecha = fechaFromYearMonth(year, month)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await loadAgroResiduos()
      setRecords(data)
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la gestión de residuos',
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

  const recordRutas = useMemo(
    () =>
      [...new Set(records.map((r) => r.rutaGestion).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [records],
  )

  const filledMonths = useMemo(() => {
    const set = new Set<MonitoringMonth>()
    for (const m of MONITORING_MONTHS) {
      if (monthHasRows(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const qtyMonths = useMemo(() => {
    const set = new Set<MonitoringMonth>()
    for (const m of MONITORING_MONTHS) {
      if (monthHasQuantity(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const formTotal = useMemo(() => {
    const vals = formRows
      .map((r) => Number(String(r.cantidadLbs).replace(',', '.')))
      .filter((n) => Number.isFinite(n))
    if (!vals.length) return totalLbsForMonth(records, year, month)
    return vals.reduce((a, b) => a + b, 0)
  }, [formRows, records, year, month])

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const y = yearFromFecha(row.fecha)
      const m = monthFromFecha(row.fecha)
      if (filterYear !== FILTER_ALL && String(y) !== filterYear) return false
      if (filterMonth !== FILTER_ALL && m !== filterMonth) return false
      if (filterSede !== FILTER_ALL && row.sede !== filterSede) return false
      if (filterRuta !== FILTER_ALL && row.rutaGestion !== filterRuta) return false
      return true
    })
  }, [records, filterYear, filterMonth, filterSede, filterRuta])

  const rowsBySede = useMemo(() => {
    const map = new Map<string, AgroResiduosFormRow[]>()
    for (const sede of AGRO_RESIDUOS_SEDES) map.set(sede, [])
    for (const row of formRows) {
      const list = map.get(row.sede) ?? []
      list.push(row)
      map.set(row.sede, list)
    }
    return map
  }, [formRows])

  function patchCantidad(localId: string, cantidadLbs: string) {
    setFormRows((rows) =>
      rows.map((row) =>
        row.localId === localId ? { ...row, cantidadLbs } : row,
      ),
    )
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveAgroResiduosMonth(fecha, formRows)
      setRecords((prev) => {
        const rest = prev.filter((r) => r.fecha !== fecha)
        return [...rest, ...saved].sort((a, b) =>
          a.fecha === b.fecha
            ? a.sede.localeCompare(b.sede) ||
              a.tipoResiduos.localeCompare(b.tipoResiduos)
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void persist()
  }

  if (loading) {
    return (
      <div className="entry-page hc-entry hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando gestión de residuos Agroprogreso…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-residuos-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · Agroprogreso
          </p>
          <h1>Gestión de residuos</h1>
          <p>
            Plantilla fija del Excel (misma estructura cada mes). Solo ingresa
            las <strong>cantidades en lbs</strong> y guarda.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/agroprogreso/gestion-de-residuos"
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
          <strong>AGRO Gestión de residuos fincas</strong>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {month} {year}
          </strong>
        </div>
        <div>
          <span>Total mes (lbs)</span>
          <strong>{formatNum(formTotal)}</strong>
        </div>
        <div>
          <span>Líneas plantilla</span>
          <strong>{formRows.length}</strong>
        </div>
      </div>

      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="hc-month-bar">
          <div className="agro-agua-period">
            <label htmlFor="agro-res-year">Año</label>
            <select
              id="agro-res-year"
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
          <MonthRail
            month={month}
            onChange={setMonth}
            filled={filledMonths}
            withQty={qtyMonths}
          />
        </div>

        {[...rowsBySede.entries()].map(([sede, sedeRows]) =>
          sedeRows.length === 0 ? null : (
            <section key={sede} className="entry-section">
              <div className="entry-section-head alicon-sheet-head">
                <div>
                  <h2>{sede}</h2>
                  <p>
                    Clasificación y ruta fijas · solo captura cantidad (lbs).
                  </p>
                </div>
              </div>

              <div className="alicon-table-wrap">
                <table className="alicon-data-table agro-residuos-table agro-residuos-grid">
                  <thead>
                    <tr>
                      <th>Clasificación operativa</th>
                      <th>Tipo de residuos</th>
                      <th>Clasificación técnica</th>
                      <th>Ruta de Gestión</th>
                      <th>Gestor/Planta</th>
                      <th>Cantidad (lbs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sedeRows.map((row) => (
                      <tr key={row.localId}>
                        <td>{row.clasificacionOperativa || '—'}</td>
                        <td>{row.tipoResiduos || '—'}</td>
                        <td>{row.clasificacionTecnica || '—'}</td>
                        <td>{row.rutaGestion || '—'}</td>
                        <td>{row.gestorPlanta || '—'}</td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.cantidadLbs}
                            onChange={(e) =>
                              patchCantidad(row.localId, e.target.value)
                            }
                            placeholder="—"
                            aria-label={`Cantidad ${row.tipoResiduos || row.clasificacionOperativa}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ),
        )}
      </form>

      <section className="entry-section agro-records-section">
        <div className="entry-section-head">
          <h2>Datos registrados</h2>
          <p>
            {filteredRecords.length} de {records.length} filas · fuente hoja AGRO
            Gestión de residuos fincas.
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
              {AGRO_RESIDUOS_SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ruta
            <select
              value={filterRuta}
              onChange={(e) => setFilterRuta(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas</option>
              {recordRutas.map((r) => (
                <option key={r} value={r}>
                  {r}
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
                <th>Clas. operativa</th>
                <th>Tipo</th>
                <th>Clas. técnica</th>
                <th>Cantidad (lbs)</th>
                <th>Ruta</th>
                <th>Gestor</th>
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
                    <td>{monthFromFecha(row.fecha) ?? '—'}</td>
                    <td>{row.sede}</td>
                    <td>{row.clasificacionOperativa || '—'}</td>
                    <td>{row.tipoResiduos || '—'}</td>
                    <td>{row.clasificacionTecnica || '—'}</td>
                    <td>{formatNum(row.cantidadLbs)}</td>
                    <td>{row.rutaGestion || '—'}</td>
                    <td>{row.gestorPlanta || '—'}</td>
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
