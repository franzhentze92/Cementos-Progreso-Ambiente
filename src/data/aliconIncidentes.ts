/** Modelo Incidentes · Planta Alicón (sheet Incidentes · sede Alicon). */

export {
  INCIDENTE_ESTADOS,
  MONITORING_MONTHS,
  anioMesFromFecha,
  buildFecha,
  countAbiertosMes,
  formRowsFromRecords,
  formatNum,
  formatPctFromValor,
  mesTextoFromFecha,
  monthFromFecha,
  monthHasIncidentes,
  parseIntSafe,
  parseNum,
  pctToValor,
  valorToPct,
  yearFromFecha,
  type AgroIncidenteFormRow,
  type AgroIncidenteRecord,
  type MonitoringMonth,
} from './agroIncidentes'

import {
  emptyIncidenteRow as agroEmpty,
  type AgroIncidenteFormRow,
  type MonitoringMonth,
} from './agroIncidentes'

export const ALICON_INCIDENTE_UNIDAD = 'Cementos Progreso'
export const ALICON_INCIDENTE_SEDE = 'Alicon'

export const ALICON_INCIDENTE_SEDES = ['Alicon'] as const

export const ALICON_INCIDENTE_INSTRUMENTOS = [
  'Actualización Alicon',
  'Subestación Alicon',
] as const

export function emptyAliconIncidenteRow(
  year: number,
  month: MonitoringMonth,
  now = new Date(),
): AgroIncidenteFormRow {
  return {
    ...agroEmpty(year, month, now),
    plantaSede: ALICON_INCIDENTE_SEDE,
    instrumento: 'Actualización Alicon',
  }
}
