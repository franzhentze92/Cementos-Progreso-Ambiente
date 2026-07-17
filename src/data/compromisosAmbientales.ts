/** Compromisos Ambientales · registro maestro del depto. Ambiente CP. */

export const COMPROMISO_UNIDADES = [
  'Agroprogreso',
  'Planta Alicón',
  'Descarga Barcos',
  'Corporativo',
] as const

export const COMPROMISO_SITIOS = [
  'Agro San Miguel',
  'Finca El Pilar',
  'Finca La Marina',
  'Saquipec',
  'Aprovechamiento forestal Helios',
  'Planta Alicón',
  'Subestación Alicon',
  'Descarga Barcos',
  'Corporativo',
] as const

export const COMPROMISO_AREAS = [
  'Operaciones',
  'Mantenimiento',
  'PTAR / efluentes',
  'Calidad de aire',
  'Residuos',
  'Biodiversidad',
  'Seguridad industrial',
  'Administración',
  'Comunitario',
] as const

export const COMPROMISO_ORIGENES = [
  'Licencia ambiental',
  'Resolución MARN',
  'Obligación legal',
  'Plan de manejo',
  'Instrumento ambiental',
  'Incidente ambiental',
  'Auditoría',
  'Inspección',
  'CAPA',
  'Compromiso voluntario',
  'Otro',
] as const

export const COMPROMISO_TIPOS = [
  'Monitoreo',
  'Reporte / informe',
  'Capacitación',
  'Obra / medida de control',
  'Trámite / gestión',
  'Inspección',
  'Seguimiento continuo',
  'Compensación / reforestación',
  'Otro',
] as const

export const COMPROMISO_ESTADOS = [
  'Pendiente',
  'En proceso',
  'Cumplido',
  'Vencido',
  'Suspendido',
  'Cancelado',
] as const

export const COMPROMISO_PRIORIDADES = ['Alta', 'Media', 'Baja'] as const

export const COMPROMISO_CRITICIDADES = [
  'Crítica',
  'Alta',
  'Media',
  'Baja',
] as const

export const COMPROMISO_PERIODICIDADES = [
  'Única',
  'Semanal',
  'Mensual',
  'Trimestral',
  'Semestral',
  'Anual',
  'Bienal',
] as const

export const COMPROMISO_HITOS_ESTADOS = [
  'Pendiente',
  'En proceso',
  'Completado',
  'Cancelado',
] as const

export const EVIDENCIA_TIPOS = [
  'Informe',
  'Fotografía',
  'Resultado de laboratorio',
  'Acta',
  'Factura / certificado',
  'Formulario ante autoridad',
  'Comprobante de recepción',
  'Mapa / archivo técnico',
  'Registro de capacitación',
  'Documento firmado',
  'Otro',
] as const

export const EVIDENCIA_ESTADOS = [
  'Pendiente de revisión',
  'Aprobada',
  'Rechazada',
  'Requiere corrección',
  'Vencida',
  'Sustituida',
] as const

export const SEGUIMIENTO_TIPOS = [
  'creado',
  'asignado',
  'iniciado',
  'avance',
  'evidencia',
  'revision',
  'cambio_estado',
  'bloqueo',
  'visita',
  'comunicacion',
  'fecha_modificada',
  'cerrado',
  'comentario',
] as const

export const ASIGNACION_ROLES = [
  'Propietario',
  'Ejecutor',
  'Revisor',
  'Aprobador',
  'Responsable sitio',
  'Colaborador',
] as const

export type CompromisoRecord = {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  unidadNegocio: string
  sitio: string
  areaOperativa: string
  origen: string
  origenRef: string
  tipo: string
  responsablePrincipal: string
  colaboradores: string
  revisor: string
  aprobador: string
  fechaInicio: string | null
  fechaVencimiento: string | null
  proximaEjecucion: string | null
  periodicidad: string
  prioridad: string
  criticidad: string
  estado: string
  porcentajeAvance: number
  criterioCumplimiento: string
  evidenciasRequeridas: string
  alertaDias: number
  notas: string
  createdBy: string
  createdAt?: string
  updatedAt?: string
}

export type CompromisoHito = {
  id: string
  compromisoId: string
  titulo: string
  descripcion: string
  fechaObjetivo: string | null
  estado: string
  orden: number
}

export type CompromisoHitoForm = {
  localId: string
  id?: string
  titulo: string
  descripcion: string
  fechaObjetivo: string
  estado: string
  orden: number
}

