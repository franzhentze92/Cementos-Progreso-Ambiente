/** Schemas y seed alineados a Desempeño Ambiental.xlsx (tabs aplicables a Planta Alicón / CEMPRO). */

import seed from './desempenoAliconSeed.json'

export type DesempenoTabId =
  | 'incidentes'
  | 'licencias'
  | 'admin-corporativo'
  | 'ejecuciones'
  | 'ejecuciones-moni'
  | 'inspecciones'
  | 'monitoreos-ambientales'
  | 'nda'
  | 'huella-de-carbono'

export type DesempenoSheetKey =
  | 'Incidentes'
  | 'C. Admin Licencias'
  | 'C. Admin corporativo'
  | 'Ejecuciones'
  | 'Ejecuciones Moni'
  | 'Ejecuciones inspecciones'
  | 'Monitoreos ambientales'
  | 'AGRO NDA'

export type DesempenoTabDef = {
  id: DesempenoTabId
  label: string
  excelSheet: DesempenoSheetKey | null
  description: string
}

/** Una tab por pestaña del Excel (más Huella de Carbono del workbook Alicon). */
export const DESEMPENO_ALICON_TABS: DesempenoTabDef[] = [
  {
    id: 'incidentes',
    label: 'Incidentes',
    excelSheet: 'Incidentes',
    description:
      'Registro de incidentes ambientales. Año Mes y Mes texto se calculan desde Fecha.',
  },
  {
    id: 'licencias',
    label: 'Licencias',
    excelSheet: 'C. Admin Licencias',
    description: 'Catálogo de licencias e instrumentos ambientales (C. Admin Licencias).',
  },
  {
    id: 'admin-corporativo',
    label: 'Admin corporativo',
    excelSheet: 'C. Admin corporativo',
    description: 'Trámites y solicitudes de administración corporativa ambiental.',
  },
  {
    id: 'ejecuciones',
    label: 'Ejecuciones',
    excelSheet: 'Ejecuciones',
    description: 'Capacitaciones y ejecuciones programadas / realizadas.',
  },
  {
    id: 'ejecuciones-moni',
    label: 'Ejecuciones Moni',
    excelSheet: 'Ejecuciones Moni',
    description: 'Programación y seguimiento de monitoreos ambientales.',
  },
  {
    id: 'inspecciones',
    label: 'Inspecciones',
    excelSheet: 'Ejecuciones inspecciones',
    description: 'Inspecciones de campo (resultado, hallazgos, riesgo, evidencia).',
  },
  {
    id: 'monitoreos-ambientales',
    label: 'Monitoreos ambientales',
    excelSheet: 'Monitoreos ambientales',
    description:
      'Resultados analíticos por parámetro (agua). Una fila por parámetro muestreado.',
  },
  {
    id: 'nda',
    label: 'NDA',
    excelSheet: 'AGRO NDA',
    description:
      'Scorecard NDA. Fórmula: IDA×40% + Casco verde×30% + Incidentes×15% + Compromisos×15%.',
  },
  {
    id: 'huella-de-carbono',
    label: 'Huella de carbono',
    excelSheet: null,
    description:
      'Captura mensual Alicon (huella-carbono-alicon.xlsx): Producción, Combustible, Energía, Insumos, Agua, Residuos y Biodiversidad.',
  },
]

type SeedSheet = { headers: string[]; rows: string[][] }

const SEED = seed as Record<DesempenoSheetKey, SeedSheet>

export type SheetTableState = {
  headers: string[]
  rows: string[][]
}

export type AliconDesempenoState = {
  incidentes: SheetTableState
  licencias: SheetTableState
  'admin-corporativo': SheetTableState
  ejecuciones: SheetTableState
  'ejecuciones-moni': SheetTableState
  inspecciones: SheetTableState
  'monitoreos-ambientales': SheetTableState
  nda: SheetTableState
}

