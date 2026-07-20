import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Factory,
  Loader2,
  Plus,
  Save,
  Thermometer,
  Trash2,
} from 'lucide-react'
import {
  ALICON_MONITOREO_COMPARACIONES,
  ALICON_MONITOREO_ESTADOS,
  ALICON_MONITOREO_MOTIVOS,
  ALICON_MONITOREO_PARAMETROS,
  ALICON_MONITOREO_SEDES,
  ALICON_TIPOS_MONITOREO,
  MONITORING_MONTHS,
  countByEstadoMes,
  emptyAliconMonitoreoRow,
  formRowsFromRecords,
  monthFromFecha,
  monthHasMonitoreos,
  yearFromFecha,
  type AliconMonitoreoFormRow,
  type AliconMonitoreoRecord,
  type MonitoringMonth,
} from '../data/aliconMonitoreos'
import {
  CUMPLE_OPCIONES,
  formatNum as formatLabNum,
  monthFromFecha as labMonthFromFecha,
  yearFromFecha as labYearFromFecha,
  type AgroMonitoreoRecord,
} from '../data/agroMonitoreos'
import { LAB_MEDIOS, ALICON_LAB_PUNTOS } from '../data/labMonitoreosCatalog'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import { MonitoreoLabImport } from '../components/MonitoreoLabImport'
import { loadLabMonitoreosByUnidad } from '../lib/agroMonitoreosApi'
import {
  loadAliconMonitoreos,
  saveAliconMonitoreosMonth,
} from '../lib/aliconMonitoreosApi'

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
const LAB_UNIDAD = 'Alicón'