export type CompromisoForm = {
  localId: string
  id?: string
  codigo: string
  titulo: string
  descripcion: string
  unidadNegocio: string
  sitio: string
  areaOperativa: string
  origen: string
  origenRef: string
  tipo: string
  responsablePrincipal: string
  colaboradores: string
  revisor: string
  aprobador: string
  fechaInicio: string
  fechaVencimiento: string
  proximaEjecucion: string
  periodicidad: string
  prioridad: string
  criticidad: string
  estado: string
  porcentajeAvance: string
  criterioCumplimiento: string
  evidenciasRequeridas: string
  alertaDias: string
  notas: string
  createdBy: string
  hitos: CompromisoHitoForm[]
}

export type EvidenciaRecord = {
  id: string
  compromisoId: string
  titulo: string
  tipoEvidencia: string
  descripcion: string
  fechaCumplimiento: string | null
  periodo: string
  sitio: string
  area: string
  archivoUrl: string
  archivoNombre: string
  estadoRevision: string
  revisadoPor: string
  fechaRevision: string | null
  notasRevision: string
  version: number
  reemplazaId: string | null
  cargadoPor: string
  createdAt?: string
}

export type EvidenciaForm = {
  localId: string
  id?: string
  compromisoId: string
  titulo: string
  tipoEvidencia: string
  descripcion: string
  fechaCumplimiento: string
  periodo: string
  sitio: string
  area: string
  archivoUrl: string
  archivoNombre: string
  estadoRevision: string
  revisadoPor: string
  fechaRevision: string
  notasRevision: string
  version: string
  cargadoPor: string
}

export type SeguimientoRecord = {
  id: string
  compromisoId: string
  tipoEvento: string
  descripcion: string
  comentario: string
  porcentajeAvance: number | null
  estadoAnterior: string
  estadoNuevo: string
  fechaAnterior: string | null
  fechaNueva: string | null
  bloqueo: string
  autor: string
  createdAt: string
}

export type SeguimientoForm = {
  compromisoId: string
  tipoEvento: string
  descripcion: string
  comentario: string
  porcentajeAvance: string
  estadoAnterior: string
  estadoNuevo: string
  fechaAnterior: string
  fechaNueva: string
  bloqueo: string
  autor: string
}

export type AsignacionRecord = {
  id: string
  compromisoId: string
  persona: string
  rol: string
  sitio: string
  activo: boolean
}

export type CompromisoRisk =
  | 'vencido'
  | 'critico'
  | 'atencion'
  | 'ok'
  | 'cerrado'
  | 'suspendido'

export function daysUntil(
  iso: string | null | undefined,
  today = new Date(),
): number | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const target = new Date(y, m - 1, d)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - base.getTime()) / 86_400_000)
}

export function riskForCompromiso(
  row: Pick<
    CompromisoRecord,
    'estado' | 'fechaVencimiento' | 'alertaDias'
  >,
  today = new Date(),
): CompromisoRisk {
  if (/cumplid|cancelad/i.test(row.estado)) return 'cerrado'
  if (/suspendid/i.test(row.estado)) return 'suspendido'
  if (/vencid/i.test(row.estado)) return 'vencido'
  const days = daysUntil(row.fechaVencimiento, today)
  if (days == null) return 'ok'
  if (days < 0) return 'vencido'
  const alerta = row.alertaDias > 0 ? row.alertaDias : 15
  if (days <= Math.min(7, alerta)) return 'critico'
  if (days <= alerta) return 'atencion'
  return 'ok'
}

export function emptyHitoForm(
  patch: Partial<CompromisoHitoForm> = {},
): CompromisoHitoForm {
  return {
    localId: crypto.randomUUID(),
    titulo: '',
    descripcion: '',
    fechaObjetivo: '',
    estado: 'Pendiente',
    orden: 0,
    ...patch,
  }
}

export function emptyCompromisoForm(
  patch: Partial<CompromisoForm> = {},
): CompromisoForm {
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return {
    localId: crypto.randomUUID(),
    codigo: '',
    titulo: '',
    descripcion: '',
    unidadNegocio: 'Agroprogreso',
    sitio: '',
    areaOperativa: '',
    origen: 'Plan de manejo',
    origenRef: '',
    tipo: 'Monitoreo',
    responsablePrincipal: '',
    colaboradores: '',
    revisor: '',
    aprobador: '',
    fechaInicio: iso,
    fechaVencimiento: '',
    proximaEjecucion: '',
    periodicidad: 'Única',
    prioridad: 'Media',
    criticidad: 'Media',
    estado: 'Pendiente',
    porcentajeAvance: '0',
    criterioCumplimiento: '',
    evidenciasRequeridas: '',
    alertaDias: '15',
    notas: '',
    createdBy: '',
    hitos: [],
    ...patch,
  }
}

