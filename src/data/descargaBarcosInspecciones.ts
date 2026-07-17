/** Modelo Inspección · Descarga Barcos (ejecuciones_inspecciones). */

export {
  ACCION_INMEDIATA,
  MATERIALES_DESCARGA,
  MONITORING_MONTHS,
  NIVELES_RIESGO,
  avgResultadoForMonth,
  buildFecha,
  formRowsFromRecords,
  formatNum,
  monthFromFecha,
  monthHasInspections,
  monthIndex,
  parseIntSafe,
  parseNum,
  weekFromFecha,
  yearFromFecha,
  type AgroInspeccionFormRow,
  type AgroInspeccionRecord,
  type MaterialDescarga,
  type MonitoringMonth,
} from './agroInspecciones'

import {
  emptyInspeccionRow as agroEmpty,
  type AgroInspeccionFormRow,
  type MonitoringMonth,
} from './agroInspecciones'

export const DESCARGA_BARCOS_INSPECCION_UNIDAD = 'Descarga Barcos'
export const DESCARGA_BARCOS_INSPECCION_SEDE = 'Descarga Barcos'

export const DESCARGA_BARCOS_INSPECCION_SEDES = [
  'Descarga Barcos',
] as const

export function emptyDescargaBarcosInspeccionRow(
  year: number,
  month: MonitoringMonth,
  now = new Date(),
): AgroInspeccionFormRow {
  return {
    ...agroEmpty(year, month, now),
    plantaSede: DESCARGA_BARCOS_INSPECCION_SEDE,
    responsable: '',
    materialDescarga: '',
  }
}

export function parseMaterialDescarga(raw: string): string | null {
  const t = raw.trim().toLowerCase()
  if (/^clinker$|^cl[ií]nker$/.test(t)) return 'Clinker'
  if (/^coque$|^coke$/.test(t)) return 'Coque'
  return null
}
