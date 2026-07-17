/** CAPA · acciones correctivas y preventivas. */

export const CAPA_UNIDADES = [
  'Agroprogreso',
  'Planta Alicón',
  'Corporativo',
] as const

export const CAPA_TIPOS = ['Correctiva', 'Preventiva'] as const

export const CAPA_ORIGENES = [
  'Inspección',
  'Incidente',
  'Monitoreo',
  'Auditoría',
  'Queja / denuncia',
  'Revisión gerencial',
  'Otro',
] as const

export const CAPA_ESTADOS = [
  'Abierta',
  'En progreso',
  'Pendiente verificación',
  'Cerrada',
  'Cancelada',
] as const

export const CAPA_PRIORIDADES = ['Alta', 'Media', 'Baja'] as const

export const CAPA_EFICACIAS = [
  '',
  'Eficaz',
  'Parcialmente eficaz',
  'No eficaz',
  'Pendiente evaluar',
] as const

export const CAPA_SITIOS = [
  'Agro San Miguel',
  'Finca El Pilar',
  'Finca La Marina',
  'Saquipec',
  'Aprovechamiento forestal Helios',
  'Planta Alicón',
  'Corporativo',
] as const

export type CapaRecord = {
  id: string
  codigo: string
  unidadNegocio: string
  sitio: string
  tipoAccion: string
  origenTipo: string
  origenRef: string
  hallazgo: string
  causaRaiz: string
  accion: string
  responsable: string
  verificador: string
  prioridad: string
  estado: string
  fechaApertura: string
  fechaCompromiso: string | null
  fechaCierre: string | null
  evidenciaUrl: string
  evidenciaNota: string
  verificacion: string
  eficacia: string
  notas: string
}

export type CapaForm = {
  localId: string
  id?: string
  codigo: string
  unidadNegocio: string
  sitio: string
  tipoAccion: string
  origenTipo: string
  origenRef: string
  hallazgo: string
  causaRaiz: string
  accion: string
  responsable: string
  verificador: string
  prioridad: string
  estado: string
  fechaApertura: string
  fechaCompromiso: string
  fechaCierre: string
  evidenciaUrl: string
  evidenciaNota: string
  verificacion: string
  eficacia: string
  notas: string
}

export type CapaRisk = 'vencida' | 'critica' | 'atencion' | 'ok' | 'cerrada'

export function daysUntil(iso: string | null | undefined, today = new Date()): number | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const target = new Date(y, m - 1, d)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - base.getTime()) / 86_400_000)
}

export function riskForCapa(
  row: Pick<CapaRecord, 'estado' | 'fechaCompromiso'>,
  today = new Date(),
): CapaRisk {
  if (/cerrad|cancelad/i.test(row.estado)) return 'cerrada'
  const days = daysUntil(row.fechaCompromiso, today)
  if (days == null) return 'ok'
  if (days < 0) return 'vencida'
  if (days <= 7) return 'critica'
  if (days <= 30) return 'atencion'
  return 'ok'
}

export function emptyCapaForm(patch: Partial<CapaForm> = {}): CapaForm {
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return {
    localId: crypto.randomUUID(),
    codigo: '',
    unidadNegocio: 'Agroprogreso',
    sitio: '',
    tipoAccion: 'Correctiva',
    origenTipo: 'Inspección',
    origenRef: '',
    hallazgo: '',
    causaRaiz: '',
    accion: '',
    responsable: '',
    verificador: '',
    prioridad: 'Media',
    estado: 'Abierta',
    fechaApertura: iso,
    fechaCompromiso: '',
    fechaCierre: '',
    evidenciaUrl: '',
    evidenciaNota: '',
    verificacion: '',
    eficacia: '',
    notas: '',
    ...patch,
  }
}

export function formFromRecord(row: CapaRecord): CapaForm {
  return {
    localId: row.id,
    id: row.id,
    codigo: row.codigo,
    unidadNegocio: row.unidadNegocio,
    sitio: row.sitio,
    tipoAccion: row.tipoAccion,
    origenTipo: row.origenTipo,
    origenRef: row.origenRef,
    hallazgo: row.hallazgo,
    causaRaiz: row.causaRaiz,
    accion: row.accion,
    responsable: row.responsable,
    verificador: row.verificador,
    prioridad: row.prioridad,
    estado: row.estado,
    fechaApertura: row.fechaApertura,
    fechaCompromiso: row.fechaCompromiso ?? '',
    fechaCierre: row.fechaCierre ?? '',
    evidenciaUrl: row.evidenciaUrl,
    evidenciaNota: row.evidenciaNota,
    verificacion: row.verificacion,
    eficacia: row.eficacia,
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
