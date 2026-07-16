/** Modelo Monitoreo ambiental · Planta Alicón (hoja Ejecuciones Moni). */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const ALICON_MONITOREO_UNIDAD = 'Cementos Progreso'

export const ALICON_MONITOREO_SEDES = [
  'Alicon',
  'Subestación Alicon',
] as const

export const ALICON_TIPOS_MONITOREO = ['Interno', 'Externo'] as const

export const ALICON_MONITOREO_PARAMETROS = [
  'MP, Gases, ruido',
  'ARO',
  'ARE',
] as const

export const ALICON_MONITOREO_COMPARACIONES = [
  'OMS',
  'Reuso',
  'Cuerpo receptor',
] as const

export const ALICON_MONITOREO_MOTIVOS = [
  'Control',
  'Compromiso ambiental',
] as const

export const ALICON_MONITOREO_ESTADOS = ['Ejecutado', 'Programado'] as const

export type AliconMonitoreoRecord = {
  id: string
  anio: number
  unidadNegocio: string
  plantaSede: string
  tipoMonitoreo: string
  parametro: string
  puntos: number | null
  referencia: string
  comparacion: string
  motivo: string
  fechaInicio: string
  fechaFin: string | null
  estado: string
  comentarios: string
}

export type AliconMonitoreoFormRow = {
  localId: string
  id?: string
  plantaSede: string
  tipoMonitoreo: string
  parametro: string
  puntos: string
  referencia: string
  comparacion: string
  motivo: string
  fechaInicio: string
  fechaFin: string
  estado: string
  comentarios: string
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

export function defaultFechaInicio(
  year: number,
  month: MonitoringMonth,
  now = new Date(),
): string {
  const mi = MONTH_INDEX[month]
  const dia =
    year === now.getFullYear() && mi === now.getMonth() + 1
      ? now.getDate()
      : 1
  const maxDay = new Date(year, mi, 0).getDate()
  const d = String(Math.min(Math.max(dia, 1), maxDay)).padStart(2, '0')
  return `${year}-${String(mi).padStart(2, '0')}-${d}`
}

export function parseIntSafe(value: string): number | null {
  const t = String(value ?? '').trim()
  if (!t) return null
  const n = Number(t.replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Math.round(n)
}

export function formatNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function emptyAliconMonitoreoRow(
  year: number,
  month: MonitoringMonth,
  now = new Date(),
): AliconMonitoreoFormRow {
  const inicio = defaultFechaInicio(year, month, now)
  return {
    localId: `new-${crypto.randomUUID()}`,
    plantaSede: 'Alicon',
    tipoMonitoreo: 'Interno',
    parametro: 'MP, Gases, ruido',
    puntos: '1',
    referencia: '',
    comparacion: 'OMS',
    motivo: 'Control',
    fechaInicio: inicio,
    fechaFin: inicio,
    estado: 'Programado',
    comentarios: '',
  }
}

export function formRowsFromRecords(
  records: AliconMonitoreoRecord[],
  year: number,
  month: MonitoringMonth,
): AliconMonitoreoFormRow[] {
  return records
    .filter(
      (r) =>
        yearFromFecha(r.fechaInicio) === year &&
        monthFromFecha(r.fechaInicio) === month,
    )
    .sort((a, b) =>
      a.fechaInicio === b.fechaInicio
        ? a.plantaSede.localeCompare(b.plantaSede) ||
          a.parametro.localeCompare(b.parametro)
        : a.fechaInicio.localeCompare(b.fechaInicio),
    )
    .map((r) => ({
      localId: r.id,
      id: r.id,
      plantaSede: r.plantaSede,
      tipoMonitoreo: r.tipoMonitoreo,
      parametro: r.parametro,
      puntos: r.puntos == null ? '' : String(r.puntos),
      referencia: r.referencia,
      comparacion: r.comparacion,
      motivo: r.motivo,
      fechaInicio: r.fechaInicio,
      fechaFin: r.fechaFin ?? r.fechaInicio,
      estado: r.estado,
      comentarios: r.comentarios,
    }))
}

export function monthHasMonitoreos(
  records: AliconMonitoreoRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  return records.some(
    (r) =>
      yearFromFecha(r.fechaInicio) === year &&
      monthFromFecha(r.fechaInicio) === month,
  )
}

export function countByEstadoMes(
  records: AliconMonitoreoRecord[],
  year: number,
  month: MonitoringMonth,
  estado: string,
): number {
  return records.filter(
    (r) =>
      yearFromFecha(r.fechaInicio) === year &&
      monthFromFecha(r.fechaInicio) === month &&
      r.estado.toLowerCase() === estado.toLowerCase(),
  ).length
}