const TAB_TO_SHEET: Record<Exclude<DesempenoTabId, 'huella-de-carbono'>, DesempenoSheetKey> =
  {
    incidentes: 'Incidentes',
    licencias: 'C. Admin Licencias',
    'admin-corporativo': 'C. Admin corporativo',
    ejecuciones: 'Ejecuciones',
    'ejecuciones-moni': 'Ejecuciones Moni',
    inspecciones: 'Ejecuciones inspecciones',
    'monitoreos-ambientales': 'Monitoreos ambientales',
    nda: 'AGRO NDA',
  }

function cloneSheet(key: DesempenoSheetKey): SheetTableState {
  const src = SEED[key]
  return {
    headers: [...src.headers],
    rows: src.rows.map((r) => [...r]),
  }
}

export function createInitialAliconDesempenoState(): AliconDesempenoState {
  return {
    incidentes: cloneSheet('Incidentes'),
    licencias: cloneSheet('C. Admin Licencias'),
    'admin-corporativo': cloneSheet('C. Admin corporativo'),
    ejecuciones: cloneSheet('Ejecuciones'),
    'ejecuciones-moni': cloneSheet('Ejecuciones Moni'),
    inspecciones: cloneSheet('Ejecuciones inspecciones'),
    'monitoreos-ambientales': cloneSheet('Monitoreos ambientales'),
    nda: cloneSheet('AGRO NDA'),
  }
}

function parseNum(v: string): number | null {
  const t = String(v ?? '')
    .trim()
    .replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const MES_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const

/** =DATE(YEAR(A), MONTH(A), 1) → YYYY-MM-01 */
export function calcAnioMes(fecha: string): string {
  const d = parseDate(fecha)
  if (!d) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}-01`
}

/** =TEXT(A,"mmm yyyy") estilo Excel es-ES aproximado */
export function calcMesTexto(fecha: string): string {
  const d = parseDate(fecha)
  if (!d) return ''
  return `${MES_ES[d.getMonth()]} ${d.getFullYear()}`
}

function parseDate(fecha: string): Date | null {
  const t = String(fecha ?? '').trim()
  if (!t) return null
  // YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t)
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

/** NDA = E*0.4 + F*0.3 + G*0.15 + H*0.15 */
export function calcNda(
  ida: string,
  casco: string,
  incidentes: string,
  compromisos: string,
): string {
  const e = parseNum(ida)
  const f = parseNum(casco)
  const g = parseNum(incidentes)
  const h = parseNum(compromisos)
  if (e === null && f === null && g === null && h === null) return ''
  const val =
    (e ?? 0) * 0.4 + (f ?? 0) * 0.3 + (g ?? 0) * 0.15 + (h ?? 0) * 0.15
  return String(Number(val.toFixed(4)))
}

export function applyIncidentesFormulas(row: string[]): string[] {
  const next = [...row]
  while (next.length < 13) next.push('')
  next[1] = calcAnioMes(next[0] ?? '')
  next[2] = calcMesTexto(next[0] ?? '')
  return next
}

export function applyNdaFormulas(row: string[]): string[] {
  const next = [...row]
  while (next.length < 10) next.push('')
  next[8] = calcNda(next[4], next[5], next[6], next[7])
  return next
}

export function applyRowFormulas(
  tab: Exclude<DesempenoTabId, 'huella-de-carbono'>,
  row: string[],
): string[] {
  if (tab === 'incidentes') return applyIncidentesFormulas(row)
  if (tab === 'nda') return applyNdaFormulas(row)
  return row
}

export function emptyRowFor(
  tab: Exclude<DesempenoTabId, 'huella-de-carbono'>,
  headers: string[],
): string[] {
  const row = headers.map(() => '')
  return applyRowFormulas(tab, row)
}

export function isComputedColumn(
  tab: Exclude<DesempenoTabId, 'huella-de-carbono'>,
  colIndex: number,
): boolean {
  if (tab === 'incidentes') return colIndex === 1 || colIndex === 2
  if (tab === 'nda') return colIndex === 8
  return false
}

export function sheetKeyForTab(
  tab: Exclude<DesempenoTabId, 'huella-de-carbono'>,
): DesempenoSheetKey {
  return TAB_TO_SHEET[tab]
}
