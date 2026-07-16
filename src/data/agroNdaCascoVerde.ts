/** Modelo NDA Casco Verde · AGRO NDA Casco verde · Agroprogreso. */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const AGRO_NDA_CV_UNIDAD = 'Agroprogreso'
export const AGRO_NDA_CV_TIPO = 'Casco Verde'

export const AGRO_NDA_CV_SEDES = [
  'Finca El Pilar',
  'Agro San Miguel',
  'Finca La Marina',
  'Aprov. Forestal Planta San Gabriel',
] as const

export const AGRO_NDA_CV_INSPECTORES = [
  'Javier Paniagua',
  'Eduardo Barillas',
  'Alejandro Juarez',
] as const

export const AGRO_NDA_CV_COORDS: Record<string, { lat: number; lng: number }> =
  {
    'Finca El Pilar': { lat: 14.707722, lng: -90.713167 },
    'Agro San Miguel': { lat: 14.813632, lng: -90.278771 },
    'Finca La Marina': { lat: 14.55, lng: -90.65 },
    'Aprov. Forestal Planta San Gabriel': {
      lat: 14.735452,
      lng: -90.703316,
    },
  }

export type AgroNdaCascoVerdeRecord = {
  id: string
  fecha: string
  semana: number | null
  unidadNegocio: string
  plantaSede: string
  tipoInspeccion: string
  noInspeccion: number | null
  inspector: string
  nota: number | null
  hallazgosCriticos: number
  observaciones: string
  link: string
  latitud: number | null
  longitud: number | null
}

export type AgroNdaCascoVerdeFormRow = {
  localId: string
  id?: string
  dia: string
  plantaSede: string
  noInspeccion: string
  inspector: string
  nota: string
  hallazgosCriticos: string
  observaciones: string
  link: string
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

export function buildFecha(
  year: number,
  month: MonitoringMonth,
  dia: number,
): string {
  const m = String(MONTH_INDEX[month]).padStart(2, '0')
  const d = String(Math.min(Math.max(dia, 1), 31)).padStart(2, '0')
  return `${year}-${m}-${d}`
}

export function weekFromFecha(fecha: string): number {
  const dt = new Date(`${fecha}T12:00:00`)
  const tmp = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function parseNum(value: string): number | null {
  const t = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function parseIntSafe(value: string): number | null {
  const n = parseNum(value)
  if (n == null) return null
  return Math.round(n)
}

export function formatNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function coordsForSede(sede: string): {
  lat: number | null
  lng: number | null
} {
  const hit = AGRO_NDA_CV_COORDS[sede]
  return hit ? { lat: hit.lat, lng: hit.lng } : { lat: null, lng: null }
}

export function emptyCascoVerdeRow(nextNo = 1): AgroNdaCascoVerdeFormRow {
  return {
    localId: `new-${crypto.randomUUID()}`,
    dia: '1',
    plantaSede: 'Finca El Pilar',
    noInspeccion: String(nextNo),
    inspector: 'Javier Paniagua',
    nota: '100',
    hallazgosCriticos: '0',
    observaciones: 'No se observaron incidentes.',
    link: '',
  }
}

export function formRowsFromRecords(
  records: AgroNdaCascoVerdeRecord[],
  year: number,
  month: MonitoringMonth,
): AgroNdaCascoVerdeFormRow[] {
  return records
    .filter(
      (r) =>
        yearFromFecha(r.fecha) === year && monthFromFecha(r.fecha) === month,
    )
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        (a.noInspeccion ?? 0) - (b.noInspeccion ?? 0),
    )
    .map((r) => ({
      localId: r.id,
      id: r.id,
      dia: String(Number(r.fecha.slice(8, 10))),
      plantaSede: r.plantaSede,
      noInspeccion: r.noInspeccion == null ? '' : String(r.noInspeccion),
      inspector: r.inspector,
      nota: r.nota == null ? '' : String(r.nota),
      hallazgosCriticos: String(r.hallazgosCriticos ?? 0),
      observaciones: r.observaciones,
      link: r.link,
    }))
}

export function monthHasCascoVerde(
  records: AgroNdaCascoVerdeRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  return records.some(
    (r) =>
      yearFromFecha(r.fecha) === year && monthFromFecha(r.fecha) === month,
  )
}

export function avgNotaForMonth(
  records: AgroNdaCascoVerdeRecord[],
  year: number,
  month: MonitoringMonth,
): number | null {
  const scores = records
    .filter(
      (r) =>
        yearFromFecha(r.fecha) === year &&
        monthFromFecha(r.fecha) === month &&
        r.nota != null,
    )
    .map((r) => r.nota as number)
  if (!scores.length) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}
