import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  CheckCircle2,
  Droplets,
  Factory,
  Flame,
  Leaf,
  Loader2,
  Package,
  Save,
  Trash,
  TreePine,
  Zap,
  ClipboardList,
} from 'lucide-react'
import {
  BIODIVERSITY_ROWS,
  BIODIVERSITY_YEARS,
  MONITORING_MONTHS,
  calcElectricity,
  calcProduction,
  calcSupplies,
  calcWater,
  createEmptyMonitoringState,
  formatNum,
  parseNum,
  rowHasData,
  type CellValue,
  type ElectricityRow,
  type FuelRow,
  type MonitoringMonth,
  type MonitoringState,
  type WasteRow,
  type WaterRow,
} from '../data/carbonMonitoring'
import {
  loadCarbonCampaign,
  saveCarbonCampaign,
  type CarbonCampaignRef,
} from '../lib/carbonApi'

type TabId =
  | 'general'
  | 'produccion'
  | 'combustible'
  | 'energia'
  | 'insumos'
  | 'agua'
  | 'residuos'
  | 'biodiversidad'

const TABS: { id: TabId; label: string; icon: typeof Leaf }[] = [
  { id: 'general', label: 'General', icon: ClipboardList },
  { id: 'produccion', label: 'Producción', icon: Factory },
  { id: 'combustible', label: 'Combustible', icon: Flame },
  { id: 'energia', label: 'Energía eléctrica', icon: Zap },
  { id: 'insumos', label: 'Insumos', icon: Package },
  { id: 'agua', label: 'Agua', icon: Droplets },
  { id: 'residuos', label: 'Residuos', icon: Trash },
  { id: 'biodiversidad', label: 'Biodiversidad', icon: TreePine },
]

function Field({
  label,
  unit,
  hint,
  value,
  onChange,
  computed,
  computedValue,
}: {
  label: string
  unit?: string
  hint?: string
  value?: string
  onChange?: (v: string) => void
  computed?: boolean
  computedValue?: string
}) {
  return (
    <div className={`form-field hc-field ${computed ? 'is-computed' : ''}`}>
      <label>
        {label}
        {unit ? <span className="hc-unit">{unit}</span> : null}
        {computed ? (
          <span className="hc-auto" title="Calculado automáticamente">
            <Calculator size={12} />
            auto
          </span>
        ) : null}
      </label>
      {computed ? (
        <div className="hc-computed-value" aria-live="polite">
          {computedValue ?? '—'}
        </div>
      ) : (
        <input
          type="text"
          inputMode="decimal"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="—"
        />
      )}
      {hint ? <small className="hc-hint">{hint}</small> : null}
    </div>
  )
}

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

function cellDisplay(value: CellValue, digits = 2): string {
  const t = String(value ?? '').trim()
  if (!t) return '—'
  if (/^n\/?a$/i.test(t) || t === '-') return t
  const n = parseNum(t)
  return n == null ? t : formatNum(n, digits)
}

function pctDisplay(ratio: number | null): string {
  return ratio == null ? '—' : `${formatNum(ratio * 100, 1)}%`
}

