/** Modelo alineado a AGRO Gestión de residuos fincas (Desempeño Ambiental.xlsx). */

import { MONITORING_MONTHS, type MonitoringMonth } from './carbonMonitoring'

export { MONITORING_MONTHS, type MonitoringMonth }

export const AGRO_RESIDUOS_SEDES = [
  'Finca El Pilar',
  'Finca San Miguel',
] as const

export type AgroResiduosSede = (typeof AGRO_RESIDUOS_SEDES)[number]

export const CLASIFICACION_OPERATIVA = [
  'Orgánico',
  'Inorgánico',
  'Reciclable',
  'Coprocesable',
  'Coprocesables triturables',
  'Coprocesables no triturables',
  'Sanitarios',
] as const

export const CLASIFICACION_TECNICA = [
  'Ordinario',
  'Especial',
  'Peligroso',
] as const

export const RUTAS_GESTION = [
  'Compostaje',
  'Reciclaje',
  'Disposición final',
  'Coprocesamiento',
  'Tratamiento',
] as const

export const TIPOS_RESIDUOS = [
  'Orgánico',
  'No orgánico',
  'Chatarra (metal)',
  'Papel y cartón',
  'Vidrio',
  'Plásticos',
  'Textiles absorbentes',
  'Envases contaminados',
  'Cubetas de pintura, barniz',
  'Sanitarios',
  'Inorgánico',
] as const

export type AgroResiduosRecord = {
  id: string
  fecha: string
  sede: string
  clasificacionOperativa: string
  tipoResiduos: string
  clasificacionTecnica: string
  cantidadLbs: number | null
  rutaGestion: string
  gestorPlanta: string
}

export type AgroResiduosFormRow = {
  localId: string
  id?: string
  sede: string
  clasificacionOperativa: string
  tipoResiduos: string
  clasificacionTecnica: string
  cantidadLbs: string
  rutaGestion: string
  gestorPlanta: string
}

/** Plantilla fija del Excel (mismas filas cada mes; solo se captura cantidad). */
export type ResiduosTemplateLine = {
  sede: AgroResiduosSede
  clasificacionOperativa: string
  tipoResiduos: string
  clasificacionTecnica: string
  rutaGestion: string
  gestorPlanta: string
}

export const AGRO_RESIDUOS_MONTH_TEMPLATE: ResiduosTemplateLine[] = [
  {
    sede: 'Finca El Pilar',
    clasificacionOperativa: 'Orgánico',
    tipoResiduos: 'Orgánico',
    clasificacionTecnica: 'Ordinario',
    rutaGestion: 'Compostaje',
    gestorPlanta: 'Finca El Pilar',
  },
  {
    sede: 'Finca El Pilar',
    clasificacionOperativa: 'Inorgánico',
    tipoResiduos: 'No orgánico',
    clasificacionTecnica: 'Ordinario',
    rutaGestion: 'Disposición final',
    gestorPlanta: 'Basurero Municipal',
  },
  {
    sede: 'Finca El Pilar',
    clasificacionOperativa: 'Reciclable',
    tipoResiduos: 'Chatarra (metal)',
    clasificacionTecnica: 'Especial',
    rutaGestion: 'Reciclaje',
    gestorPlanta: 'Gestor reciclador',
  },
  {
    sede: 'Finca El Pilar',
    clasificacionOperativa: 'Reciclable',
    tipoResiduos: 'Papel y cartón',
    clasificacionTecnica: 'Especial',
    rutaGestion: 'Reciclaje',
    gestorPlanta: 'Gestor reciclador',
  },
  {
    sede: 'Finca El Pilar',
    clasificacionOperativa: 'Reciclable',
    tipoResiduos: 'Vidrio',
    clasificacionTecnica: 'Especial',
    rutaGestion: 'Reciclaje',
    gestorPlanta: 'Gestor reciclador',
  },
  {
    sede: 'Finca El Pilar',
    clasificacionOperativa: 'Reciclable',
    tipoResiduos: 'Plásticos',
    clasificacionTecnica: 'Especial',
    rutaGestion: 'Reciclaje',
    gestorPlanta: 'Gestor reciclador',
  },
  {
    sede: 'Finca El Pilar',
    clasificacionOperativa: '',
    tipoResiduos: 'Cubetas de pintura, barniz',
    clasificacionTecnica: 'Especial',
    rutaGestion: 'Tratamiento',
    gestorPlanta: 'Ecoreprocesos',
  },
  {
    sede: 'Finca El Pilar',
    clasificacionOperativa: 'Coprocesable',
    tipoResiduos: 'Textiles absorbentes',
    clasificacionTecnica: 'Peligroso',
    rutaGestion: 'Coprocesamiento',
    gestorPlanta: 'Planta San Gabriel',
  },
  {
    sede: 'Finca El Pilar',
    clasificacionOperativa: '',
    tipoResiduos: 'Envases contaminados',
    clasificacionTecnica: 'Peligroso',
    rutaGestion: 'Tratamiento',
    gestorPlanta: 'Agrequima',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: 'Orgánico',
    tipoResiduos: 'Orgánico',
    clasificacionTecnica: 'Ordinario',
    rutaGestion: 'Compostaje',
    gestorPlanta: 'Finca San Miguel',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: 'Inorgánico',
    tipoResiduos: 'No orgánico',
    clasificacionTecnica: 'Ordinario',
    rutaGestion: 'Disposición final',
    gestorPlanta: 'Basurero Municipal',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: 'Reciclable',
    tipoResiduos: 'Chatarra (metal)',
    clasificacionTecnica: 'Especial',
    rutaGestion: 'Reciclaje',
    gestorPlanta: 'Gestor reciclador',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: 'Reciclable',
    tipoResiduos: 'Papel y cartón',
    clasificacionTecnica: 'Especial',
    rutaGestion: 'Reciclaje',
    gestorPlanta: 'Gestor reciclador',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: 'Reciclable',
    tipoResiduos: 'Vidrio',
    clasificacionTecnica: 'Especial',
    rutaGestion: 'Reciclaje',
    gestorPlanta: 'Gestor reciclador',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: 'Reciclable',
    tipoResiduos: 'Plásticos',
    clasificacionTecnica: 'Especial',
    rutaGestion: 'Reciclaje',
    gestorPlanta: 'Gestor reciclador',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: 'Coprocesables triturables',
    tipoResiduos: 'Inorgánico',
    clasificacionTecnica: 'Especial',
    rutaGestion: '',
    gestorPlanta: '',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: 'Coprocesables no triturables',
    tipoResiduos: 'Textiles absorbentes',
    clasificacionTecnica: 'Peligroso',
    rutaGestion: 'Coprocesamiento',
    gestorPlanta: 'Planta San Miguel',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: '',
    tipoResiduos: 'Envases contaminados',
    clasificacionTecnica: 'Peligroso',
    rutaGestion: 'Tratamiento',
    gestorPlanta: 'Agrequima',
  },
  {
    sede: 'Finca San Miguel',
    clasificacionOperativa: 'Sanitarios',
    tipoResiduos: 'Sanitarios',
    clasificacionTecnica: 'Peligroso',
    rutaGestion: 'Tratamiento',
    gestorPlanta: 'Proverde',
  },
]

