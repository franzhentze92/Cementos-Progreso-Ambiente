/** Modelo alineado a Ejecuciones inspecciones (Desempeño Ambiental.xlsx) · ámbito Agroprogreso. */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const AGRO_INSPECCION_UNIDAD = 'Agroprogreso'

export const AGRO_INSPECCION_SEDES = [
  'Finca El Pilar',
  'Finca San Miguel',
  'Finca La Marina',
  'Aprov. Forestal SG',
] as const

export type AgroInspeccionSede = (typeof AGRO_INSPECCION_SEDES)[number]

export const NIVELES_RIESGO = ['Bajo', 'Medio', 'Alto'] as const
export const ACCION_INMEDIATA = ['No', 'Si'] as const

export type AgroInspeccionRecord = {
  id: string
  dia: number
  mes: MonitoringMonth
  anio: number
  semana: number | null
  fecha: string
  unidadNegocio: string
  plantaSede: string
  responsable: string
  resultadoGeneral: number | null
  numHallazgos: number | null
  nivelRiesgo: string
  requiereAccionInmediata: string
  observaciones: string
  informe: string
  link: string
}

export type AgroInspeccionFormRow = {
  localId: string
  id?: string
  dia: string
  plantaSede: string
  responsable: string
  resultadoGeneral: string
  numHallazgos: string
  nivelRiesgo: string
  requiereAccionInmediata: string
  observaciones: string
  informe: string
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

export function monthIndex(month: MonitoringMonth): number {
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

export function buildFecha(
  year: number,
  month: MonitoringMonth,
  dia: number,
): string {
  const m = String(MONTH_INDEX[month]).padStart(2, '0')
  const d = String(Math.min(Math.max(dia, 1), 31)).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** Semana ISO aproximada (1–53) a partir de la fecha. */
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

export function emptyInspeccionRow(
  year: number,
  month: MonitoringMonth,
  now = new Date(),
): AgroInspeccionFormRow {
  const defaultDia =
    year === now.getFullYear() && MONTH_INDEX[month] === now.getMonth() + 1
      ? String(now.getDate())
      : '1'
  return {
    localId: `new-${crypto.randomUUID()}`,
    dia: defaultDia,
    plantaSede: 'Finca El Pilar',
    responsable: 'Javier Paniagua',
    resultadoGeneral: '',
    numHallazgos: '0',
    nivelRiesgo: 'Bajo',
    requiereAccionInmediata: 'No',
    observaciones: '',
    informe: 'Abrir informe',
    link: '',
  }
}

export function formRowsFromRecords(
  records: AgroInspeccionRecord[],
  year: number,
  month: MonitoringMonth,
): AgroInspeccionFormRow[] {
  return records
    .filter((r) => r.anio === year && r.mes === month)
    .sort((a, b) => a.dia - b.dia || a.plantaSede.localeCompare(b.plantaSede))
    .map((r) => ({
      localId: r.id,
      id: r.id,
      dia: String(r.dia),
      plantaSede: r.plantaSede,
      responsable: r.responsable,
      resultadoGeneral:
        r.resultadoGeneral == null ? '' : String(r.resultadoGeneral),
      numHallazgos: r.numHallazgos == null ? '' : String(r.numHallazgos),
      nivelRiesgo: r.nivelRiesgo,
      requiereAccionInmediata: r.requiereAccionInmediata,
      observaciones: r.observaciones,
      informe: r.informe || 'Abrir informe',
      link: r.link,
    }))
}

export function monthHasInspections(
  records: AgroInspeccionRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  return records.some((r) => r.anio === year && r.mes === month)
}

export function avgResultadoForMonth(
  records: AgroInspeccionRecord[],
  year: number,
  month: MonitoringMonth,
): number | null {
  const vals = records
    .filter(
      (r) =>
        r.anio === year &&
        r.mes === month &&
        r.resultadoGeneral != null &&
        !Number.isNaN(r.resultadoGeneral),
    )
    .map((r) => r.resultadoGeneral as number)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
