/** Modelo Capacitaciones · hoja Ejecuciones (Desempeño Ambiental.xlsx) · Agroprogreso. */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const AGRO_CAPACITACION_UNIDAD = 'Agroprogreso'
export const AGRO_CAPACITACION_TIPO = 'Capacitaciones'

export const AGRO_CAPACITACION_SEDES = [
  'Finca El Pilar',
  'Agro SM',
  'Finca San Miguel',
  'Finca La Marina',
] as const

export const AGRO_CAPACITACION_DETALLES = [
  'Agua y residuos',
  'Derrames + taller derrames',
  'Derrames',
  'Manejo serpientes / Guía biodiversidad',
] as const

export const AGRO_CAPACITACION_PUBLICOS = [
  'Personal interno',
  'Comunitarios',
] as const

export const AGRO_CAPACITACION_ESTADOS = [
  'Programado',
  'Ejecutado',
  'Reprogramado',
] as const

/** Coords de referencia para mapa (fincas Agro). */
export const AGRO_SEDE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Finca El Pilar': { lat: 14.707722, lng: -90.713167 },
  'Agro SM': { lat: 14.813632, lng: -90.278771 },
  'Finca San Miguel': { lat: 14.813632, lng: -90.278771 },
  'Finca La Marina': { lat: 14.55, lng: -90.65 },
}

export type AgroCapacitacionRecord = {
  id: string
  anio: number
  unidadNegocio: string
  plantaSede: string
  tipoEjecucion: string
  detalle: string
  publicoObjetivo: string
  fechaInicio: string
  fechaFin: string
  estado: string
  comentarios: string
  latitud: number | null
  longitud: number | null
}

export type AgroCapacitacionFormRow = {
  localId: string
  id?: string
  diaInicio: string
  diaFin: string
  plantaSede: string
  detalle: string
  publicoObjetivo: string
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

export function buildFecha(
  year: number,
  month: MonitoringMonth,
  dia: number,
): string {
  const m = String(MONTH_INDEX[month]).padStart(2, '0')
  const maxDay = new Date(year, MONTH_INDEX[month], 0).getDate()
  const d = String(Math.min(Math.max(dia, 1), maxDay)).padStart(2, '0')
  return `${year}-${m}-${d}`
}

export function parseIntSafe(value: string): number | null {
  const t = String(value ?? '').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n) : null
}

export function formatNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function emptyCapacitacionRow(
  year: number,
  month: MonitoringMonth,
  now = new Date(),
): AgroCapacitacionFormRow {
  const defaultDia =
    year === now.getFullYear() && MONTH_INDEX[month] === now.getMonth() + 1
      ? String(now.getDate())
      : '1'
  return {
    localId: `new-${crypto.randomUUID()}`,
    diaInicio: defaultDia,
    diaFin: defaultDia,
    plantaSede: 'Finca El Pilar',
    detalle: 'Agua y residuos',
    publicoObjetivo: 'Personal interno',
    estado: 'Programado',
    comentarios: 'Confirmado',
  }
}

export function formRowsFromRecords(
  records: AgroCapacitacionRecord[],
  year: number,
  month: MonitoringMonth,
): AgroCapacitacionFormRow[] {
  return records
    .filter((r) => {
      const m = monthFromFecha(r.fechaInicio)
      return yearFromFecha(r.fechaInicio) === year && m === month
    })
    .sort((a, b) =>
      a.fechaInicio === b.fechaInicio
        ? a.plantaSede.localeCompare(b.plantaSede)
        : a.fechaInicio.localeCompare(b.fechaInicio),
    )
    .map((r) => ({
      localId: r.id,
      id: r.id,
      diaInicio: String(Number(r.fechaInicio.slice(8, 10))),
      diaFin: String(Number(r.fechaFin.slice(8, 10))),
      plantaSede: r.plantaSede,
      detalle: r.detalle,
      publicoObjetivo: r.publicoObjetivo,
      estado: r.estado,
      comentarios: r.comentarios,
    }))
}

export function monthHasCapacitaciones(
  records: AgroCapacitacionRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  return records.some((r) => {
    const m = monthFromFecha(r.fechaInicio)
    return yearFromFecha(r.fechaInicio) === year && m === month
  })
}

export function coordsForSede(sede: string): {
  lat: number | null
  lng: number | null
} {
  const hit = AGRO_SEDE_COORDS[sede]
  return hit ? { lat: hit.lat, lng: hit.lng } : { lat: null, lng: null }
}
