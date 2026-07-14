import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Factory,
  Flame,
  Globe2,
  Leaf,
  LineChart,
  Save,
  Target,
  Trash2,
} from 'lucide-react'
import {
  ABATEMENT_LEVERS,
  CARBON_META,
  COUNTRY_FOOTPRINT,
  EMISSION_SOURCES,
  INTENSITY_PATHWAY,
  MONTHLY_EMISSIONS,
  PLANT_EMISSIONS,
  SCOPE_BREAKDOWN,
} from '../data/carbonFootprint'

type TabId =
  | 'periodo'
  | 'alcances'
  | 'trayectoria'
  | 'mensual'
  | 'plantas'
  | 'paises'
  | 'palancas'

const TABS: { id: TabId; label: string; icon: typeof Leaf }[] = [
  { id: 'periodo', label: 'Periodo y KPIs', icon: Leaf },
  { id: 'alcances', label: 'Alcances y fuentes', icon: Flame },
  { id: 'trayectoria', label: 'Trayectoria', icon: LineChart },
  { id: 'mensual', label: 'Mensual', icon: LineChart },
  { id: 'plantas', label: 'Plantas', icon: Factory },
  { id: 'paises', label: 'Países', icon: Globe2 },
  { id: 'palancas', label: 'Palancas', icon: Target },
]

const PLANT_STATUS = ['En meta', 'Atención', 'Crítico'] as const

function emptyPathway() {
  return INTENSITY_PATHWAY.map((row) => ({
    year: row.year,
    real: row.real === null ? '' : String(row.real),
    meta: String(row.meta),
  }))
}

function emptyMonthly() {
  return MONTHLY_EMISSIONS.map((row) => ({
    month: row.month,
    alcance1: String(row.alcance1),
    alcance2: String(row.alcance2),
    alcance3: String(row.alcance3),
  }))
}

function emptyPlants() {
  return PLANT_EMISSIONS.map((p) => ({
    id: p.id,
    name: p.name,
    country: p.country,
    tco2e: String(p.tco2e),
    intensity: String(p.intensity),
    thermalSub: String(p.thermalSub),
    renewableShare: String(p.renewableShare),
    yoy: String(p.yoy),
    status: p.status,
  }))
}

function emptyCountries() {
  return COUNTRY_FOOTPRINT.map((c) => ({
    country: c.country,
    tco2e: String(c.tco2e),
    share: String(c.share),
    intensity: String(c.intensity),
  }))
}

function emptyLevers() {
  return ABATEMENT_LEVERS.map((l) => ({
    id: l.id,
    title: l.title,
    impact: l.impact,
    potential: l.potential,
    progress: String(l.progress),
    owner: l.owner,
    detail: l.detail,
  }))
}

function emptySources() {
  return EMISSION_SOURCES.map((s) => ({
    name: s.name,
    value: String(s.value),
  }))
}

function emptyScopes() {
  return SCOPE_BREAKDOWN.map((s) => ({
    name: s.name,
    value: String(s.value),
    share: String(s.share),
  }))
}

