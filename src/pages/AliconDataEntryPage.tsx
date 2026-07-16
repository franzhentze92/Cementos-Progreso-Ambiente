import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  ClipboardList,
  Factory,
  FileBarChart2,
  Leaf,
  Plus,
  Save,
  ShieldAlert,
  Thermometer,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CarbonDataEntryPage } from './CarbonDataEntryPage'
import {
  DESEMPENO_ALICON_TABS,
  applyRowFormulas,
  createInitialAliconDesempenoState,
  emptyRowFor,
  isComputedColumn,
  type AliconDesempenoState,
  type DesempenoTabId,
} from '../data/desempenoAlicon'

const TAB_ICONS: Record<DesempenoTabId, LucideIcon> = {
  incidentes: ShieldAlert,
  licencias: FileBarChart2,
  'admin-corporativo': ClipboardList,
  ejecuciones: ClipboardList,
  'ejecuciones-moni': Thermometer,
  inspecciones: ClipboardList,
  'monitoreos-ambientales': Thermometer,
  nda: Calculator,
  'huella-de-carbono': Leaf,
}

type TableTabId = Exclude<DesempenoTabId, 'huella-de-carbono'>

function isTableTab(id: DesempenoTabId): id is TableTabId {
  return id !== 'huella-de-carbono'
}

export function AliconDataEntryPage() {
  const [tab, setTab] = useState<DesempenoTabId>('incidentes')
  const [state, setState] = useState<AliconDesempenoState>(() =>
    createInitialAliconDesempenoState(),
  )
  const [savedFlash, setSavedFlash] = useState(false)

  const activeDef = DESEMPENO_ALICON_TABS.find((t) => t.id === tab)

  const table = useMemo(() => {
    if (!isTableTab(tab)) return null
    return state[tab]
  }, [state, tab])

  function patchCell(rowIndex: number, colIndex: number, value: string) {
    if (!isTableTab(tab)) return
    setState((prev) => {
      const sheet = prev[tab]
      const rows = sheet.rows.map((r, i) => {
        if (i !== rowIndex) return r
        const next = [...r]
        while (next.length < sheet.headers.length) next.push('')
        next[colIndex] = value
        return applyRowFormulas(tab, next)
      })
      return { ...prev, [tab]: { ...sheet, rows } }
    })
  }

  function addRow() {
    if (!isTableTab(tab)) return
    setState((prev) => {
      const sheet = prev[tab]
      const row = emptyRowFor(tab, sheet.headers)
      return {
        ...prev,
        [tab]: { ...sheet, rows: [...sheet.rows, row] },
      }
    })
  }

  function removeRow(rowIndex: number) {
    if (!isTableTab(tab)) return
    setState((prev) => {
      const sheet = prev[tab]
      return {
        ...prev,
        [tab]: {
          ...sheet,
          rows: sheet.rows.filter((_, i) => i !== rowIndex),
        },
      }
    })
  }

  function handleSave() {
    // Persistencia remota: pendiente (igual que fase inicial de huella).
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  if (tab === 'huella-de-carbono') {
    return (
      <div className="alicon-entry-page">
        <AliconEntryChrome
          tab={tab}
          onTabChange={setTab}
          onSave={handleSave}
          savedFlash={savedFlash}
          excelSheet={null}
          description={activeDef?.description}
        />
        <CarbonDataEntryPage embedded />
      </div>
    )
  }

  return (
    <div className="alicon-entry-page entry-page">
      <AliconEntryChrome
        tab={tab}
        onTabChange={setTab}
        onSave={handleSave}
        savedFlash={savedFlash}
        excelSheet={activeDef?.excelSheet ?? null}
        description={activeDef?.description}
      />

      {table ? (
        <section className="entry-section alicon-sheet-section">
          <div className="entry-section-head alicon-sheet-head">
            <div>
              <h2>
                {activeDef?.label}
                {activeDef?.excelSheet ? (
                  <span className="alicon-excel-chip">
                    Excel: {activeDef.excelSheet}
                  </span>
                ) : null}
              </h2>
              <p>{activeDef?.description}</p>
            </div>
            <div className="alicon-sheet-actions">
              <span className="alicon-row-count">
                {table.rows.length} fila{table.rows.length === 1 ? '' : 's'}
              </span>
              <button type="button" className="btn-secondary-link" onClick={addRow}>
                <Plus size={16} />
                Agregar fila
              </button>
            </div>
          </div>

          <div className="alicon-table-wrap">
            <table className="alicon-data-table">
              <thead>
                <tr>
                  <th className="alicon-row-num">#</th>
                  {table.headers.map((h, ci) => (
                    <th key={`${h}-${ci}`}>
                      {h}
                      {isComputedColumn(tab, ci) ? (
                        <span className="hc-auto" title="Calculado automáticamente">
                          <Calculator size={11} />
                          auto
                        </span>
                      ) : null}
                    </th>
                  ))}
                  <th className="alicon-row-actions" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.headers.length + 2} className="alicon-empty">
                      Sin registros. Agrega una fila para comenzar.
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, ri) => (
                    <tr key={ri}>
                      <td className="alicon-row-num">{ri + 1}</td>
                      {table.headers.map((_, ci) => {
                        const computed = isComputedColumn(tab, ci)
                        const value = row[ci] ?? ''
                        return (
                          <td
                            key={ci}
                            className={computed ? 'is-computed' : undefined}
                          >
                            {computed ? (
                              <div className="alicon-computed" aria-live="polite">
                                {value || '—'}
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={value}
                                onChange={(e) =>
                                  patchCell(ri, ci, e.target.value)
                                }
                                aria-label={`${table.headers[ci]} fila ${ri + 1}`}
                              />
                            )}
                          </td>
                        )
                      })}
                      <td className="alicon-row-actions">
                        <button
                          type="button"
                          className="alicon-icon-btn"
                          title="Eliminar fila"
                          aria-label={`Eliminar fila ${ri + 1}`}
                          onClick={() => removeRow(ri)}
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
      ) : null}
    </div>
  )
}

