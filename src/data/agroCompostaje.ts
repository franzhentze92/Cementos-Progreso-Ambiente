/** Modelo Compostaje desechos orgánicos · Agroprogreso. */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const AGRO_COMPOSTAJE_FINCAS = [
  'Finca El Pilar',
  'Finca San Miguel',
] as const

export type AgroCompostajeFinca = (typeof AGRO_COMPOSTAJE_FINCAS)[number]

export type AgroCompostajeRecord = {
  id: string
  fecha: string
  finca: AgroCompostajeFinca
  toneladas: number | null
}

export type AgroCompostajeFormRow = {
  finca: AgroCompostajeFinca
  toneladas: string
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

/** El Excel usa el día 28 de cada mes. */
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

export function emptyMonthRows(): AgroCompostajeFormRow[] {
  return AGRO_COMPOSTAJE_FINCAS.map((finca) => ({
    finca,
    toneladas: '',
  }))
}

export function formRowsFromRecords(
  records: AgroCompostajeRecord[],
  fecha: string,
): AgroCompostajeFormRow[] {
  const byFinca = new Map(
    records
      .filter((r) => r.fecha === fecha)
      .map((r) => [r.finca, r.toneladas]),
  )
  return AGRO_COMPOSTAJE_FINCAS.map((finca) => {
    const ton = byFinca.get(finca)
    return {
      finca,
      toneladas: ton == null ? '' : String(ton),
    }
  })
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

export function monthHasData(
  records: AgroCompostajeRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  const fecha = fechaFromYearMonth(year, month)
  return records.some(
    (r) => r.fecha === fecha && r.toneladas != null && r.toneladas !== 0,
  )
}

export function totalForMonth(
  records: AgroCompostajeRecord[],
  fecha: string,
): number {
  return records
    .filter((r) => r.fecha === fecha)
    .reduce((s, r) => s + (r.toneladas ?? 0), 0)
}

export function totalForFormRows(rows: AgroCompostajeFormRow[]): number {
  return rows.reduce((s, r) => s + (parseNum(r.toneladas) ?? 0), 0)
}