function YearGlance({
  title,
  columns,
  month,
  onSelectMonth,
  getValue,
}: {
  title: string
  columns: { key: string; label: string }[]
  month: MonitoringMonth
  onSelectMonth: (m: MonitoringMonth) => void
  getValue: (m: MonitoringMonth, key: string) => string
}) {
  return (
    <section className="hc-year-glance" aria-label="Vista anual">
      <div className="hc-year-glance-head">
        <div>
          <h3>{title}</h3>
          <p>
            Todas las columnas del Excel. Desplaza horizontalmente si hace falta
            · clic en un mes para editarlo arriba.
          </p>
        </div>
      </div>
      <div className="hc-year-glance-scroll">
        <table className="hc-year-table">
          <thead>
            <tr>
              <th>Mes</th>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONITORING_MONTHS.map((m) => (
              <tr
                key={m}
                className={m === month ? 'is-current' : ''}
                onClick={() => onSelectMonth(m)}
              >
                <td>
                  <button type="button" className="hc-year-month-btn">
                    {m.slice(0, 3)}
                  </button>
                </td>
                {columns.map((c) => (
                  <td key={c.key}>{getValue(m, c.key)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function FieldGroup({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="hc-field-group">
      <div className="hc-field-group-head">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="hc-field-grid">{children}</div>
    </div>
  )
}

export function CarbonDataEntryPage() {
  const [tab, setTab] = useState<TabId>('produccion')
  const [month, setMonth] = useState<MonitoringMonth>('Junio')
  const [state, setState] = useState<MonitoringState>(() =>
    createEmptyMonitoringState(),
  )
  const [ref, setRef] = useState<CarbonCampaignRef | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  useEffect(() => {
    if (!saveOk) return
    const t = window.setTimeout(() => setSaveOk(false), 3500)
    return () => window.clearTimeout(t)
  }, [saveOk])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const loaded = await loadCarbonCampaign()
        if (cancelled) return
        setRef(loaded.ref)
        setState(loaded.state)
        const lastFilled = [...MONITORING_MONTHS]
          .reverse()
          .find(
            (m) =>
              rowHasData(loaded.state.production[m]) ||
              rowHasData(loaded.state.fuel[m]) ||
              rowHasData(loaded.state.electricity[m]),
          )
        if (lastFilled) setMonth(lastFilled)
      } catch (err) {
        if (cancelled) return
        setLoadError(
          err instanceof Error ? err.message : 'No se pudo cargar la información',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filledByTab = useMemo(() => {
    const map: Record<TabId, Set<MonitoringMonth>> = {
      general: new Set(),
      produccion: new Set(
        MONITORING_MONTHS.filter((m) => rowHasData(state.production[m])),
      ),
      combustible: new Set(
        MONITORING_MONTHS.filter((m) => rowHasData(state.fuel[m])),
      ),
      energia: new Set(
        MONITORING_MONTHS.filter((m) => rowHasData(state.electricity[m])),
      ),
      insumos: new Set(
        MONITORING_MONTHS.filter((m) => rowHasData(state.supplies[m])),
      ),
      agua: new Set(MONITORING_MONTHS.filter((m) => rowHasData(state.water[m]))),
      residuos: new Set(
        MONITORING_MONTHS.filter((m) => rowHasData(state.waste[m])),
      ),
      biodiversidad: new Set(),
    }
    return map
  }, [state])

  function patchMeta(patch: Partial<MonitoringState['meta']>) {
    setState((s) => ({ ...s, meta: { ...s.meta, ...patch } }))
  }

  function patchMonthly<
    K extends
      | 'production'
      | 'fuel'
      | 'electricity'
      | 'supplies'
      | 'water'
      | 'waste',
  >(
    store: K,
    patch: Partial<MonitoringState[K][MonitoringMonth]>,
  ) {
    setState((s) => ({
      ...s,
      [store]: {
        ...s[store],
        [month]: { ...s[store][month], ...patch },
      },
    }))
  }

  async function persist() {
    if (!ref) {
      setSaveError('No hay información cargada para guardar.')
      setSaveOk(false)
      return
    }
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      await saveCarbonCampaign(ref, state)
      setSaveOk(true)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.',
      )
      setSaveOk(false)
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void persist()
  }

  async function handleReload() {
    setLoading(true)
    setLoadError(null)
    setSaveError(null)
    try {
      const loaded = await loadCarbonCampaign()
      setRef(loaded.ref)
      setState(loaded.state)
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'No se pudo cargar la información',
      )
    } finally {
      setLoading(false)
    }
  }

  const prod = state.production[month]
  const prodCalc = calcProduction(prod)
  const fuel = state.fuel[month]
  const elec = state.electricity[month]
  const elecCalc = calcElectricity(elec)
  const supplies = state.supplies[month]
  const suppliesCalc = calcSupplies(supplies)
  const water = state.water[month]
  const waterCalc = calcWater(water)
  const waste = state.waste[month]

  const showMonthChrome = tab !== 'general' && tab !== 'biodiversidad'

  if (loading) {
    return (
      <div className="entry-page hc-entry hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando monitoreo Alicon…</p>
      </div>
    )
  }

  return (
    <div className="entry-page hc-entry">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Leaf size={14} />
            Monitoreo Alicon · captura mensual
          </p>
          <h1>Entrada de Datos — Huella de Carbono</h1>
          <p>
            Completa los indicadores por mes. Los campos marcados como auto se
            calculan solos.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link to="/reportes/huella-de-carbono" className="btn-secondary-link">
            Ver reporte →
          </Link>
          <button
            type="button"
            className="btn-primary"
            disabled={saving || !ref}
            onClick={() => void persist()}
          >
            {saving ? <Loader2 className="hc-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>No se pudo cargar:</strong> {loadError}
          <button type="button" className="btn-ghost" onClick={handleReload}>
            Reintentar
          </button>
        </div>
      ) : null}

      {saveError ? (
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>No se pudo guardar:</strong> {saveError}
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
          <span>Planta / Año</span>
          <strong>
            {state.meta.plant || '—'} · {state.meta.year || '—'}
          </strong>
        </div>
        <div>
          <span>Mes en edición</span>
          <strong>{month}</strong>
        </div>
        <div>
          <span>Responsable</span>
          <strong>{state.meta.responsible || '—'}</strong>
        </div>
      </div>

      <div className="hc-meta-bar">
        <div className="form-field">
          <label htmlFor="hc-plant">Planta</label>
          <input
            id="hc-plant"
            value={state.meta.plant}
            onChange={(e) => patchMeta({ plant: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="hc-year">Año</label>
          <input
            id="hc-year"
            value={state.meta.year}
            onChange={(e) => patchMeta({ year: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="hc-date">Fecha de la información</label>
          <input
            id="hc-date"
            type="date"
            value={state.meta.infoDate}
            onChange={(e) => patchMeta({ infoDate: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="hc-resp">Responsable</label>
          <input
            id="hc-resp"
            value={state.meta.responsible}
            onChange={(e) => patchMeta({ responsible: e.target.value })}
            placeholder="Nombre de quien reporta"
          />
        </div>
        <div className="form-field">
          <label htmlFor="hc-ver">Versión</label>
          <input
            id="hc-ver"
            value={state.meta.version}
            onChange={(e) => patchMeta({ version: e.target.value })}
          />
        </div>
      </div>

      <nav className="entry-tabs" aria-label="Pestañas del monitoreo">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      <form className="entry-form" onSubmit={handleSubmit}>
        {showMonthChrome ? (
          <div className="hc-month-bar">
            <div>
              <span className="hc-month-label">Mes en edición</span>
              <strong>{month}</strong>
            </div>
            <MonthRail
              month={month}
              onChange={setMonth}
              filled={filledByTab[tab]}
            />
          </div>
        ) : null}

        {tab === 'general' && (
          <section className="entry-section">
            <div className="entry-section-head">
              <h2>Instrucciones del monitoreo</h2>
              <p>
                Equivalente a la pestaña Instrucciones del Excel. Este documento
                alimenta la cuantificación de la huella de carbono de la
                operación.
              </p>
            </div>
            <div className="hc-instructions">
              <ol>
                <li>
                  Completa primero planta, año, fecha y responsable en la barra
                  superior.
                </li>
                <li>
                  Recorre las pestañas en orden: Producción → Combustible →
                  Energía → Insumos → Agua → Residuos → Biodiversidad.
                </li>
                <li>
                  Usa la franja de meses y la tabla anual a la derecha para
                  consultar periodos anteriores sin salir de la captura.
                </li>
                <li>
                  Los campos marcados <em>auto</em> replican las fórmulas del
                  Excel (totales y factores).
                </li>
                <li>
                  Contactos Cempro: Jorge Corado (jcorado@cempro.com) · Carlos
                  Lopez (clopez2@cempro.com).
                </li>
              </ol>
            </div>
          </section>
        )}

        {tab === 'produccion' && (
          <div className="hc-stack">
            <section className="entry-section hc-main-panel">
              <div className="entry-section-head">
                <h2>Producción — {month}</h2>
                <p>
                  Clinker, materias primas, tipos de cemento (UGC / CFB / otro) y
                  factor clinker de planta.
                </p>
              </div>

              <FieldGroup title="Clinker" description="Toneladas">
                <Field
                  label="Ingreso de clinker"
                  unit="ton"
                  value={prod.clinkerIngreso}
                  onChange={(v) => patchMonthly('production', { clinkerIngreso: v })}
                />
                <Field
                  label="Consumo de clinker"
                  unit="ton"
                  value={prod.clinkerConsumo}
                  onChange={(v) => patchMonthly('production', { clinkerConsumo: v })}
                />
              </FieldGroup>

              <FieldGroup
                title="Materias primas cemento"
                description="Toneladas por tipo"
              >
                <Field
                  label="Puzolana"
                  unit="ton"
                  value={prod.puzolana}
                  onChange={(v) => patchMonthly('production', { puzolana: v })}
                />
                <Field
                  label="Caliza"
                  unit="ton"
                  value={prod.caliza}
                  onChange={(v) => patchMonthly('production', { caliza: v })}
                />
                <Field
                  label="Yeso"
                  unit="ton"
                  value={prod.yeso}
                  onChange={(v) => patchMonthly('production', { yeso: v })}
                />
                <Field
                  label="Aditivo de molienda"
                  unit="ton"
                  value={prod.aditivo}
                  onChange={(v) => patchMonthly('production', { aditivo: v })}
                />
                <Field
                  label="Otra materia prima (TOBA)"
                  unit="ton"
                  value={prod.toba}
                  onChange={(v) => patchMonthly('production', { toba: v })}
                />
                <Field
                  label="Total materia prima cemento"
                  unit="ton"
                  computed
                  computedValue={formatNum(prodCalc.totalMP)}
                  hint="SUM(consumo clinker → toba)"
                />
              </FieldGroup>

              <FieldGroup title="Tipos de cemento — UGC">
                <Field
                  label="Producción UGC"
                  unit="ton"
                  value={prod.prodUGC}
                  onChange={(v) => patchMonthly('production', { prodUGC: v })}
                />
                <Field
                  label="Clinker consumido UGC"
                  unit="ton"
                  value={prod.clinkerUGC}
                  onChange={(v) => patchMonthly('production', { clinkerUGC: v })}
                />
                <Field
                  label="Factor clinker UGC"
                  unit="%"
                  computed
                  computedValue={
                    prodCalc.factorUGC == null
                      ? '—'
                      : `${formatNum(prodCalc.factorUGC * 100, 1)} %`
                  }
                />
              </FieldGroup>

              <FieldGroup title="Tipos de cemento — CFB">
                <Field
                  label="Producción CFB"
                  unit="ton"
                  value={prod.prodCFB}
                  onChange={(v) => patchMonthly('production', { prodCFB: v })}
                />
                <Field
                  label="Clinker consumido CFB"
                  unit="ton"
                  value={prod.clinkerCFB}
                  onChange={(v) => patchMonthly('production', { clinkerCFB: v })}
                />
                <Field
                  label="Factor clinker CFB"
                  unit="%"
                  computed
                  computedValue={
                    prodCalc.factorCFB == null
                      ? '—'
                      : `${formatNum(prodCalc.factorCFB * 100, 1)} %`
                  }
                />
              </FieldGroup>

              <FieldGroup
                title="Tipos de cemento — Otro"
                description="Usa n/a si no aplica"
              >
                <Field
                  label="Producción otro"
                  unit="ton"
                  value={prod.prodOtro}
                  onChange={(v) => patchMonthly('production', { prodOtro: v })}
                />
                <Field
                  label="Clinker consumido otro"
                  unit="ton"
                  value={prod.clinkerOtro}
                  onChange={(v) => patchMonthly('production', { clinkerOtro: v })}
                />
                <Field
                  label="Factor clinker otro"
                  unit="%"
                  computed
                  computedValue={
                    prodCalc.factorOtro == null
                      ? '—'
                      : `${formatNum(prodCalc.factorOtro * 100, 1)} %`
                  }
                />
              </FieldGroup>

              <FieldGroup title="Totales de planta">
                <Field
                  label="Producción total cemento"
                  unit="ton"
                  computed
                  computedValue={formatNum(prodCalc.prodTotal)}
                  hint="UGC + CFB (como en el Excel)"
                />
                <Field
                  label="Factor clinker de planta"
                  unit="%"
                  computed
                  computedValue={
                    prodCalc.factorPlanta == null
                      ? '—'
                      : `${formatNum(prodCalc.factorPlanta * 100, 1)} %`
                  }
                  hint="Consumo clinker / producción total"
                />
              </FieldGroup>
            </section>

            <YearGlance
              title="Año completo — Producción"
              month={month}
              onSelectMonth={setMonth}
              columns={[
                { key: 'clinkerIngreso', label: 'Ingreso clinker' },
                { key: 'clinkerConsumo', label: 'Consumo clinker' },
                { key: 'puzolana', label: 'Puzolana' },
                { key: 'caliza', label: 'Caliza' },
                { key: 'yeso', label: 'Yeso' },
                { key: 'aditivo', label: 'Aditivo' },
                { key: 'toba', label: 'TOBA' },
                { key: 'totalMP', label: 'Total MP' },
                { key: 'prodUGC', label: 'Prod. UGC' },
                { key: 'clinkerUGC', label: 'Clinker UGC' },
                { key: 'factorUGC', label: 'Factor UGC' },
                { key: 'prodCFB', label: 'Prod. CFB' },
                { key: 'clinkerCFB', label: 'Clinker CFB' },
                { key: 'factorCFB', label: 'Factor CFB' },
                { key: 'prodOtro', label: 'Prod. otro' },
                { key: 'clinkerOtro', label: 'Clinker otro' },
                { key: 'factorOtro', label: 'Factor otro' },
                { key: 'prodTotal', label: 'Prod. total' },
                { key: 'factorPlanta', label: 'Factor planta' },
              ]}
              getValue={(m, key) => {
                const row = state.production[m]
                const c = calcProduction(row)
                if (key === 'totalMP') return formatNum(c.totalMP)
                if (key === 'factorUGC') return pctDisplay(c.factorUGC)
                if (key === 'factorCFB') return pctDisplay(c.factorCFB)
                if (key === 'factorOtro') return pctDisplay(c.factorOtro)
                if (key === 'prodTotal') return formatNum(c.prodTotal)
                if (key === 'factorPlanta') return pctDisplay(c.factorPlanta)
                return cellDisplay(row[key as keyof typeof row])
              }}
            />
          </div>
        )}

        {tab === 'combustible' && (
          <div className="hc-stack">
            <section className="entry-section hc-main-panel">
              <div className="entry-section-head">
                <h2>Combustible — {month}</h2>
                <p>
                  Control de calidad, generación eléctrica, flota propia y otros
                  combustibles.
                </p>
              </div>
              <FieldGroup title="Control de calidad">
                <Field
                  label="GLP"
                  unit="lb"
                  value={fuel.glpControl}
                  onChange={(v) => patchMonthly('fuel', { glpControl: v })}
                />
              </FieldGroup>
              <FieldGroup title="Generación de energía eléctrica">
                <Field
                  label="Diésel"
                  unit="gal"
                  value={fuel.dieselGeneracion}
                  onChange={(v) => patchMonthly('fuel', { dieselGeneracion: v })}
                />
              </FieldGroup>
              <FieldGroup title="Combustible móvil (vehículos propios)">
                <Field
                  label="Diésel"
                  unit="gal"
                  value={fuel.dieselMovil}
                  onChange={(v) => patchMonthly('fuel', { dieselMovil: v })}
                />
                <Field
                  label="GLP montacargas"
                  unit="lb"
                  value={fuel.glpMontacargas}
                  onChange={(v) => patchMonthly('fuel', { glpMontacargas: v })}
                />
              </FieldGroup>
              <FieldGroup title="Otro combustible">
                <Field
                  label="GLP"
                  unit="lb"
                  value={fuel.glpOtro}
                  onChange={(v) => patchMonthly('fuel', { glpOtro: v })}
                />
                <Field
                  label="Otros"
                  value={fuel.otros}
                  onChange={(v) => patchMonthly('fuel', { otros: v })}
                />
              </FieldGroup>
            </section>
            <YearGlance
              title="Año completo — Combustible"
              month={month}
              onSelectMonth={setMonth}
              columns={[
                { key: 'glpControl', label: 'GLP control (lb)' },
                { key: 'dieselGeneracion', label: 'Diésel gen. (gal)' },
                { key: 'dieselMovil', label: 'Diésel móvil (gal)' },
                { key: 'glpMontacargas', label: 'GLP montacargas (lb)' },
                { key: 'glpOtro', label: 'GLP otro (lb)' },
                { key: 'otros', label: 'Otros' },
              ]}
              getValue={(m, key) =>
                cellDisplay(state.fuel[m][key as keyof FuelRow] as CellValue)
              }
            />
          </div>
        )}

        {tab === 'energia' && (
          <div className="hc-stack">
            <section className="entry-section hc-main-panel">
              <div className="entry-section-head">
                <h2>Energía eléctrica — {month}</h2>
                <p>Consumos en kWh por uso y total del mes.</p>
              </div>
              <FieldGroup title="Energía eléctrica (kWh)">
                <Field
                  label="Producción de cemento"
                  unit="kWh"
                  value={elec.produccionCemento}
                  onChange={(v) =>
                    patchMonthly('electricity', { produccionCemento: v })
                  }
                />
                <Field
                  label="Servicios"
                  unit="kWh"
                  value={elec.servicios}
                  onChange={(v) => patchMonthly('electricity', { servicios: v })}
                />
                <Field
                  label="Pérdidas"
                  unit="kWh"
                  value={elec.perdidas}
                  onChange={(v) => patchMonthly('electricity', { perdidas: v })}
                />
                <Field
                  label="Consumo de la red eléctrica"
                  unit="kWh"
                  value={elec.redElectrica}
                  onChange={(v) =>
                    patchMonthly('electricity', { redElectrica: v })
                  }
                />
                <Field
                  label="Total"
                  unit="kWh"
                  computed
                  computedValue={formatNum(elecCalc.total, 1)}
                  hint="SUM de las columnas anteriores"
                />
              </FieldGroup>
            </section>
            <YearGlance
              title="Año completo — Energía"
              month={month}
              onSelectMonth={setMonth}
              columns={[
                { key: 'produccionCemento', label: 'Prod. cemento (kWh)' },
                { key: 'servicios', label: 'Servicios (kWh)' },
                { key: 'perdidas', label: 'Pérdidas (kWh)' },
                { key: 'redElectrica', label: 'Red eléctrica (kWh)' },
                { key: 'total', label: 'Total (kWh)' },
              ]}
              getValue={(m, key) => {
                const row = state.electricity[m]
                if (key === 'total') return formatNum(calcElectricity(row).total, 1)
                return cellDisplay(
                  row[key as keyof ElectricityRow] as CellValue,
                  1,
                )
              }}
            />
          </div>
        )}

        {tab === 'insumos' && (
          <div className="hc-stack">
            <section className="entry-section hc-main-panel">
              <div className="entry-section-head">
                <h2>Insumos — {month}</h2>
                <p>Refrigerantes, envasado y lubricación.</p>
              </div>
              <FieldGroup title="Refrigerantes">
                <Field
                  label="Refrigerante R134A"
                  value={supplies.r134a}
                  onChange={(v) => patchMonthly('supplies', { r134a: v })}
                />
                <Field
                  label="Refrigerante R141B"
                  value={supplies.r141b}
                  onChange={(v) => patchMonthly('supplies', { r141b: v })}
                />
                <Field
                  label="Refrigerante R410"
                  value={supplies.r410}
                  onChange={(v) => patchMonthly('supplies', { r410: v })}
                />
              </FieldGroup>
              <FieldGroup
                title="Envasado"
                description="Sacos ton = millares × 0.12 · Reprocesado = rotos × 42.5 kg"
              >
                <Field
                  label="Sacos recibidos"
                  unit="millares"
                  value={supplies.sacosMillares}
                  onChange={(v) => patchMonthly('supplies', { sacosMillares: v })}
                />
                <Field
                  label="Sacos recibidos"
                  unit="ton"
                  computed
                  computedValue={formatNum(suppliesCalc.sacosTon)}
                />
                <Field
                  label="Sacos rotos de fábrica"
                  unit="millar"
                  value={supplies.sacosRotosFabrica}
                  onChange={(v) =>
                    patchMonthly('supplies', { sacosRotosFabrica: v })
                  }
                />
                <Field
                  label="Saco roto en envasado"
                  unit="millar"
                  value={supplies.sacosRotosEnvasado}
                  onChange={(v) =>
                    patchMonthly('supplies', { sacosRotosEnvasado: v })
                  }
                />
                <Field
                  label="Cemento reprocesado"
                  unit="ton"
                  computed
                  computedValue={formatNum(suppliesCalc.cementoReprocesado)}
                />
              </FieldGroup>
              <FieldGroup title="Lubricación">
                <Field
                  label="Grasa"
                  unit="ton"
                  value={supplies.grasa}
                  onChange={(v) => patchMonthly('supplies', { grasa: v })}
                />
                <Field
                  label="Aceite"
                  unit="ton"
                  value={supplies.aceite}
                  onChange={(v) => patchMonthly('supplies', { aceite: v })}
                />
              </FieldGroup>
            </section>
            <YearGlance
              title="Año completo — Insumos"
              month={month}
              onSelectMonth={setMonth}
              columns={[
                { key: 'r134a', label: 'R134A' },
                { key: 'r141b', label: 'R141B' },
                { key: 'r410', label: 'R410' },
                { key: 'sacosMillares', label: 'Sacos (millares)' },
                { key: 'sacosTon', label: 'Sacos (ton)' },
                { key: 'sacosRotosFabrica', label: 'Rotos fábrica' },
                { key: 'sacosRotosEnvasado', label: 'Rotos envasado' },
                { key: 'reproc', label: 'Cemento reprocesado' },
                { key: 'grasa', label: 'Grasa (ton)' },
                { key: 'aceite', label: 'Aceite (ton)' },
              ]}
              getValue={(m, key) => {
                const row = state.supplies[m]
                const c = calcSupplies(row)
                if (key === 'sacosTon') return formatNum(c.sacosTon)
                if (key === 'reproc') return formatNum(c.cementoReprocesado)
                return cellDisplay(row[key as keyof typeof row])
              }}
            />
          </div>
        )}

        {tab === 'agua' && (
          <div className="hc-stack">
            <section className="entry-section hc-main-panel">
              <div className="entry-section-head">
                <h2>Abastecimiento y consumo de agua — {month}</h2>
                <p>Fuentes, consumo y sistemas de tratamiento.</p>
              </div>
              <FieldGroup title="Abastecimiento (m³)">
                <Field
                  label="Abastecimiento externo (pipas)"
                  unit="m³"
                  value={water.pipas}
                  onChange={(v) => patchMonthly('water', { pipas: v })}
                />
                <Field
                  label="Externo entubado (municipal o privado)"
                  unit="m³"
                  value={water.externoEntuvado}
                  onChange={(v) => patchMonthly('water', { externoEntuvado: v })}
                />
                <Field
                  label="Extracción agua superficial (río)"
                  unit="m³"
                  value={water.superficial}
                  onChange={(v) => patchMonthly('water', { superficial: v })}
                />
                <Field
                  label="Extracción agua subsuperficial (pozo)"
                  unit="m³"
                  value={water.subsuperficial}
                  onChange={(v) => patchMonthly('water', { subsuperficial: v })}
                />
                <Field
                  label="Acopio de agua de lluvia (reservorio)"
                  unit="m³"
                  value={water.lluvia}
                  onChange={(v) => patchMonthly('water', { lluvia: v })}
                />
                <Field
                  label="Recirculación de agua"
                  unit="m³"
                  value={water.recirculacion}
                  onChange={(v) => patchMonthly('water', { recirculacion: v })}
                />
              </FieldGroup>
              <FieldGroup title="Consumo (m³)">
                <Field
                  label="Otros usos"
                  unit="m³"
                  value={water.otrosUsos}
                  onChange={(v) => patchMonthly('water', { otrosUsos: v })}
                />
                <Field
                  label="Producción"
                  unit="m³"
                  value={water.produccion}
                  onChange={(v) => patchMonthly('water', { produccion: v })}
                />
                <Field
                  label="Consumo total de agua"
                  unit="m³"
                  computed
                  computedValue={formatNum(waterCalc.consumoTotal)}
                  hint="SUM abastecimientos C→H"
                />
                <Field
                  label="Agua para consumo humano"
                  unit="garrafones"
                  value={water.aguaHumana}
                  onChange={(v) => patchMonthly('water', { aguaHumana: v })}
                />
              </FieldGroup>
              <FieldGroup
                title="Sistemas de tratamiento"
                description="Valores de planta (aplican a todo el año)"
              >
                <Field
                  label="Forma de disposición de agua residual"
                  value={state.waterConfig.disposicionResidual}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      waterConfig: { ...s.waterConfig, disposicionResidual: v },
                    }))
                  }
                />
                <Field
                  label="Puntos de descarga"
                  unit="cantidad"
                  value={state.waterConfig.puntosDescarga}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      waterConfig: { ...s.waterConfig, puntosDescarga: v },
                    }))
                  }
                />
                <Field
                  label="Métodos de tratamiento"
                  value={state.waterConfig.metodosTratamiento}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      waterConfig: { ...s.waterConfig, metodosTratamiento: v },
                    }))
                  }
                />
              </FieldGroup>
            </section>
            <YearGlance
              title="Año completo — Agua"
              month={month}
              onSelectMonth={setMonth}
              columns={[
                { key: 'pipas', label: 'Pipas (m³)' },
                { key: 'externoEntuvado', label: 'Entubado (m³)' },
                { key: 'superficial', label: 'Superficial (m³)' },
                { key: 'subsuperficial', label: 'Pozo (m³)' },
                { key: 'lluvia', label: 'Lluvia (m³)' },
                { key: 'recirculacion', label: 'Recirculación (m³)' },
                { key: 'otrosUsos', label: 'Otros usos (m³)' },
                { key: 'produccion', label: 'Producción (m³)' },
                { key: 'total', label: 'Consumo total (m³)' },
                { key: 'aguaHumana', label: 'Garrafones' },
              ]}
              getValue={(m, key) => {
                const row = state.water[m]
                if (key === 'total') return formatNum(calcWater(row).consumoTotal)
                return cellDisplay(row[key as keyof WaterRow] as CellValue)
              }}
            />
          </div>
        )}

        {tab === 'residuos' && (
          <div className="hc-stack">
            <section className="entry-section hc-main-panel">
              <div className="entry-section-head">
                <h2>Residuos y desechos — {month}</h2>
                <p>Generación, disposición y manejo de derrames.</p>
              </div>
              <FieldGroup title="Generación (toneladas)">
                <Field
                  label="Ordinarios"
                  unit="ton"
                  value={waste.ordinarios}
                  onChange={(v) => patchMonthly('waste', { ordinarios: v })}
                />
                <Field
                  label="Peligrosos"
                  unit="ton"
                  value={waste.peligrosos}
                  onChange={(v) => patchMonthly('waste', { peligrosos: v })}
                />
              </FieldGroup>
              <FieldGroup title="Disposición (toneladas)">
                <Field
                  label="Vertedero"
                  unit="ton"
                  value={waste.vertedero}
                  onChange={(v) => patchMonthly('waste', { vertedero: v })}
                />
                <Field
                  label="Coprocesamiento"
                  unit="ton"
                  value={waste.coprocesamiento}
                  onChange={(v) => patchMonthly('waste', { coprocesamiento: v })}
                />
                <Field
                  label="Reutilizados"
                  unit="ton"
                  value={waste.reutilizados}
                  onChange={(v) => patchMonthly('waste', { reutilizados: v })}
                />
                <Field
                  label="Reciclados"
                  unit="ton"
                  value={waste.reciclados}
                  onChange={(v) => patchMonthly('waste', { reciclados: v })}
                />
                <Field
                  label="Otra disposición"
                  unit="ton"
                  value={waste.otraDisposicion}
                  onChange={(v) => patchMonthly('waste', { otraDisposicion: v })}
                />
              </FieldGroup>
              <FieldGroup title="Manejo de derrames">
                <Field
                  label="Cantidad de derrames significativos"
                  hint="Mayores a 1 m³ de líquidos o 1 ton de sólido"
                  value={waste.derramesCantidad}
                  onChange={(v) => patchMonthly('waste', { derramesCantidad: v })}
                />
                <Field
                  label="Volumen del derrame significativo"
                  unit="m³ o ton"
                  value={waste.derramesVolumen}
                  onChange={(v) => patchMonthly('waste', { derramesVolumen: v })}
                />
              </FieldGroup>
            </section>
            <YearGlance
              title="Año completo — Residuos"
              month={month}
              onSelectMonth={setMonth}
              columns={[
                { key: 'ordinarios', label: 'Ordinarios' },
                { key: 'peligrosos', label: 'Peligrosos' },
                { key: 'vertedero', label: 'Vertedero' },
                { key: 'coprocesamiento', label: 'Coprocesamiento' },
                { key: 'reutilizados', label: 'Reutilizados' },
                { key: 'reciclados', label: 'Reciclados' },
                { key: 'otraDisposicion', label: 'Otra disposición' },
                { key: 'derramesCantidad', label: 'Derrames (cant.)' },
                { key: 'derramesVolumen', label: 'Derrames (vol.)' },
              ]}
              getValue={(m, key) =>
                cellDisplay(state.waste[m][key as keyof WasteRow] as CellValue)
              }
            />
          </div>
        )}

        {tab === 'biodiversidad' && (
          <section className="entry-section">
            <div className="entry-section-head">
              <h2>Cemento — Biodiversidad</h2>
              <p>
                Indicadores por lista (UICN, CITES, LEA-CONAP) e índices de
                canteras. Columnas anuales como en el Excel.
              </p>
            </div>
            <div className="entry-table-wrap wide">
              <table className="entry-table wide hc-bio-table">
                <thead>
                  <tr>
                    <th>Lista</th>
                    <th>Categoría / índice</th>
                    {BIODIVERSITY_YEARS.map((y) => (
                      <th key={y}>{y}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BIODIVERSITY_ROWS.map((row) => (
                    <tr key={row.key}>
                      <td>{row.group}</td>
                      <td>{row.label}</td>
                      {BIODIVERSITY_YEARS.map((y) => (
                        <td key={y}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={state.biodiversity[row.key][y]}
                            onChange={(e) => {
                              const value = e.target.value
                              setState((s) => ({
                                ...s,
                                biodiversity: {
                                  ...s.biodiversity,
                                  [row.key]: {
                                    ...s.biodiversity[row.key],
                                    [y]: value,
                                  },
                                },
                              }))
                            }}
                            placeholder="—"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </form>
    </div>
  )
}
