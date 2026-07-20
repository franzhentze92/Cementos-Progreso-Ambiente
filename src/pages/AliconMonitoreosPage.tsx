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
  formatNum,
  monthFromFecha,
  monthHasMonitoreos,
  yearFromFecha,
  type AliconMonitoreoFormRow,
  type AliconMonitoreoRecord,
  type MonitoringMonth,
} from '../data/aliconMonitoreos'
import {
  currentMonitoringMonth,
  currentMonitoringYear,
  selectableMonitoringYears,
} from '../data/carbonMonitoring'
import { MonitoreoLabImport } from '../components/MonitoreoLabImport'
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

export function AliconMonitoreosPage() {
  const [records, setRecords] = useState<AliconMonitoreoRecord[]>([])
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

  const [filterYear, setFilterYear] = useState<string>(FILTER_ALL)
  const [filterMonth, setFilterMonth] = useState<string>(FILTER_ALL)
  const [filterSede, setFilterSede] = useState<string>(FILTER_ALL)
  const [filterEstado, setFilterEstado] = useState<string>(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await loadAliconMonitoreos()
      setRecords(data)
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
    const rows = formRowsFromRecords(records, year, month)
    setFormRows(rows.length ? rows : [emptyAliconMonitoreoRow(year, month)])
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
      if (monthHasMonitoreos(records, year, m)) set.add(m)
    }
    return set
  }, [records, year])

  const programadosMes = useMemo(
    () => countByEstadoMes(records, year, month, 'Programado'),
    [records, year, month],
  )

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      if (
        filterYear !== FILTER_ALL &&
        String(yearFromFecha(row.fechaInicio)) !== filterYear
      )
        return false
      if (
        filterMonth !== FILTER_ALL &&
        monthFromFecha(row.fechaInicio) !== filterMonth
      )
        return false
      if (filterSede !== FILTER_ALL && row.plantaSede !== filterSede)
        return false
      if (filterEstado !== FILTER_ALL && row.estado !== filterEstado)
        return false
      return true
    })
  }, [records, filterYear, filterMonth, filterSede, filterEstado])

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

  async function persist() {
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
      setRecords((prev) => {
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
        <p>Cargando monitoreos de cumplimiento / control · Alicón…</p>
      </div>
    )
  }

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
            Captura manual del cronograma (Ejecuciones Moni) o carga del PDF de
            laboratorio: la IA extrae parámetros y los guarda. Los resultados
            visuales se ven en el reporte de operaciones.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/planta-alicon/monitoreo-ambiental"
            className="btn-secondary-link"
          >
            Ver resultados →
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
        hint="Opción A: sube el PDF del laboratorio (agua, aire, ruido). La IA extrae y guarda todos los parámetros. Opción B: captura el cronograma de ejecuciones en el formulario de abajo."
        onSaved={(result) => {
          setLabSaveOk(
            `Informe guardado: ${result.savedRows} parámetros en ${result.puntos} punto(s).`,
          )
        }}
      />

      <div className="entry-summary hc-summary">
        <div>
          <span>Captura manual</span>
          <strong>Ejecuciones Moni</strong>
        </div>
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
          <span>Monitoreos mes</span>
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
          <MonthRail month={month} onChange={setMonth} filled={filledMonths} />
        </div>

        <section className="entry-section">
          <div className="entry-section-head alicon-sheet-head">
            <div>
              <h2>
                <Thermometer
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Monitoreos del mes
              </h2>
              <p>
                El mes en edición se basa en la fecha de inicio. Unidad:
                Cementos Progreso.
              </p>
            </div>
            <button type="button" className="btn-secondary-link" onClick={addRow}>
              <Plus size={16} />
              Agregar monitoreo
            </button>
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
                        patchRow(row.localId, { plantaSede: e.target.value })
                      }
                    >
                      {ALICON_MONITOREO_SEDES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.plantaSede &&
                      !(ALICON_MONITOREO_SEDES as readonly string[]).includes(
                        row.plantaSede,
                      ) ? (
                        <option value={row.plantaSede}>{row.plantaSede}</option>
                      ) : null}
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
                        patchRow(row.localId, { parametro: e.target.value })
                      }
                    >
                      {ALICON_MONITOREO_PARAMETROS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.parametro &&
                      !(
                        ALICON_MONITOREO_PARAMETROS as readonly string[]
                      ).includes(row.parametro) ? (
                        <option value={row.parametro}>{row.parametro}</option>
                      ) : null}
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
                      placeholder="1"
                    />
                  </label>
                  <label>
                    Fecha inicio
                    <input
                      type="date"
                      value={row.fechaInicio}
                      onChange={(e) =>
                        patchRow(row.localId, { fechaInicio: e.target.value })
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
                        patchRow(row.localId, { comparacion: e.target.value })
                      }
                    >
                      {ALICON_MONITOREO_COMPARACIONES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {row.comparacion &&
                      !(
                        ALICON_MONITOREO_COMPARACIONES as readonly string[]
                      ).includes(row.comparacion) ? (
                        <option value={row.comparacion}>
                          {row.comparacion}
                        </option>
                      ) : null}
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
                      {row.motivo &&
                      !(ALICON_MONITOREO_MOTIVOS as readonly string[]).includes(
                        row.motivo,
                      ) ? (
                        <option value={row.motivo}>{row.motivo}</option>
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
                        patchRow(row.localId, { referencia: e.target.value })
                      }
                      placeholder="Salida PTAR Alicon…"
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
                      placeholder="Observaciones del monitoreo…"
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
            {filteredRecords.length} de {records.length} monitoreos Planta
            Alicón · fuente Ejecuciones Moni.
          </p>
        </div>

        <div
          className="agro-table-filters"
          role="search"
          aria-label="Filtros de monitoreos"
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
              {ALICON_MONITOREO_SEDES.map((s) => (
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
              {ALICON_MONITOREO_ESTADOS.map((n) => (
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
                <th>Inicio</th>
                <th>Fin</th>
                <th>Mes</th>
                <th>Sede</th>
                <th>Tipo</th>
                <th>Parámetro</th>
                <th>Puntos</th>
                <th>Estado</th>
                <th>Referencia</th>
                <th>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="alicon-empty">
                    No hay registros con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td>{row.fechaInicio}</td>
                    <td>{row.fechaFin ?? '—'}</td>
                    <td>{monthFromFecha(row.fechaInicio) ?? '—'}</td>
                    <td>{row.plantaSede}</td>
                    <td>{row.tipoMonitoreo || '—'}</td>
                    <td>{row.parametro || '—'}</td>
                    <td>{formatNum(row.puntos, 0)}</td>
                    <td>{row.estado || '—'}</td>
                    <td>{row.referencia || '—'}</td>
                    <td className="agro-obs-cell">
                      {row.comentarios || '—'}
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
