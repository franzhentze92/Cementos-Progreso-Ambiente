import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Droplets,
  Loader2,
  Save,
  Sprout,
} from 'lucide-react'
import {
  AGRO_MONITOREO_PUNTOS,
  AGRO_MONITOREO_SEDES,
  AGRO_TIPOS_AGUA,
  CUMPLE_OPCIONES,
  MONITORING_MONTHS,
  cumpleCountForMonth,
  emptyHeader,
  emptyParamRows,
  formFromRecords,
  formatNum,
  monthFromFecha,
  monthHasMonitoreo,
  yearFromFecha,
  type AgroMonitoreoHeader,
  type AgroMonitoreoParamRow,
  type AgroMonitoreoRecord,
  type MonitoringMonth,
} from '../data/agroMonitoreos'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import {
  loadAgroMonitoreos,
  saveAgroMonitoreoMuestreo,
} from '../lib/agroMonitoreosApi'
import { MonitoreoLabImport } from '../components/MonitoreoLabImport'

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

export function AgroMonitoreosPage() {
  const [records, setRecords] = useState<AgroMonitoreoRecord[]>([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [header, setHeader] = useState<AgroMonitoreoHeader>(() =>
    emptyHeader(currentMonitoringYear(), currentMonitoringMonth()),
  )
  const [paramRows, setParamRows] = useState<AgroMonitoreoParamRow[]>(() =>
    emptyParamRows(),
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [filterYear, setFilterYear] = useState<string>(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState<string>(FILTER_ALL)
  const [filterSede, setFilterSede] = useState<string>(FILTER_ALL)
  const [filterCumple, setFilterCumple] = useState<string>(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await loadAgroMonitoreos()
      setRecords(data)
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los monitoreos de cumplimiento / control',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    const form = formFromRecords(records, year, month)
    setHeader(form.header)
    setParamRows(form.rows)
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
      if (monthHasMonitoreo(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const monthStats = useMemo(
    () => cumpleCountForMonth(records, year, month),
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
      if (filterCumple !== FILTER_ALL && row.cumple !== filterCumple)
        return false
      return true
    })
  }, [records, filterYear, filterMonth, filterSede, filterCumple])

  function patchHeader(patch: Partial<AgroMonitoreoHeader>) {
    setHeader((h) => ({ ...h, ...patch }))
  }

  function patchParam(
    localId: string,
    patch: Partial<AgroMonitoreoParamRow>,
  ) {
    setParamRows((rows) =>
      rows.map((row) =>
        row.localId === localId ? { ...row, ...patch } : row,
      ),
    )
  }

  async function persist() {
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveAgroMonitoreoMuestreo(
        year,
        month,
        header,
        paramRows,
      )
      setRecords((prev) => {
        const fecha = saved[0]?.fecha
        const sede = header.plantaSede.trim()
        const punto = header.puntoMuestreo.trim()
        const rest = prev.filter(
          (r) =>
            !(
              fecha &&
              r.fecha === fecha &&
              r.plantaSede === sede &&
              r.puntoMuestreo === punto
            ),
        )
        return [...rest, ...saved].sort((a, b) =>
          a.fecha === b.fecha
            ? a.parametro.localeCompare(b.parametro)
            : b.fecha.localeCompare(a.fecha),
        )
      })
      setSaveOk(true)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'No se pudo guardar el muestreo',
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
        <p>Cargando monitoreos de cumplimiento / control…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry agro-monitoreos-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Sprout size={14} />
            Entrada de Datos · Agroprogreso
          </p>
          <h1>Monitoreos de cumplimiento / control</h1>
          <p>
            Resultados de laboratorio y muestreos de control. Distinto del{' '}
            <Link to="/monitoreo-en-vivo">monitoreo en vivo</Link>. Puedes
            capturar a mano o cargar el PDF del laboratorio.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/monitoreo-ambiental"
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
            {saving ? 'Guardando…' : 'Guardar muestreo'}
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

      <MonitoreoLabImport
        year={year}
        month={month}
        expectedUnidad="Agroprogreso"
        reportHref="/operaciones/monitoreo-ambiental"
        hint="Opción A: sube un PDF de Agroprogreso y pulsa «Guardar todo el informe». Opción B: llena el formulario de agua y usa «Guardar muestreo». PDFs de Alicón (aire/ruido) también se pueden guardar aquí, pero se ven en el reporte Alicón."
        onApply={({ header: h, rows, year: y, month: m }) => {
          setYear(y)
          setMonth(m)
          setHeader(h)
          setParamRows(rows)
          setSaveOk(false)
          setSaveError(null)
        }}
        onSaved={(result) => {
          if (result.unidadNegocio === 'Agroprogreso') {
            void reload()
            setSaveOk(true)
          }
        }}
      />

      <div className="entry-summary hc-summary">
        <div>
          <span>Fuente</span>
          <strong>Laboratorio / captura</strong>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {month} {year}
          </strong>
        </div>
        <div>
          <span>Cumplen / No</span>
          <strong>
            {monthStats.si}/{monthStats.no}
          </strong>
        </div>
        <div>
          <span>Parámetros</span>
          <strong>{paramRows.length}</strong>
        </div>
      </div>

      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="hc-month-bar">
          <div className="agro-agua-period">
            <label htmlFor="agro-mon-year">Año</label>
            <select
              id="agro-mon-year"
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
          <div className="entry-section-head">
            <div>
              <h2>
                <Droplets size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
                Datos del muestreo
              </h2>
              <p>
                Fecha, sede, punto y coordenadas aplicadas a todos los
                parámetros.
              </p>
            </div>
          </div>

          <div className="agro-insp-grid agro-mon-header">
            <label>
              Día
              <select
                value={header.dia}
                onChange={(e) => patchHeader({ dia: e.target.value })}
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
                value={header.plantaSede}
                onChange={(e) => patchHeader({ plantaSede: e.target.value })}
              >
                {AGRO_MONITOREO_SEDES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Punto de muestreo
              <select
                value={header.puntoMuestreo}
                onChange={(e) =>
                  patchHeader({ puntoMuestreo: e.target.value })
                }
              >
                {AGRO_MONITOREO_PUNTOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {header.puntoMuestreo &&
                !(AGRO_MONITOREO_PUNTOS as readonly string[]).includes(
                  header.puntoMuestreo,
                ) ? (
                  <option value={header.puntoMuestreo}>
                    {header.puntoMuestreo}
                  </option>
                ) : null}
              </select>
            </label>
            <label>
              Tipo de agua
              <select
                value={header.tipoAgua}
                onChange={(e) => patchHeader({ tipoAgua: e.target.value })}
              >
                {AGRO_TIPOS_AGUA.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Latitud
              <input
                type="text"
                inputMode="decimal"
                value={header.latitud}
                onChange={(e) => patchHeader({ latitud: e.target.value })}
              />
            </label>
            <label>
              Longitud
              <input
                type="text"
                inputMode="decimal"
                value={header.longitud}
                onChange={(e) => patchHeader({ longitud: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="entry-section">
          <div className="entry-section-head">
            <div>
              <h2>Parámetros del muestreo</h2>
              <p>
                Plantilla fija del Excel · solo edita resultado, unidad, límite,
                cumple y observaciones.
              </p>
            </div>
          </div>

          <div className="alicon-table-wrap">
            <table className="alicon-data-table agro-residuos-grid">
              <thead>
                <tr>
                  <th>Parámetro</th>
                  <th>Resultado</th>
                  <th>Unidad</th>
                  <th>Límite permisible</th>
                  <th>Cumple</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {paramRows.map((row) => (
                  <tr key={row.localId}>
                    <td>{row.parametro}</td>
                    <td>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.resultado}
                        onChange={(e) =>
                          patchParam(row.localId, {
                            resultado: e.target.value,
                          })
                        }
                        placeholder="—"
                        aria-label={`Resultado ${row.parametro}`}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.unidad}
                        onChange={(e) =>
                          patchParam(row.localId, { unidad: e.target.value })
                        }
                        placeholder="—"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.limitePermisible}
                        onChange={(e) =>
                          patchParam(row.localId, {
                            limitePermisible: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td>
                      <select
                        value={row.cumple}
                        onChange={(e) =>
                          patchParam(row.localId, { cumple: e.target.value })
                        }
                      >
                        {CUMPLE_OPCIONES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.observaciones}
                        onChange={(e) =>
                          patchParam(row.localId, {
                            observaciones: e.target.value,
                          })
                        }
                        placeholder="—"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </form>

      <section className="entry-section agro-records-section">
        <div className="entry-section-head">
          <h2>Datos registrados</h2>
          <p>
            {filteredRecords.length} de {records.length} parámetros · fuente
            Monitoreos ambientales.
          </p>
        </div>

        <div
          className="agro-table-filters"
          role="search"
          aria-label="Filtros de monitoreo"
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
              {AGRO_MONITOREO_SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cumple
            <select
              value={filterCumple}
              onChange={(e) => setFilterCumple(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {CUMPLE_OPCIONES.map((c) => (
                <option key={c} value={c}>
                  {c}
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
                <th>Punto</th>
                <th>Parámetro</th>
                <th>Resultado</th>
                <th>Límite</th>
                <th>Cumple</th>
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
                    <td>{row.fecha}</td>
                    <td>{monthFromFecha(row.fecha) ?? '—'}</td>
                    <td>{row.plantaSede}</td>
                    <td>{row.puntoMuestreo}</td>
                    <td>{row.parametro}</td>
                    <td>{formatNum(row.resultado)}</td>
                    <td>{row.limitePermisible || '—'}</td>
                    <td>
                      <span
                        className={
                          row.cumple.toLowerCase() === 'no'
                            ? 'agro-badge-warn'
                            : 'agro-badge-ok'
                        }
                      >
                        {row.cumple || '—'}
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