export function residuosRowKey(row: {
  sede: string
  clasificacionOperativa: string
  tipoResiduos: string
  gestorPlanta: string
}): string {
  return [
    row.sede.trim(),
    row.clasificacionOperativa.trim(),
    row.tipoResiduos.trim(),
    row.gestorPlanta.trim(),
  ].join('|')
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
  records: AgroResiduosRecord[],
  fecha: string,
): AgroResiduosFormRow[] {
  const forFecha = records.filter((r) => r.fecha === fecha)
  const byKey = new Map(forFecha.map((r) => [residuosRowKey(r), r]))
  const bySoft = new Map(
    forFecha.map((r) => [
      `${r.sede.trim()}|${r.clasificacionOperativa.trim()}|${r.tipoResiduos.trim()}`,
      r,
    ]),
  )
  const byOperativa = new Map(
    forFecha.map((r) => [
      `${r.sede.trim()}|${r.clasificacionOperativa.trim()}`,
      r,
    ]),
  )
  const usedIds = new Set<string>()

  function pickHit(line: ResiduosTemplateLine): AgroResiduosRecord | undefined {
    const hard = byKey.get(residuosRowKey(line))
    if (hard) return hard
    const soft = bySoft.get(
      `${line.sede.trim()}|${line.clasificacionOperativa.trim()}|${line.tipoResiduos.trim()}`,
    )
    if (soft) return soft
    if (line.clasificacionOperativa === 'Coprocesables triturables') {
      return byOperativa.get(
        `${line.sede.trim()}|${line.clasificacionOperativa.trim()}`,
      )
    }
    return undefined
  }

  const fromTemplate: AgroResiduosFormRow[] = AGRO_RESIDUOS_MONTH_TEMPLATE.map(
    (line, i) => {
      const hit = pickHit(line)
      if (hit) usedIds.add(hit.id)
      return {
        localId: hit?.id ?? `tpl-${i}-${residuosRowKey(line)}`,
        id: hit?.id,
        sede: line.sede,
        clasificacionOperativa: line.clasificacionOperativa,
        tipoResiduos: line.tipoResiduos,
        clasificacionTecnica:
          line.clasificacionTecnica || hit?.clasificacionTecnica || '',
        cantidadLbs: hit?.cantidadLbs == null ? '' : String(hit.cantidadLbs),
        rutaGestion: line.rutaGestion || hit?.rutaGestion || '',
        gestorPlanta: line.gestorPlanta || hit?.gestorPlanta || '',
      }
    },
  )

  const extras: AgroResiduosFormRow[] = forFecha
    .filter((r) => !usedIds.has(r.id))
    .map((r) => ({
      localId: r.id,
      id: r.id,
      sede: r.sede,
      clasificacionOperativa: r.clasificacionOperativa,
      tipoResiduos: r.tipoResiduos,
      clasificacionTecnica: r.clasificacionTecnica,
      cantidadLbs: r.cantidadLbs == null ? '' : String(r.cantidadLbs),
      rutaGestion: r.rutaGestion,
      gestorPlanta: r.gestorPlanta,
    }))

  return [...fromTemplate, ...extras]
}

export function monthHasQuantity(
  records: AgroResiduosRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  const fecha = fechaFromYearMonth(year, month)
  return records.some(
    (r) =>
      r.fecha === fecha &&
      r.cantidadLbs != null &&
      r.cantidadLbs !== 0 &&
      !Number.isNaN(r.cantidadLbs),
  )
}

export function monthHasRows(
  records: AgroResiduosRecord[],
  year: number,
  month: MonitoringMonth,
): boolean {
  const fecha = fechaFromYearMonth(year, month)
  return records.some((r) => r.fecha === fecha)
}

export function totalLbsForMonth(
  records: AgroResiduosRecord[],
  year: number,
  month: MonitoringMonth,
): number | null {
  const fecha = fechaFromYearMonth(year, month)
  const vals = records
    .filter((r) => r.fecha === fecha && r.cantidadLbs != null)
    .map((r) => r.cantidadLbs as number)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0)
}