export function CarbonDataEntryPage() {
  const [tab, setTab] = useState<TabId>('periodo')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const [meta, setMeta] = useState({
    period: CARBON_META.period,
    updatedAt: CARBON_META.updatedAt,
    methodology: CARBON_META.methodology,
    baselineYear: String(CARBON_META.baselineYear),
    targetYear: String(CARBON_META.targetYear),
    ambition: '−30% intensidad',
  })

  const [kpis, setKpis] = useState({
    totalMt: '4.82',
    totalDelta: '-4.2',
    intensity: '512',
    intensityDelta: '-3.8',
    scope1Share: '78',
    scope1Delta: '-1.1',
    targetProgress: '41',
    targetDelta: '6',
  })

  const [scopes, setScopes] = useState(emptyScopes)
  const [sources, setSources] = useState(emptySources)
  const [pathway, setPathway] = useState(emptyPathway)
  const [monthly, setMonthly] = useState(emptyMonthly)
  const [plants, setPlants] = useState(emptyPlants)
  const [countries, setCountries] = useState(emptyCountries)
  const [levers, setLevers] = useState(emptyLevers)

  const fieldCount = useMemo(
    () =>
      8 +
      scopes.length * 2 +
      sources.length +
      pathway.length * 2 +
      monthly.length * 3 +
      plants.length * 6 +
      countries.length * 3 +
      levers.length * 2,
    [scopes, sources, pathway, monthly, plants, countries, levers],
  )

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSavedAt(
      new Date().toLocaleString('es-GT', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    )
  }

  function handleReset() {
    setMeta({
      period: CARBON_META.period,
      updatedAt: CARBON_META.updatedAt,
      methodology: CARBON_META.methodology,
      baselineYear: String(CARBON_META.baselineYear),
      targetYear: String(CARBON_META.targetYear),
      ambition: '−30% intensidad',
    })
    setKpis({
      totalMt: '4.82',
      totalDelta: '-4.2',
      intensity: '512',
      intensityDelta: '-3.8',
      scope1Share: '78',
      scope1Delta: '-1.1',
      targetProgress: '41',
      targetDelta: '6',
    })
    setScopes(emptyScopes())
    setSources(emptySources())
    setPathway(emptyPathway())
    setMonthly(emptyMonthly())
    setPlants(emptyPlants())
    setCountries(emptyCountries())
    setLevers(emptyLevers())
    setSavedAt(null)
  }

  return (
    <div className="entry-page">
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Leaf size={14} />
            Captura para el reporte ejecutivo
          </p>
          <h1>Entrada de Datos — Huella de Carbono</h1>
          <p>
            Completa los indicadores que alimentan las gráficas, tablas y mapa
            del módulo. Por ahora solo se guarda en esta sesión (sin base de
            datos).
          </p>
        </div>
        <Link to="/reportes/huella-de-carbono" className="btn-secondary-link">
          Ver reporte →
        </Link>
      </div>

      <div className="entry-summary">
        <div>
          <span>Campos del inventario</span>
          <strong>~{fieldCount}</strong>
        </div>
        <div>
          <span>Periodo de reporte</span>
          <strong>{meta.period || '—'}</strong>
        </div>
        <div>
          <span>Estado</span>
          <strong>{savedAt ? `Guardado · ${savedAt}` : 'Borrador local'}</strong>
        </div>
      </div>

      <nav className="entry-tabs" aria-label="Secciones de captura">
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
        {tab === 'periodo' && (
          <section className="entry-section">
            <div className="entry-section-head">
              <h2>Periodo y metadatos</h2>
              <p>Encabezado del reporte y KPIs ejecutivos</p>
            </div>
            <div className="entry-grid-4">
              <div className="form-field">
                <label htmlFor="period">Año del inventario</label>
                <input
                  id="period"
                  value={meta.period}
                  onChange={(e) => setMeta({ ...meta, period: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="updatedAt">Actualizado</label>
                <input
                  id="updatedAt"
                  value={meta.updatedAt}
                  onChange={(e) => setMeta({ ...meta, updatedAt: e.target.value })}
                  placeholder="Marzo 2026"
                />
              </div>
              <div className="form-field">
                <label htmlFor="baselineYear">Línea base</label>
                <input
                  id="baselineYear"
                  value={meta.baselineYear}
                  onChange={(e) =>
                    setMeta({ ...meta, baselineYear: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="targetYear">Año meta</label>
                <input
                  id="targetYear"
                  value={meta.targetYear}
                  onChange={(e) =>
                    setMeta({ ...meta, targetYear: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="entry-grid-2">
              <div className="form-field">
                <label htmlFor="methodology">Metodología</label>
                <input
                  id="methodology"
                  value={meta.methodology}
                  onChange={(e) =>
                    setMeta({ ...meta, methodology: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="ambition">Ambición corporativa</label>
                <input
                  id="ambition"
                  value={meta.ambition}
                  onChange={(e) => setMeta({ ...meta, ambition: e.target.value })}
                />
              </div>
            </div>

            <div className="entry-section-head spaced">
              <h2>KPIs de portada</h2>
              <p>Valores y variación vs periodo anterior</p>
            </div>
            <div className="entry-kpi-cards">
              <div className="entry-card">
                <h3>Emisiones totales</h3>
                <div className="entry-grid-2">
                  <div className="form-field">
                    <label>MtCO₂e</label>
                    <input
                      type="number"
                      step="0.01"
                      value={kpis.totalMt}
                      onChange={(e) =>
                        setKpis({ ...kpis, totalMt: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label>Δ % vs año previo</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpis.totalDelta}
                      onChange={(e) =>
                        setKpis({ ...kpis, totalDelta: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="entry-card">
                <h3>Intensidad neta</h3>
                <div className="entry-grid-2">
                  <div className="form-field">
                    <label>kgCO₂ / t cemento</label>
                    <input
                      type="number"
                      value={kpis.intensity}
                      onChange={(e) =>
                        setKpis({ ...kpis, intensity: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label>Δ % vs año previo</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpis.intensityDelta}
                      onChange={(e) =>
                        setKpis({ ...kpis, intensityDelta: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="entry-card">
                <h3>Participación Alcance 1</h3>
                <div className="entry-grid-2">
                  <div className="form-field">
                    <label>% del total</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpis.scope1Share}
                      onChange={(e) =>
                        setKpis({ ...kpis, scope1Share: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label>Δ puntos porcentuales</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpis.scope1Delta}
                      onChange={(e) =>
                        setKpis({ ...kpis, scope1Delta: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="entry-card">
                <h3>Avance meta 2030</h3>
                <div className="entry-grid-2">
                  <div className="form-field">
                    <label>% de reducción lograda</label>
                    <input
                      type="number"
                      value={kpis.targetProgress}
                      onChange={(e) =>
                        setKpis({ ...kpis, targetProgress: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label>Δ vs plan (pp)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpis.targetDelta}
                      onChange={(e) =>
                        setKpis({ ...kpis, targetDelta: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'alcances' && (
          <section className="entry-section">
            <div className="entry-section-head">
              <h2>Distribución por alcance GHG</h2>
              <p>MtCO₂e absolutas y % del inventario</p>
            </div>
            <div className="entry-table-wrap">
              <table className="entry-table">
                <thead>
                  <tr>
                    <th>Alcance</th>
                    <th>MtCO₂e</th>
                    <th>% share</th>
                  </tr>
                </thead>
                <tbody>
                  {scopes.map((row, i) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={row.value}
                          onChange={(e) => {
                            const next = [...scopes]
                            next[i] = { ...row, value: e.target.value }
                            setScopes(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={row.share}
                          onChange={(e) => {
                            const next = [...scopes]
                            next[i] = { ...row, share: e.target.value }
                            setScopes(next)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="entry-section-head spaced">
              <h2>Fuentes de emisión</h2>
              <p>% del inventario consolidado (deben sumar ~100)</p>
            </div>
            <div className="entry-table-wrap">
              <table className="entry-table">
                <thead>
                  <tr>
                    <th>Fuente</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((row, i) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={row.value}
                          onChange={(e) => {
                            const next = [...sources]
                            next[i] = { ...row, value: e.target.value }
                            setSources(next)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'trayectoria' && (
          <section className="entry-section">
            <div className="entry-section-head">
              <h2>Trayectoria de intensidad vs meta</h2>
              <p>kgCO₂ / t cemento equivalente por año</p>
            </div>
            <div className="entry-table-wrap">
              <table className="entry-table">
                <thead>
                  <tr>
                    <th>Año</th>
                    <th>Real (dejar vacío si aún no aplica)</th>
                    <th>Meta corporativa</th>
                  </tr>
                </thead>
                <tbody>
                  {pathway.map((row, i) => (
                    <tr key={row.year}>
                      <td>
                        <strong>{row.year}</strong>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.real}
                          placeholder="—"
                          onChange={(e) => {
                            const next = [...pathway]
                            next[i] = { ...row, real: e.target.value }
                            setPathway(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.meta}
                          onChange={(e) => {
                            const next = [...pathway]
                            next[i] = { ...row, meta: e.target.value }
                            setPathway(next)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'mensual' && (
          <section className="entry-section">
            <div className="entry-section-head">
              <h2>Emisiones mensuales</h2>
              <p>ktCO₂e por alcance · alimenta la gráfica apilada</p>
            </div>
            <div className="entry-table-wrap">
              <table className="entry-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Alcance 1</th>
                    <th>Alcance 2</th>
                    <th>Alcance 3</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((row, i) => (
                    <tr key={row.month}>
                      <td>
                        <strong>{row.month}</strong>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.alcance1}
                          onChange={(e) => {
                            const next = [...monthly]
                            next[i] = { ...row, alcance1: e.target.value }
                            setMonthly(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.alcance2}
                          onChange={(e) => {
                            const next = [...monthly]
                            next[i] = { ...row, alcance2: e.target.value }
                            setMonthly(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.alcance3}
                          onChange={(e) => {
                            const next = [...monthly]
                            next[i] = { ...row, alcance3: e.target.value }
                            setMonthly(next)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'plantas' && (
          <section className="entry-section">
            <div className="entry-section-head">
              <h2>Desempeño por planta</h2>
              <p>Datos que alimentan tabla, mapa y semáforo</p>
            </div>
            <div className="entry-table-wrap wide">
              <table className="entry-table">
                <thead>
                  <tr>
                    <th>Planta</th>
                    <th>País</th>
                    <th>ktCO₂e</th>
                    <th>Intensidad</th>
                    <th>Sust. térmica %</th>
                    <th>% Renovable</th>
                    <th>YoY %</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {plants.map((row, i) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td>{row.country}</td>
                      <td>
                        <input
                          type="number"
                          value={row.tco2e}
                          onChange={(e) => {
                            const next = [...plants]
                            next[i] = { ...row, tco2e: e.target.value }
                            setPlants(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.intensity}
                          onChange={(e) => {
                            const next = [...plants]
                            next[i] = { ...row, intensity: e.target.value }
                            setPlants(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={row.thermalSub}
                          onChange={(e) => {
                            const next = [...plants]
                            next[i] = { ...row, thermalSub: e.target.value }
                            setPlants(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.renewableShare}
                          onChange={(e) => {
                            const next = [...plants]
                            next[i] = {
                              ...row,
                              renewableShare: e.target.value,
                            }
                            setPlants(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={row.yoy}
                          onChange={(e) => {
                            const next = [...plants]
                            next[i] = { ...row, yoy: e.target.value }
                            setPlants(next)
                          }}
                        />
                      </td>
                      <td>
                        <select
                          value={row.status}
                          onChange={(e) => {
                            const next = [...plants]
                            next[i] = {
                              ...row,
                              status: e.target.value as (typeof PLANT_STATUS)[number],
                            }
                            setPlants(next)
                          }}
                        >
                          {PLANT_STATUS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'paises' && (
          <section className="entry-section">
            <div className="entry-section-head">
              <h2>Huella por país</h2>
              <p>Contribución absoluta y densidad de carbono</p>
            </div>
            <div className="entry-table-wrap">
              <table className="entry-table">
                <thead>
                  <tr>
                    <th>País</th>
                    <th>MtCO₂e</th>
                    <th>% del total</th>
                    <th>Intensidad kg/t</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((row, i) => (
                    <tr key={row.country}>
                      <td>
                        <strong>{row.country}</strong>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={row.tco2e}
                          onChange={(e) => {
                            const next = [...countries]
                            next[i] = { ...row, tco2e: e.target.value }
                            setCountries(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={row.share}
                          onChange={(e) => {
                            const next = [...countries]
                            next[i] = { ...row, share: e.target.value }
                            setCountries(next)
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.intensity}
                          onChange={(e) => {
                            const next = [...countries]
                            next[i] = { ...row, intensity: e.target.value }
                            setCountries(next)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'palancas' && (
          <section className="entry-section">
            <div className="entry-section-head">
              <h2>Palancas de descarbonización</h2>
              <p>Avance del plan y responsable por palanca</p>
            </div>
            <div className="entry-levers">
              {levers.map((lever, i) => (
                <article key={lever.id} className="entry-card">
                  <div className="entry-lever-title">
                    <h3>{lever.title}</h3>
                    <span>{lever.impact}</span>
                  </div>
                  <div className="entry-grid-2">
                    <div className="form-field">
                      <label>Potencial (texto)</label>
                      <input
                        value={lever.potential}
                        onChange={(e) => {
                          const next = [...levers]
                          next[i] = { ...lever, potential: e.target.value }
                          setLevers(next)
                        }}
                      />
                    </div>
                    <div className="form-field">
                      <label>Avance del plan %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={lever.progress}
                        onChange={(e) => {
                          const next = [...levers]
                          next[i] = { ...lever, progress: e.target.value }
                          setLevers(next)
                        }}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Responsable</label>
                    <input
                      value={lever.owner}
                      onChange={(e) => {
                        const next = [...levers]
                        next[i] = { ...lever, owner: e.target.value }
                        setLevers(next)
                      }}
                    />
                  </div>
                  <div className="form-field">
                    <label>Detalle / plan de acción</label>
                    <textarea
                      rows={3}
                      value={lever.detail}
                      onChange={(e) => {
                        const next = [...levers]
                        next[i] = { ...lever, detail: e.target.value }
                        setLevers(next)
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="entry-actions">
          <div className="entry-actions-msg">
            {savedAt ? (
              <>
                <CheckCircle2 size={16} />
                Datos guardados localmente ({savedAt}). Sin conexión a BD todavía.
              </>
            ) : (
              'Completa las pestañas y guarda el borrador cuando termines.'
            )}
          </div>
          <div className="entry-actions-btns">
            <button type="button" className="btn-ghost" onClick={handleReset}>
              <Trash2 size={16} />
              Restablecer
            </button>
            <button type="submit" className="btn-primary">
              <Save size={16} />
              Guardar borrador
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
