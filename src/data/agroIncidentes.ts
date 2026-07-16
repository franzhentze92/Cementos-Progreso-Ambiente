/** Modelo alineado a Incidentes (Desempeño Ambiental.xlsx) · ámbito Agroprogreso. */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const AGRO_INCIDENTE_UNIDAD = 'Agroprogreso'

export const AGRO_INCIDENTE_SEDES = [
  'Finca El Pilar',
  'Finca La Marina',
  'Finca San Miguel',
  'Planta San Gabriel',
] as const

export const INCIDENTE_ESTADOS = ['Abierto', 'Cerrado'] as const

export const AGRO_INCIDENTE_INSTRUMENTOS = [
  'Unificación Finca El Pilar',
  'Finca La Marina',
  'Finca San Miguel',
  'Planta San Gabriel',
] as const

export type AgroIncidenteRecord = {
  id: string
  fecha: string
  anioMes: string
  mesTexto: string
  unidadNegocio: string
  plantaSede: string
  instrumento: string
  descripcion: string
  valorIncidente: number | null
  estado: string
  comentarios: string
  accionesRealizadas: string
  responsables: string
  link: string
}

export type AgroIncidenteFormRow = {
  localId: string
  id?: string
  dia: string
  plantaSede: string
  instrumento: string
  descripcion: string
  /** Valor como porcentaje 0–100 en el formulario (Excel guarda 0–1). */
  valorPct: string
  estado: string
  comentarios: string
  accionesRealizadas: string
  responsables: string
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

const MES_TEXTO_EN: Record<MonitoringMonth, string> = {
  Enero: 'Jan',
  Febrero: 'Feb',
  Marzo: 'Mar',
  Abril: 'Apr',
  Mayo: 'May',
  Junio: 'Jun',
  Julio: 'Jul',
  Agosto: 'Aug',
  Septiembre: 'Sep',
  Octubre: 'Oct',
  Noviembre: 'Nov',
  Diciembre: 'Dec',
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

export function anioMesFromFecha(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`
}

export function mesTextoFromFecha(fecha: string): string {
  const month = monthFromFecha(fecha)
  const year = yearFromFecha(fecha)
  if (!month) return ''
  return `${MES_TEXTO_EN[month]} ${year}`
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
    .replace('%', '')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function parseIntSafe(value: string): number | null {
  const n = parseNum(value)
  if (n == null) return null
  return Math.round(n)
}

/** Excel guarda 0–1; el formulario muestra %. */
export function valorToPct(valor: number | null): string {
  if (valor == null || Number.isNaN(valor)) return ''
  return String(Math.round(valor * 1000) / 10)
}

export function pctToValor(pct: string): number | null {
  const n = parseNum(pct)
  if (n == null) return null
  return n / 100
}

export function formatNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function formatPctFromValor(
  valor: number | null | undefined,
): string {
  if (valor == null || Number.isNaN(valor)) return '—'
  return `${formatNum(valor * 100, 1)}%`
}

export function emptyIncidenteRow(
  year: number,
  month: MonitoringMonth,
  now = new Date(),
): AgroIncidenteFormRow {
  const defaultDia =
    year === now.getFullYear() && MONTH_INDEX[month] === now.getMonth() + 1
      ? String(now.getDate())
      : '1'
  return {
    localId: `new-${crypto.randomUUID()}`,
    dia: defaultDia,
    plantaSede: 'Finca El Pilar',
    instrumento: 'Unificación Finca El Pilar',
    descripcion: '',
    valorPct: '',
    estado: 'Abierto',
    comentarios: '',
    accionesRealizadas: '',
    responsables: '',
    link: '',
  }
}

export function formRowsFromRecords(
  records: AgroIncidenteRecord[],
  year: number,
  month: MonitoringMonth,
): AgroIncidenteFormRow[] {
  return records
    .filter((r) => {
      const m = monthFromFecha(r.fecha)
      return yearFromFecha(r.fecha) === year && m === month
    })
    .sort((a, b) =>
      a.fecha === b.fecha
        ? a.plantaSede.localeCompare(b.plantaSede)
        : a.fecha.localeCompare(b.fecha),
    )
    .map((r) => ({
      localId: r.id,
      id: r.id,
      dia: String(Number(r.fecha.slice(8, 10))),
      plantaSede: r.plantaSede,
      instrumento: r.instrumento,
      descripcion: r.descripcion,
      valorPct: valorToPct(r.valorIncidente),
      estado: r.estado,
      comentarios: r.comentarios,
      accionesRealizadas: r.accionesRealizadas,
      responsables: r.responsables,
      link: r.link,
    }))
}

export function monthHasIncidentes(
  records: AgroIncidenteRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  return records.some((r) => {
    const m = monthFromFecha(r.fecha)
    return yearFromFecha(r.fecha) === year && m === month
  })
}

export function countAbiertosMes(
  records: AgroIncidenteRecord[],
  year: number,
  month: MonitoringMonth,
): number {
  return records.filter((r) => {
    const m = monthFromFecha(r.fecha)
    return (
      yearFromFecha(r.fecha) === year &&
      m === month &&
      r.estado.toLowerCase() === 'abierto'
    )
  }).length
}
