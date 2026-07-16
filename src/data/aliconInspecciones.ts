/** Modelo Inspección ambiental · Planta Alicón (hoja Ejecuciones inspecciones · sede Alicon). */

export {
  ACCION_INMEDIATA,
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
  type MonitoringMonth,
} from './agroInspecciones'

import {
  emptyInspeccionRow as agroEmpty,
  type AgroInspeccionFormRow,
  type MonitoringMonth,
} from './agroInspecciones'

/** Valor canónico al guardar (el Excel legado usa el typo «Cementos Progeso»). */
export const ALICON_INSPECCION_UNIDAD = 'Cementos Progreso'
export const ALICON_INSPECCION_SEDE = 'Alicon'

export const ALICON_INSPECCION_SEDES = ['Alicon'] as const

export function emptyAliconInspeccionRow(
  year: number,
  month: MonitoringMonth,
  now = new Date(),
): AgroInspeccionFormRow {
  return {
    ...agroEmpty(year, month, now),
    plantaSede: ALICON_INSPECCION_SEDE,
    responsable: 'Javier Paniagua',
  }
}