export function formFromCompromiso(
  row: CompromisoRecord,
  hitos: CompromisoHito[] = [],
): CompromisoForm {
  return {
    localId: row.id,
    id: row.id,
    codigo: row.codigo,
    titulo: row.titulo,
    descripcion: row.descripcion,
    unidadNegocio: row.unidadNegocio,
    sitio: row.sitio,
    areaOperativa: row.areaOperativa,
    origen: row.origen,
    origenRef: row.origenRef,
    tipo: row.tipo,
    responsablePrincipal: row.responsablePrincipal,
    colaboradores: row.colaboradores,
    revisor: row.revisor,
    aprobador: row.aprobador,
    fechaInicio: row.fechaInicio ?? '',
    fechaVencimiento: row.fechaVencimiento ?? '',
    proximaEjecucion: row.proximaEjecucion ?? '',
    periodicidad: row.periodicidad,
    prioridad: row.prioridad,
    criticidad: row.criticidad,
    estado: row.estado,
    porcentajeAvance: String(row.porcentajeAvance ?? 0),
    criterioCumplimiento: row.criterioCumplimiento,
    evidenciasRequeridas: row.evidenciasRequeridas,
    alertaDias: String(row.alertaDias ?? 15),
    notas: row.notas,
    createdBy: row.createdBy,
    hitos: hitos
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((h) => ({
        localId: h.id,
        id: h.id,
        titulo: h.titulo,
        descripcion: h.descripcion,
        fechaObjetivo: h.fechaObjetivo ?? '',
        estado: h.estado,
        orden: h.orden,
      })),
  }
}

export function emptyEvidenciaForm(
  patch: Partial<EvidenciaForm> = {},
): EvidenciaForm {
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return {
    localId: crypto.randomUUID(),
    compromisoId: '',
    titulo: '',
    tipoEvidencia: 'Informe',
    descripcion: '',
    fechaCumplimiento: iso,
    periodo: '',
    sitio: '',
    area: '',
    archivoUrl: '',
    archivoNombre: '',
    estadoRevision: 'Pendiente de revisión',
    revisadoPor: '',
    fechaRevision: '',
    notasRevision: '',
    version: '1',
    cargadoPor: '',
    ...patch,
  }
}

export function formFromEvidencia(row: EvidenciaRecord): EvidenciaForm {
  return {
    localId: row.id,
    id: row.id,
    compromisoId: row.compromisoId,
    titulo: row.titulo,
    tipoEvidencia: row.tipoEvidencia,
    descripcion: row.descripcion,
    fechaCumplimiento: row.fechaCumplimiento ?? '',
    periodo: row.periodo,
    sitio: row.sitio,
    area: row.area,
    archivoUrl: row.archivoUrl,
    archivoNombre: row.archivoNombre,
    estadoRevision: row.estadoRevision,
    revisadoPor: row.revisadoPor,
    fechaRevision: row.fechaRevision ?? '',
    notasRevision: row.notasRevision,
    version: String(row.version ?? 1),
    cargadoPor: row.cargadoPor,
  }
}

export function emptySeguimientoForm(
  patch: Partial<SeguimientoForm> = {},
): SeguimientoForm {
  return {
    compromisoId: '',
    tipoEvento: 'comentario',
    descripcion: '',
    comentario: '',
    porcentajeAvance: '',
    estadoAnterior: '',
    estadoNuevo: '',
    fechaAnterior: '',
    fechaNueva: '',
    bloqueo: '',
    autor: '',
    ...patch,
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
  const datePart = iso.slice(0, 10)
  const [y, m, d] = datePart.split('-')
  if (!y || !m || !d) return iso
  return `${Number(d)}/${Number(m)}/${y}`
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-GT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function nextCodigo(prefix: string, existing: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`, 'i')
  let max = 0
  for (const code of existing) {
    const m = code.trim().match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

export function seguimientoLabel(tipo: string): string {
  const map: Record<string, string> = {
    creado: 'Compromiso creado',
    asignado: 'Responsable asignado',
    iniciado: 'Actividad iniciada',
    avance: 'Avance actualizado',
    evidencia: 'Evidencia cargada',
    revision: 'Evidencia revisada',
    cambio_estado: 'Cambio de estado',
    bloqueo: 'Bloqueo / dificultad',
    visita: 'Visita / verificación',
    comunicacion: 'Comunicación',
    fecha_modificada: 'Fecha modificada',
    cerrado: 'Compromiso cerrado',
    comentario: 'Comentario',
  }
  return map[tipo] ?? tipo
}

export function deriveEstado(
  estado: string,
  fechaVencimiento: string | null,
  porcentaje: number,
): string {
  if (/cumplid|cancelad|suspendid/i.test(estado)) return estado
  if (porcentaje >= 100) return 'Cumplido'
  const days = daysUntil(fechaVencimiento)
  if (days != null && days < 0) return 'Vencido'
  if (/en proceso/i.test(estado) || porcentaje > 0) return 'En proceso'
  return estado || 'Pendiente'
}
