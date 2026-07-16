/** Modelo alineado a Monitoreos ambientales (Desempeño Ambiental.xlsx) · Agroprogreso. */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const AGRO_MONITOREO_UNIDAD = 'Agroprogreso'

export const AGRO_MONITOREO_SEDES = [
  'Finca El Pilar',
  'Finca San Miguel',
  'Finca La Marina',
] as const

export const AGRO_MONITOREO_PUNTOS = [
  'Biodigestor casa patronal',
] as const

export const AGRO_TIPOS_AGUA = [
  'Agua ordinaria',
  'Agua residual',
  'Agua superficial',
] as const

export const CUMPLE_OPCIONES = ['Si', 'No'] as const

/** Plantilla fija de parámetros del Excel (misma estructura por muestreo). */
export const AGRO_MONITOREO_PARAMETROS = [
  'Color aparente',
  'Temperatura',
  'Grasas y aceites',
  'Materia flotante',
  'Sólidos suspendidos',
  'Nitrógeno total',
  'Fósforo total',
  'pH',
  'Coliformes fecales',
  'Color verdadero',
  'DQO',
  'DBO',
  'Relación DBO/DQO',
  'Relación DQO/DBO',
  'Sólidos sedimentables',
  'Caudal',
] as const

export type AgroMonitoreoRecord = {
  id: string
  fecha: string
  unidadNegocio: string
  plantaSede: string
  puntoMuestreo: string
  tipoAgua: string
  parametro: string
  resultado: number | null
  unidad: string
  limitePermisible: string
  cumple: string
  observaciones: string
  latitud: number | null
  longitud: number | null
}

export type AgroMonitoreoParamRow = {
  localId: string
  id?: string
  parametro: string
  resultado: string
  unidad: string
  limitePermisible: string
  cumple: string
  observaciones: string
}

export type AgroMonitoreoHeader = {
  dia: string
  plantaSede: string
  puntoMuestreo: string
  tipoAgua: string
  latitud: string
  longitud: string
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

export function formatNum(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function emptyHeader(
  year: number,
  month: MonitoringMonth,
  now = new Date(),
): AgroMonitoreoHeader {
  const defaultDia =
    year === now.getFullYear() && MONTH_INDEX[month] === now.getMonth() + 1
      ? String(now.getDate())
      : '8'
  return {
    dia: defaultDia,
    plantaSede: 'Finca El Pilar',
    puntoMuestreo: 'Biodigestor casa patronal',
    tipoAgua: 'Agua ordinaria',
    latitud: '14.707722',
    longitud: '-90.713167',
  }
}

export function emptyParamRows(): AgroMonitoreoParamRow[] {
  return AGRO_MONITOREO_PARAMETROS.map((parametro, i) => ({
    localId: `tpl-${i}-${parametro}`,
    parametro,
    resultado: '',
    unidad: '',
    limitePermisible: 'No aplica',
    cumple: 'Si',
    observaciones: '',
  }))
}

export function formFromRecords(
  records: AgroMonitoreoRecord[],
  year: number,
  month: MonitoringMonth,
): { header: AgroMonitoreoHeader; rows: AgroMonitoreoParamRow[] } {
  const forMonth = records.filter((r) => {
    const m = monthFromFecha(r.fecha)
    return yearFromFecha(r.fecha) === year && m === month
  })

  if (!forMonth.length) {
    return { header: emptyHeader(year, month), rows: emptyParamRows() }
  }

  // Usa el muestreo más reciente del mes (misma fecha+sede+punto)
  const sorted = [...forMonth].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const fecha = sorted[0].fecha
  const sede = sorted[0].plantaSede
  const punto = sorted[0].puntoMuestreo
  const campaign = forMonth.filter(
    (r) =>
      r.fecha === fecha &&
      r.plantaSede === sede &&
      r.puntoMuestreo === punto,
  )
  const sample = campaign[0]
  const byParam = new Map(campaign.map((r) => [r.parametro, r]))

  const header: AgroMonitoreoHeader = {
    dia: String(Number(fecha.slice(8, 10))),
    plantaSede: sample.plantaSede,
    puntoMuestreo: sample.puntoMuestreo,
    tipoAgua: sample.tipoAgua || 'Agua ordinaria',
    latitud: sample.latitud == null ? '' : String(sample.latitud),
    longitud: sample.longitud == null ? '' : String(sample.longitud),
  }

  const used = new Set<string>()
  const rows: AgroMonitoreoParamRow[] = AGRO_MONITOREO_PARAMETROS.map(
    (parametro, i) => {
      const hit = byParam.get(parametro)
      if (hit) used.add(hit.id)
      return {
        localId: hit?.id ?? `tpl-${i}-${parametro}`,
        id: hit?.id,
        parametro,
        resultado: hit?.resultado == null ? '' : String(hit.resultado),
        unidad: hit?.unidad ?? '',
        limitePermisible: hit?.limitePermisible || 'No aplica',
        cumple: hit?.cumple || 'Si',
        observaciones: hit?.observaciones ?? '',
      }
    },
  )

  for (const r of campaign) {
    if (used.has(r.id)) continue
    rows.push({
      localId: r.id,
      id: r.id,
      parametro: r.parametro,
      resultado: r.resultado == null ? '' : String(r.resultado),
      unidad: r.unidad,
      limitePermisible: r.limitePermisible,
      cumple: r.cumple,
      observaciones: r.observaciones,
    })
  }

  return { header, rows }
}

export function monthHasMonitoreo(
  records: AgroMonitoreoRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  return records.some((r) => {
    const m = monthFromFecha(r.fecha)
    return yearFromFecha(r.fecha) === year && m === month
  })
}

export function cumpleCountForMonth(
  records: AgroMonitoreoRecord[],
  year: number,
  month: MonitoringMonth,
): { total: number; si: number; no: number } {
  const rows = records.filter((r) => {
    const m = monthFromFecha(r.fecha)
    return yearFromFecha(r.fecha) === year && m === month
  })
  return {
    total: rows.length,
    si: rows.filter((r) => r.cumple.toLowerCase() === 'si').length,
    no: rows.filter((r) => r.cumple.toLowerCase() === 'no').length,
  }
}
