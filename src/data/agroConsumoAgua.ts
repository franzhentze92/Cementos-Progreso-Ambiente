/** Modelo alineado a la hoja AGRO Consumo de agua (Desempeño Ambiental.xlsx). */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const AGRO_SEDES = {
  'Finca El Pilar': [
    'Bunker',
    'Casa patronal',
    'Habitaciones',
    'Aserradero Antiguo',
  ],
  'Finca San Miguel': [
    'Instalaciones',
    'Garita Casa Patronal',
    'Tanque Casa Patronal',
    'Pozo Vivero',
    'Tanque Oratorio',
  ],
} as const

export type AgroSede = keyof typeof AGRO_SEDES

export type AgroConsumoAguaRecord = {
  id: string
  fecha: string
  sede: AgroSede
  sitioConsumo: string
  consumoM3: number | null
}

export type AgroConsumoFormRow = {
  sede: AgroSede
  sitioConsumo: string
  consumoM3: string
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

export function cellKey(sede: string, sitio: string): string {
  return `${sede}::${sitio}`
}

/** El Excel usa el día 28 de cada mes como fecha de registro. */
export function fechaFromYearMonth(
  year: number,
  month: MonitoringMonth,
): string {
  const m = String(MONTH_INDEX[month]).padStart(2, '0')
  return `${year}-${m}-28`
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

export function allSitioRows(): AgroConsumoFormRow[] {
  return (Object.entries(AGRO_SEDES) as [AgroSede, readonly string[]][]).flatMap(
    ([sede, sitios]) =>
      sitios.map((sitioConsumo) => ({
        sede,
        sitioConsumo,
        consumoM3: '',
      })),
  )
}

export function parseNum(value: string): number | null {
  const t = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function formatNum(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function formRowsFromRecords(
  records: AgroConsumoAguaRecord[],
  fecha: string,
): AgroConsumoFormRow[] {
  const byKey = new Map(
    records
      .filter((r) => r.fecha === fecha)
      .map((r) => [cellKey(r.sede, r.sitioConsumo), r]),
  )

  return allSitioRows().map((row) => {
    const hit = byKey.get(cellKey(row.sede, row.sitioConsumo))
    return {
      ...row,
      consumoM3:
        hit?.consumoM3 == null ? '' : String(hit.consumoM3),
    }
  })
}

export function monthHasData(
  records: AgroConsumoAguaRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  const fecha = fechaFromYearMonth(year, month)
  return records.some(
    (r) =>
      r.fecha === fecha &&
      r.consumoM3 != null &&
      !Number.isNaN(r.consumoM3),
  )
}

export function totalConsumoForMonth(
  records: AgroConsumoAguaRecord[],
  year: number,
  month: MonitoringMonth,
): number | null {
  const fecha = fechaFromYearMonth(year, month)
  const vals = records
    .filter((r) => r.fecha === fecha && r.consumoM3 != null)
    .map((r) => r.consumoM3 as number)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0)
}
