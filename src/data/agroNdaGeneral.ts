/** Modelo NDA General · AGRO NDA · Agroprogreso. */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const AGRO_NDA_UNIDAD = 'Agroprogreso'

/** Pesos Excel: IDA 40%, Casco 30%, Incidentes 15%, Compromisos 15%. */
export const NDA_WEIGHTS = {
  ida: 0.4,
  casco: 0.3,
  incidentes: 0.15,
  compromisos: 0.15,
} as const

export const AGRO_NDA_SEDES = [
  'Agro San Miguel',
  'Unificación Finca El Pilar',
  'Finca La Marina',
  'Aprovecham forestal Helios',
] as const

export const AGRO_NDA_PROYECTO_DEFAULT: Record<string, string> = {
  'Agro San Miguel': 'Agro San Miguel',
  'Unificación Finca El Pilar': 'Finca El Pilar',
  'Finca La Marina': 'Finca La Marina',
  'Aprovecham forestal Helios': 'Aprovecham forestal Helios',
}

export const AGRO_NDA_COORDS: Record<string, { lat: number; lng: number }> = {
  'Agro San Miguel': { lat: 14.813632, lng: -90.278771 },
  'Unificación Finca El Pilar': { lat: 14.707722, lng: -90.713167 },
  'Finca La Marina': { lat: 14.55, lng: -90.65 },
  'Aprovecham forestal Helios': { lat: 14.735452, lng: -90.703316 },
}

export type AgroNdaGeneralRecord = {
  id: string
  fecha: string
  semana: number | null
  unidadNegocio: string
  plantaSede: string
  notaIda: number | null
  cascoVerde: number | null
  incidentes: number | null
  compromisos: number | null
  nda: number | null
  proyectoMatriz: string
  latitud: number | null
  longitud: number | null
}

export type AgroNdaGeneralFormRow = {
  localId: string
  id?: string
  plantaSede: string
  proyectoMatriz: string
  notaIda: string
  cascoVerde: string
  incidentes: string
  compromisos: string
}

const MONTH_INDEX: Record<MonitoringMonth, number> = {
  Enero: 1,
  Febrero: 2,
  Marzo: 3,
  Abril: 4,
  Mayo: 5,
  Junio: 6,
  Julio: 7,
  Agosto: 8,
  Septiembre: 9,
  Octubre: 10,
  Noviembre: 11,
  Diciembre: 12,
}

/** El Excel usa día 28; "No. Semana" equivale al mes (1–12). */
export function fechaFromYearMonth(
  year: number,
  month: MonitoringMonth,
): string {
  const m = String(MONTH_INDEX[month]).padStart(2, '0')
  return `${year}-${m}-28`
}

export function semanaFromMonth(month: MonitoringMonth): number {
  return MONTH_INDEX[month]
}

export function monthFromFecha(fecha: string): MonitoringMonth | null {
  const m = Number(fecha.slice(5, 7))
  return (
    (Object.entries(MONTH_INDEX).find(([, idx]) => idx === m)?.[0] as
      | MonitoringMonth
      | undefined) ?? null
  )
}

export function yearFromFecha(fecha: string): number {
  return Number(fecha.slice(0, 4))
}

export function parseNum(value: string): number | null {
  const t = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function formatNum(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function computeNda(
  ida: number | null,
  casco: number | null,
  incidentes: number | null,
  compromisos: number | null,
): number | null {
  if (
    ida == null ||
    casco == null ||
    incidentes == null ||
    compromisos == null
  ) {
    return null
  }
  return (
    ida * NDA_WEIGHTS.ida +
    casco * NDA_WEIGHTS.casco +
    incidentes * NDA_WEIGHTS.incidentes +
    compromisos * NDA_WEIGHTS.compromisos
  )
}

export function coordsForSede(sede: string): {
  lat: number | null
  lng: number | null
} {
  const hit = AGRO_NDA_COORDS[sede]
  return hit ? { lat: hit.lat, lng: hit.lng } : { lat: null, lng: null }
}

export function emptyNdaRow(sede?: string): AgroNdaGeneralFormRow {
  const plantaSede = sede ?? AGRO_NDA_SEDES[0]
  return {
    localId: `new-${crypto.randomUUID()}`,
    plantaSede,
    proyectoMatriz: AGRO_NDA_PROYECTO_DEFAULT[plantaSede] ?? plantaSede,
    notaIda: '',
    cascoVerde: '',
    incidentes: '',
    compromisos: '',
  }
}

export function defaultMonthRows(): AgroNdaGeneralFormRow[] {
  return AGRO_NDA_SEDES.map((sede) => emptyNdaRow(sede))
}

export function formRowsFromRecords(
  records: AgroNdaGeneralRecord[],
  fecha: string,
): AgroNdaGeneralFormRow[] {
  const bySede = new Map(
    records.filter((r) => r.fecha === fecha).map((r) => [r.plantaSede, r]),
  )
  return AGRO_NDA_SEDES.map((sede) => {
    const r = bySede.get(sede)
    if (!r) return emptyNdaRow(sede)
    return {
      localId: r.id,
      id: r.id,
      plantaSede: r.plantaSede,
      proyectoMatriz:
        r.proyectoMatriz ||
        AGRO_NDA_PROYECTO_DEFAULT[sede] ||
        sede,
      notaIda: r.notaIda == null ? '' : String(r.notaIda),
      cascoVerde: r.cascoVerde == null ? '' : String(r.cascoVerde),
      incidentes: r.incidentes == null ? '' : String(r.incidentes),
      compromisos: r.compromisos == null ? '' : String(r.compromisos),
    }
  })
}

export function monthHasNda(
  records: AgroNdaGeneralRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  const fecha = fechaFromYearMonth(year, month)
  return records.some(
    (r) =>
      r.fecha === fecha &&
      (r.notaIda != null ||
        r.cascoVerde != null ||
        r.incidentes != null ||
        r.compromisos != null),
  )
}

export function ndaFromFormRow(row: AgroNdaGeneralFormRow): number | null {
  return computeNda(
    parseNum(row.notaIda),
    parseNum(row.cascoVerde),
    parseNum(row.incidentes),
    parseNum(row.compromisos),
  )
}