export function AliconMonitoreosPage() {
  const [labRecords, setLabRecords] = useState<AgroMonitoreoRecord[]>([])
  const [scheduleRecords, setScheduleRecords] = useState<
    AliconMonitoreoRecord[]
  >([])
  const [year, setYear] = useState(() => currentMonitoringYear())
  const [month, setMonth] = useState<MonitoringMonth>(() =>
    currentMonitoringMonth(),
  )
  const [formRows, setFormRows] = useState<AliconMonitoreoFormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [labSaveOk, setLabSaveOk] = useState<string | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)

  const [filterYear, setFilterYear] = useState<string>(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState<string>(FILTER_ALL)
  const [filterSede, setFilterSede] = useState<string>(FILTER_ALL)
  const [filterMedio, setFilterMedio] = useState<string>(FILTER_ALL)
  const [filterCumple, setFilterCumple] = useState<string>(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      const [lab, schedule] = await Promise.all([
        loadLabMonitoreosByUnidad(LAB_UNIDAD),
        loadAliconMonitoreos(),
      ])
      setLabRecords(lab)
      setScheduleRecords(schedule)
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar los monitoreos',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    const rows = formRowsFromRecords(scheduleRecords, year, month)
    setFormRows(rows.length ? rows : [emptyAliconMonitoreoRow(year, month)])
  }, [scheduleRecords, year, month])

  useEffect(() => {
    if (!saveOk) return
    const t = window.setTimeout(() => setSaveOk(false), 3500)
    return () => window.clearTimeout(t)
  }, [saveOk])

  const years = useMemo(
    () =>
      selectableMonitoringYears([
        ...labRecords.map((r) => labYearFromFecha(r.fecha)),
        ...scheduleRecords.map((r) => yearFromFecha(r.fechaInicio)),
      ]),
    [labRecords, scheduleRecords],
  )

  const recordYears = useMemo(
    () =>
      [...new Set(labRecords.map((r) => labYearFromFecha(r.fecha)))]
        .filter((y) => Number.isFinite(y) && y > 1900)
        .sort((a, b) => b - a),
    [labRecords],
  )

  const filledMonths = useMemo(() => {
    const set = new Set<MonitoringMonth>()
    for (const m of MONITORING_MONTHS) {
      if (monthHasMonitoreos(scheduleRecords, year, m)) set.add(m)
    }
    return set
  }, [scheduleRecords, year])

  const programadosMes = useMemo(
    () => countByEstadoMes(scheduleRecords, year, month, 'Programado'),
    [scheduleRecords, year, month],
  )

  const labSedespuntos = useMemo(() => {
    const sedes = new Set<string>([...ALICON_MONITOREO_SEDES])
    const puntos = new Set<string>([...ALICON_LAB_PUNTOS])
    for (const r of labRecords) {
      if (r.plantaSede) sedes.add(r.plantaSede)
      if (r.puntoMuestreo) puntos.add(r.puntoMuestreo)
    }
    return { sedes: [...sedes], puntos: [...puntos] }
  }, [labRecords])

  const filteredLab = useMemo(() => {
    return labRecords.filter((row) => {
      const medio = row.medio || row.tipoAgua || ''
      if (
        filterYear !== FILTER_ALL &&
        String(labYearFromFecha(row.fecha)) !== filterYear
      )
        return false
      if (
        filterMonth !== FILTER_ALL &&
        labMonthFromFecha(row.fecha) !== filterMonth
      )
        return false
      if (filterSede !== FILTER_ALL && row.plantaSede !== filterSede)
        return false
      if (filterMedio !== FILTER_ALL && medio !== filterMedio) return false
      if (
        filterCumple !== FILTER_ALL &&
        row.cumple.toLowerCase() !== filterCumple.toLowerCase()
      )
        return false
      return true
    })
  }, [
    labRecords,
    filterYear,
    filterMonth,
    filterSede,
    filterMedio,
    filterCumple,
  ])

  function medioOf(r: AgroMonitoreoRecord) {
    return r.medio?.trim() || r.tipoAgua?.trim() || '—'
  }

  function patchRow(
    localId: string,
    patch: Partial<AliconMonitoreoFormRow>,
  ) {
    setFormRows((rows) =>
      rows.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    )
  }

  function addRow() {
    setFormRows((rows) => [...rows, emptyAliconMonitoreoRow(year, month)])
  }

  function removeRow(localId: string) {
    setFormRows((rows) => {
      const next = rows.filter((r) => r.localId !== localId)
      return next.length ? next : [emptyAliconMonitoreoRow(year, month)]
    })
  }

  async function persistSchedule() {
    setSaving(true)
    setSaveError(null)
    try {
      const toSave = formRows.filter(
        (r) =>
          r.fechaInicio.trim() &&
          r.plantaSede.trim() &&
          (r.parametro.trim() || r.comentarios.trim() || r.id),
      )
      const saved = await saveAliconMonitoreosMonth(year, month, toSave)
      setScheduleRecords((prev) => {
        const rest = prev.filter(
          (r) =>
            !(
              yearFromFecha(r.fechaInicio) === year &&
              monthFromFecha(r.fechaInicio) === month
            ),
        )
        return [...rest, ...saved].sort((a, b) =>
          b.fechaInicio.localeCompare(a.fechaInicio),
        )
      })
      setSaveOk(true)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'No se pudo guardar el cronograma',
      )
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void persistSchedule()
  }

  if (loading) {
    return (
      <div className="entry-page hc-entry hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando monitoreos de cumplimiento / control · Alicón…</p>
      </div>
    )
  }

  const labPuntos = new Set(labRecords.map((r) => r.puntoMuestreo)).size
  const labMedios = new Set(labRecords.map((r) => medioOf(r))).size

  return (
    <div className="entry-page hc-entry alicon-monitoreos-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Factory size={14} />
            Entrada de Datos · Planta Alicón
          </p>
          <h1>Monitoreos de cumplimiento / control</h1>
          <p>
            Resultados reales de laboratorio (agua potable, material
            particulado, ruido). Distinto del{' '}
            <Link to="/monitoreo-en-vivo">monitoreo en vivo</Link>. Sube el PDF
            o revisa la tabla de parámetros abajo.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/planta-alicon/monitoreo-ambiental"
            className="btn-secondary-link"
          >
            Ver reporte →
          </Link>
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
          Cronograma de ejecuciones guardado
        </div>
      ) : null}

      {labSaveOk ? (
        <div className="hc-banner hc-banner-ok" role="status">
          <CheckCircle2 size={18} />
          {labSaveOk}{' '}
          <Link to="/operaciones/planta-alicon/monitoreo-ambiental">
            Ver en reporte →
          </Link>
        </div>
      ) : null}

      <MonitoreoLabImport
        year={year}
        month={month}
        expectedUnidad="Alicón"
        reportHref="/operaciones/planta-alicon/monitoreo-ambiental"
        hint="Sube los PDFs de laboratorio (agua potable, aire / material particulado, ruido). Pulsa «Guardar todo el informe» para que aparezcan en la tabla de abajo y en el reporte."
        onSaved={(result) => {
          setLabSaveOk(
            `Informe guardado: ${result.savedRows} parámetros en ${result.puntos} punto(s).`,
          )
          void reload()
        }}
      />

      <div className="entry-summary hc-summary">
        <div>
          <span>Parámetros lab</span>
          <strong>{labRecords.length}</strong>
        </div>
        <div>
          <span>Puntos</span>
          <strong>{labPuntos}</strong>
        </div>
        <div>
          <span>Medios</span>
          <strong>{labMedios}</strong>
        </div>
        <div>
          <span>Unidad</span>
          <strong>Alicón</strong>
        </div>
      </div>

      <section className="entry-section agro-records-section">
        <div className="entry-section-head">
          <h2>Datos registrados · laboratorio</h2>
          <p>
            {filteredLab.length} de {labRecords.length} parámetros · agua,
            material particulado y ruido (informes PDF).
          </p>
        </div>

        <div
          className="agro-table-filters"
          role="search"
          aria-label="Filtros de resultados de laboratorio"
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
              {labSedespuntos.sedes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Medio
            <select
              value={filterMedio}
              onChange={(e) => setFilterMedio(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos</option>
              {LAB_MEDIOS.map((m) => (
                <option key={m} value={m}>
                  {m}
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
                <th>Medio</th>
                <th>Parámetro</th>
                <th>Resultado</th>
                <th>Límite</th>
                <th>Cumple</th>
                <th>Fuente</th>
              </tr>
            </thead>
            <tbody>
              {filteredLab.length === 0 ? (
                <tr>
                  <td colSpan={10} className="alicon-empty">
                    Aún no hay resultados de laboratorio. Sube un PDF (agua,
                    aire o ruido) y pulsa «Guardar todo el informe».
                  </td>
                </tr>
              ) : (
                filteredLab.map((row) => (
                  <tr key={row.id}>
                    <td>{row.fecha}</td>
                    <td>{labMonthFromFecha(row.fecha) ?? '—'}</td>
                    <td>{row.plantaSede}</td>
                    <td>{row.puntoMuestreo}</td>
                    <td>{medioOf(row)}</td>
                    <td>{row.parametro}</td>
                    <td>
                      {formatLabNum(row.resultado)}
                      {row.unidad ? ` ${row.unidad}` : ''}
                    </td>
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
                    <td className="agro-obs-cell">
                      {row.fuenteInforme || row.laboratorio || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="entry-section alicon-schedule-section">
        <div className="entry-section-head alicon-sheet-head">
          <div>
            <h2>
              <Thermometer
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Cronograma de ejecuciones
            </h2>
            <p>
              Programación operativa (Interno/Externo, ARO/ARE). No sustituye
              los resultados de laboratorio de arriba.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => setShowSchedule((v) => !v)}
          >
            {showSchedule ? 'Ocultar cronograma' : 'Mostrar / editar cronograma'}
          </button>
        </div>

        {showSchedule ? (
          <>
            <div className="entry-summary hc-summary">
              <div>
                <span>Periodo</span>
                <strong>
                  {month} {year}
                </strong>
              </div>
              <div>
                <span>Programados en el mes</span>
                <strong>{programadosMes}</strong>
              </div>
              <div>
                <span>Filas del mes</span>
                <strong>{formRows.length}</strong>
              </div>
            </div>

            <form className="entry-form" onSubmit={handleSubmit}>
              <div className="hc-month-bar">
                <div className="agro-agua-period">
                  <label htmlFor="alicon-moni-year">Año</label>
                  <select
                    id="alicon-moni-year"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <span className="hc-month-label">Mes (fecha inicio)</span>
                  <strong>{month}</strong>
                </div>
                <MonthRail
                  month={month}
                  onChange={setMonth}
                  filled={filledMonths}
                />
              </div>

              <div className="entry-section-head alicon-sheet-head">
                <div>
                  <h3>Monitoreos del mes</h3>
                </div>
                <div className="lab-import-actions">
                  <button
                    type="button"
                    className="btn-secondary-link"
                    onClick={addRow}
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="hc-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    {saving ? 'Guardando…' : 'Guardar cronograma'}
                  </button>
                </div>
              </div>

              <div className="agro-insp-cards">
                {formRows.map((row, idx) => (
                  <article key={row.localId} className="agro-insp-card">
                    <header>
                      <strong>Monitoreo {idx + 1}</strong>
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
                            patchRow(row.localId, {
                              plantaSede: e.target.value,
                            })
                          }
                        >
                          {ALICON_MONITOREO_SEDES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tipo
                        <select
                          value={row.tipoMonitoreo}
                          onChange={(e) =>
                            patchRow(row.localId, {
                              tipoMonitoreo: e.target.value,
                            })
                          }
                        >
                          {ALICON_TIPOS_MONITOREO.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Parámetro
                        <select
                          value={row.parametro}
                          onChange={(e) =>
                            patchRow(row.localId, {
                              parametro: e.target.value,
                            })
                          }
                        >
                          {ALICON_MONITOREO_PARAMETROS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Puntos
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.puntos}
                          onChange={(e) =>
                            patchRow(row.localId, { puntos: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Fecha inicio
                        <input
                          type="date"
                          value={row.fechaInicio}
                          onChange={(e) =>
                            patchRow(row.localId, {
                              fechaInicio: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Fecha fin
                        <input
                          type="date"
                          value={row.fechaFin}
                          onChange={(e) =>
                            patchRow(row.localId, { fechaFin: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Comparación
                        <select
                          value={row.comparacion}
                          onChange={(e) =>
                            patchRow(row.localId, {
                              comparacion: e.target.value,
                            })
                          }
                        >
                          {ALICON_MONITOREO_COMPARACIONES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Motivo
                        <select
                          value={row.motivo}
                          onChange={(e) =>
                            patchRow(row.localId, { motivo: e.target.value })
                          }
                        >
                          {ALICON_MONITOREO_MOTIVOS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
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
                          {ALICON_MONITOREO_ESTADOS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="agro-insp-span2">
                        Referencia
                        <input
                          type="text"
                          value={row.referencia}
                          onChange={(e) =>
                            patchRow(row.localId, {
                              referencia: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="agro-insp-span-all">
                        Comentarios
                        <textarea
                          rows={2}
                          value={row.comentarios}
                          onChange={(e) =>
                            patchRow(row.localId, {
                              comentarios: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </form>

            <div className="alicon-table-wrap" style={{ marginTop: 16 }}>
              <table className="alicon-data-table agro-records-table">
                <thead>
                  <tr>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Sede</th>
                    <th>Tipo</th>
                    <th>Parámetro</th>
                    <th>Estado</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="alicon-empty">
                        Sin ejecuciones programadas.
                      </td>
                    </tr>
                  ) : (
                    scheduleRecords.map((row) => (
                      <tr key={row.id}>
                        <td>{row.fechaInicio}</td>
                        <td>{row.fechaFin ?? '—'}</td>
                        <td>{row.plantaSede}</td>
                        <td>{row.tipoMonitoreo || '—'}</td>
                        <td>{row.parametro || '—'}</td>
                        <td>{row.estado || '—'}</td>
                        <td>{row.referencia || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}