function AliconEntryChrome({
  tab,
  onTabChange,
  onSave,
  savedFlash,
  excelSheet,
  description,
}: {
  tab: DesempenoTabId
  onTabChange: (t: DesempenoTabId) => void
  onSave: () => void
  savedFlash: boolean
  excelSheet: string | null
  description?: string
}) {
  return (
    <>
      <div className="page-header entry-header">
        <div>
          <p className="carbon-kicker">
            <Factory size={14} />
            Entrada de Datos · Planta Alicón
          </p>
          <h1>Captura ambiental Alicón</h1>
          <p>
            Cada pestaña replica una hoja del Excel de Desempeño Ambiental (más
            Huella de Carbono). Los campos <em>auto</em> aplican las fórmulas del
            libro.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/operaciones/planta-alicon/huella-de-carbono"
            className="btn-secondary-link"
          >
            Ver operaciones →
          </Link>
          <button type="button" className="btn-primary" onClick={onSave}>
            <Save size={16} />
            Guardar
          </button>
        </div>
      </div>

      {savedFlash ? (
        <div className="hc-banner hc-banner-ok" role="status">
          Datos listos en memoria local. Persistencia en servidor próximamente.
        </div>
      ) : null}

      <div className="entry-summary hc-summary">
        <div>
          <span>Ámbito</span>
          <strong>Planta Alicón / CEMPRO</strong>
        </div>
        <div>
          <span>Pestaña activa</span>
          <strong>
            {DESEMPENO_ALICON_TABS.find((t) => t.id === tab)?.label}
          </strong>
        </div>
        <div>
          <span>Hoja Excel</span>
          <strong>{excelSheet ?? 'huella-carbono-alicon.xlsx'}</strong>
        </div>
      </div>

      {description ? (
        <p className="alicon-tab-hint">{description}</p>
      ) : null}

      <nav className="entry-tabs alicon-entry-tabs" aria-label="Pestañas Planta Alicón">
        {DESEMPENO_ALICON_TABS.map(({ id, label }) => {
          const Icon = TAB_ICONS[id]
          return (
            <button
              key={id}
              type="button"
              className={tab === id ? 'active' : ''}
              onClick={() => onTabChange(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          )
        })}
      </nav>
    </>
  )
}
