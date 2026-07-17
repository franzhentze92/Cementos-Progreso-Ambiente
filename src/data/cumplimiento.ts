/** Compliance Hub · obligaciones regulatorias transversales. */

export const CUMPLIMIENTO_UNIDADES = [
  'Agroprogreso',
  'Planta Alicón',
  'Corporativo',
] as const

export const CUMPLIMIENTO_TIPOS = [
  'Licencia',
  'Permiso',
  'Trámite',
  'Monitoreo',
  'Reporte periódico',
  'Auditoría',
  'Contrato / gestor',
  'Otro',
] as const

export const CUMPLIMIENTO_ESTADOS = [
  'Vigente',
  'Por vencer',
  'Vencido',
  'En trámite',
  'Cumplido',
  'Suspendido',
] as const

export const CUMPLIMIENTO_CRITICIDADES = ['Alta', 'Media', 'Baja'] as const

export const CUMPLIMIENTO_SITIOS = [
  'Agro San Miguel',
  'Finca El Pilar',
  'Finca La Marina',
  'Saquipec',
  'Aprovechamiento forestal Helios',
  'Planta Alicón',
  'Corporativo',
] as const

export type CumplimientoUnidad = (typeof CUMPLIMIENTO_UNIDADES)[number]
export type CumplimientoTipo = (typeof CUMPLIMIENTO_TIPOS)[number]
export type CumplimientoEstado = (typeof CUMPLIMIENTO_ESTADOS)[number]
export type CumplimientoCriticidad = (typeof CUMPLIMIENTO_CRITICIDADES)[number]

export type CumplimientoRecord = {
  id: string
  codigo: string
  unidadNegocio: string
  sitio: string
  tipoObligacion: string
  titulo: string
  descripcion: string
  autoridad: string
  instrumento: string
  expediente: string
  responsable: string
  criticidad: string
  estado: string
  fechaInicio: string | null
  fechaVencimiento: string | null
  alertaDias: number
  evidenciaUrl: string
  evidenciaNota: string
  origen: string
  origenRef: string
  notas: string
}

export type CumplimientoForm = {
  localId: string
  id?: string
  codigo: string
  unidadNegocio: string
  sitio: string
  tipoObligacion: string
  titulo: string
  descripcion: string
  autoridad: string
  instrumento: string
  expediente: string
  responsable: string
  criticidad: string
  estado: string
  fechaInicio: string
  fechaVencimiento: string
  alertaDias: string
  evidenciaUrl: string
  evidenciaNota: string
  origen: string
  origenRef: string
  notas: string
}

export type CumplimientoRisk =
  | 'vencido'
  | 'critico'
  | 'atencion'
  | 'ok'
  | 'sin-fecha'

export function daysUntil(iso: string | null | undefined, today = new Date()): number | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const target = new Date(y, m - 1, d)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - base.getTime()) / 86_400_000)
}

export function riskForObligacion(
  row: Pick<CumplimientoRecord, 'fechaVencimiento' | 'estado' | 'alertaDias'>,
  today = new Date(),
): CumplimientoRisk {
  if (/cumplido|suspendido/i.test(row.estado)) return 'ok'
  const days = daysUntil(row.fechaVencimiento, today)
  if (days == null) {
    if (/vencid/i.test(row.estado)) return 'vencido'
    if (/por vencer/i.test(row.estado)) return 'atencion'
    return 'sin-fecha'
  }
  if (days < 0) return 'vencido'
  if (days <= 30) return 'critico'
  if (days <= (row.alertaDias || 90)) return 'atencion'
  return 'ok'
}

export function derivedEstado(
  row: Pick<CumplimientoRecord, 'fechaVencimiento' | 'estado' | 'alertaDias'>,
): string {
  if (/cumplido|suspendido|en trámite|en tramite/i.test(row.estado)) {
    return row.estado
  }
  const risk = riskForObligacion(row)
  if (risk === 'vencido') return 'Vencido'
  if (risk === 'critico' || risk === 'atencion') return 'Por vencer'
  return row.estado || 'Vigente'
}

export function emptyCumplimientoForm(
  patch: Partial<CumplimientoForm> = {},
): CumplimientoForm {
  return {
    localId: crypto.randomUUID(),
    codigo: '',
    unidadNegocio: 'Agroprogreso',
    sitio: '',
    tipoObligacion: 'Licencia',
    titulo: '',
    descripcion: '',
    autoridad: '',
    instrumento: '',
    expediente: '',
    responsable: '',
    criticidad: 'Media',
    estado: 'Vigente',
    fechaInicio: '',
    fechaVencimiento: '',
    alertaDias: '90',
    evidenciaUrl: '',
    evidenciaNota: '',
    origen: 'manual',
    origenRef: '',
    notas: '',
    ...patch,
  }
}

export function formFromRecord(row: CumplimientoRecord): CumplimientoForm {
  return {
    localId: row.id,
    id: row.id,
    codigo: row.codigo,
    unidadNegocio: row.unidadNegocio,
    sitio: row.sitio,
    tipoObligacion: row.tipoObligacion,
    titulo: row.titulo,
    descripcion: row.descripcion,
    autoridad: row.autoridad,
    instrumento: row.instrumento,
    expediente: row.expediente,
    responsable: row.responsable,
    criticidad: row.criticidad,
    estado: row.estado,
    fechaInicio: row.fechaInicio ?? '',
    fechaVencimiento: row.fechaVencimiento ?? '',
    alertaDias: String(row.alertaDias || 90),
    evidenciaUrl: row.evidenciaUrl,
    evidenciaNota: row.evidenciaNota,
    origen: row.origen,
    origenRef: row.origenRef,
    notas: row.notas,
  }
}

export function formatNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${Number(d)}/${Number(m)}/${y}`
}

export function nextCodigo(prefix: string, existing: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`, 'i')
  let max = 0
  for (const code of existing) {
    const m = code.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}
