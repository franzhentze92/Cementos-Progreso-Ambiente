/** Expedientes documentales ambientales. */

export const EXP_UNIDADES = ['Agroprogreso', 'Planta Alicón', 'Corporativo'] as const
export const EXP_TEMAS = [
  'Licencias',
  'Monitoreo',
  'Incidentes',
  'CAPA',
  'Agua',
  'Residuos',
  'Carbono',
  'Auditoría',
  'General',
] as const
export const EXP_TIPOS = [
  'Resolución',
  'Estudio',
  'Informe de monitoreo',
  'Acta',
  'Fotografía',
  'Licencia / permiso',
  'Manifiesto',
  'Otro',
] as const
export const EXP_ESTADOS = ['Vigente', 'Borrador', 'Obsoleto', 'En revisión'] as const
export const EXP_SITIOS = [
  'Agro San Miguel',
  'Finca El Pilar',
  'Finca La Marina',
  'Saquipec',
  'Planta Alicón',
  'Corporativo',
  'Todas las sedes',
] as const
export const EXP_MODULOS = [
  '',
  'cumplimiento',
  'capa',
  'metas',
  'umbrales',
  'circularidad',
  'intensidad',
  'licencias',
  'monitoreos',
  'incidentes',
] as const

export type ExpedienteRecord = {
  id: string
  codigo: string
  titulo: string
  unidadNegocio: string
  sitio: string
  tema: string
  tipoDocumento: string
  version: string
  fechaDocumento: string | null
  responsable: string
  estado: string
  archivoUrl: string
  archivoNombre: string
  moduloLigado: string
  refLigada: string
  tags: string
  notas: string
}

export type ExpedienteForm = {
  localId: string
  id?: string
  codigo: string
  titulo: string
  unidadNegocio: string
  sitio: string
  tema: string
  tipoDocumento: string
  version: string
  fechaDocumento: string
  responsable: string
  estado: string
  archivoUrl: string
  archivoNombre: string
  moduloLigado: string
  refLigada: string
  tags: string
  notas: string
}

export function emptyExpedienteForm(
  patch: Partial<ExpedienteForm> = {},
): ExpedienteForm {
  return {
    localId: crypto.randomUUID(),
    codigo: '',
    titulo: '',
    unidadNegocio: 'Agroprogreso',
    sitio: '',
    tema: 'General',
    tipoDocumento: 'Otro',
    version: '1.0',
    fechaDocumento: new Date().toISOString().slice(0, 10),
    responsable: '',
    estado: 'Vigente',
    archivoUrl: '',
    archivoNombre: '',
    moduloLigado: '',
    refLigada: '',
    tags: '',
    notas: '',
    ...patch,
  }
}

export function formFromRecord(row: ExpedienteRecord): ExpedienteForm {
  return {
    localId: row.id,
    id: row.id,
    codigo: row.codigo,
    titulo: row.titulo,
    unidadNegocio: row.unidadNegocio,
    sitio: row.sitio,
    tema: row.tema,
    tipoDocumento: row.tipoDocumento,
    version: row.version,
    fechaDocumento: row.fechaDocumento ?? '',
    responsable: row.responsable,
    estado: row.estado,
    archivoUrl: row.archivoUrl,
    archivoNombre: row.archivoNombre,
    moduloLigado: row.moduloLigado,
    refLigada: row.refLigada,
    tags: row.tags,
    notas: row.notas,
  }
}

export function formatIsoDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(`${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function nextCodigo(existing: string[]): string {
  const re = /^EXP-(\d+)$/i
  let max = 0
  for (const code of existing) {
    const m = code.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `EXP-${String(max + 1).padStart(3, '0')}`
}

export const EXPEDIENTES_SEED: Array<Omit<ExpedienteForm, 'localId' | 'id'>> = [
  {
    codigo: 'EXP-001',
    titulo: 'Licencia ambiental unificación Finca El Pilar',
    unidadNegocio: 'Agroprogreso',
    sitio: 'Finca El Pilar',
    tema: 'Licencias',
    tipoDocumento: 'Licencia / permiso',
    version: '1.0',
    fechaDocumento: `${new Date().getFullYear() - 1}-06-01`,
    responsable: 'Ambiente Agro',
    estado: 'Vigente',
    archivoUrl: '',
    archivoNombre: '',
    moduloLigado: 'cumplimiento',
    refLigada: '',
    tags: 'MARN, licencia',
    notas: 'Semilla Fase 3',
  },
  {
    codigo: 'EXP-002',
    titulo: 'Informe de monitoreo agua residual Q1',
    unidadNegocio: 'Agroprogreso',
    sitio: 'Finca El Pilar',
    tema: 'Monitoreo',
    tipoDocumento: 'Informe de monitoreo',
    version: '1.1',
    fechaDocumento: `${new Date().getFullYear()}-03-31`,
    responsable: 'Laboratorio externo',
    estado: 'Vigente',
    archivoUrl: '',
    archivoNombre: '',
    moduloLigado: 'umbrales',
    refLigada: '',
    tags: 'DBO, DQO, pH',
    notas: 'Semilla Fase 3',
  },
  {
    codigo: 'EXP-003',
    titulo: 'Acta de verificación CAPA derrame menor',
    unidadNegocio: 'Planta Alicón',
    sitio: 'Planta Alicón',
    tema: 'CAPA',
    tipoDocumento: 'Acta',
    version: '1.0',
    fechaDocumento: `${new Date().getFullYear()}-01-20`,
    responsable: 'SSO Alicón',
    estado: 'Vigente',
    archivoUrl: '',
    archivoNombre: '',
    moduloLigado: 'capa',
    refLigada: '',
    tags: 'CAPA, cierre',
    notas: 'Semilla Fase 3',
  },
]
