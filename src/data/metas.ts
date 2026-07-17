/** Motor de metas / KPIs ambientales. */

export const META_UNIDADES = ['Agroprogreso', 'Planta Alicón', 'Corporativo'] as const
export const META_CATEGORIAS = [
  'Agua',
  'Residuos',
  'Carbono / energía',
  'Cumplimiento',
  'Seguridad ambiental',
  'Operativo',
  'Otro',
] as const
export const META_SENTIDOS = [
  { id: 'menor_mejor', label: 'Menor es mejor' },
  { id: 'mayor_mejor', label: 'Mayor es mejor' },
] as const
export const META_PERIODOS = ['Anual', 'Trimestral', 'Mensual'] as const
export const META_ESTADOS = ['En curso', 'Cumplida', 'En riesgo', 'No cumplida', 'Cancelada'] as const
export const META_SITIOS = [
  'Agro San Miguel',
  'Finca El Pilar',
  'Finca La Marina',
  'Saquipec',
  'Planta Alicón',
  'Corporativo',
  'Todas las sedes',
] as const

export type MetaRecord = {
  id: string
  codigo: string
  indicador: string
  categoria: string
  unidadNegocio: string
  sitio: string
  unidadMedida: string
  metaValor: number
  valorActual: number | null
  sentido: string
  periodoAnio: number
  periodoTipo: string
  fechaInicio: string | null
  fechaFin: string | null
  responsable: string
  estado: string
  umbralAtencionPct: number
  umbralCriticoPct: number
  fuenteDato: string
  notas: string
}

export type MetaForm = {
  localId: string
  id?: string
  codigo: string
  indicador: string
  categoria: string
  unidadNegocio: string
  sitio: string
  unidadMedida: string
  metaValor: string
  valorActual: string
  sentido: string
  periodoAnio: string
  periodoTipo: string
  fechaInicio: string
  fechaFin: string
  responsable: string
  estado: string
  umbralAtencionPct: string
  umbralCriticoPct: string
  fuenteDato: string
  notas: string
}

export type MetaRisk = 'cumplida' | 'ok' | 'atencion' | 'critico' | 'sin-dato'

/** Avance 0–100+ según sentido de la meta. */
export function progressPct(meta: Pick<MetaRecord, 'metaValor' | 'valorActual' | 'sentido'>): number | null {
  if (meta.valorActual == null || meta.metaValor === 0) return null
  if (meta.sentido === 'mayor_mejor') {
    return Math.round((meta.valorActual / meta.metaValor) * 1000) / 10
  }
  // menor_mejor: si actual <= meta → 100%+; si actual > meta → degrada
  if (meta.valorActual <= 0) return 100
  return Math.round((meta.metaValor / meta.valorActual) * 1000) / 10
}

export function riskForMeta(meta: MetaRecord): MetaRisk {
  if (/cancelad/i.test(meta.estado)) return 'sin-dato'
  if (/cumplida/i.test(meta.estado)) return 'cumplida'
  const pct = progressPct(meta)
  if (pct == null) return 'sin-dato'
  if (pct >= 100 || /cumplida/i.test(meta.estado)) return 'cumplida'
  if (pct < meta.umbralCriticoPct) return 'critico'
  if (pct < meta.umbralAtencionPct) return 'atencion'
  return 'ok'
}

export function derivedEstado(meta: MetaRecord): string {
  if (/cancelad|cumplida/i.test(meta.estado)) return meta.estado
  const risk = riskForMeta(meta)
  if (risk === 'cumplida') return 'Cumplida'
  if (risk === 'critico') return 'No cumplida'
  if (risk === 'atencion') return 'En riesgo'
  if (risk === 'ok') return 'En curso'
  return meta.estado || 'En curso'
}

export function emptyMetaForm(patch: Partial<MetaForm> = {}): MetaForm {
  const y = new Date().getFullYear()
  return {
    localId: crypto.randomUUID(),
    codigo: '',
    indicador: '',
    categoria: 'Operativo',
    unidadNegocio: 'Agroprogreso',
    sitio: '',
    unidadMedida: '',
    metaValor: '',
    valorActual: '',
    sentido: 'menor_mejor',
    periodoAnio: String(y),
    periodoTipo: 'Anual',
    fechaInicio: `${y}-01-01`,
    fechaFin: `${y}-12-31`,
    responsable: '',
    estado: 'En curso',
    umbralAtencionPct: '85',
    umbralCriticoPct: '70',
    fuenteDato: 'manual',
    notas: '',
    ...patch,
  }
}

export function formFromRecord(row: MetaRecord): MetaForm {
  return {
    localId: row.id,
    id: row.id,
    codigo: row.codigo,
    indicador: row.indicador,
    categoria: row.categoria,
    unidadNegocio: row.unidadNegocio,
    sitio: row.sitio,
    unidadMedida: row.unidadMedida,
    metaValor: String(row.metaValor),
    valorActual: row.valorActual == null ? '' : String(row.valorActual),
    sentido: row.sentido,
    periodoAnio: String(row.periodoAnio),
    periodoTipo: row.periodoTipo,
    fechaInicio: row.fechaInicio ?? '',
    fechaFin: row.fechaFin ?? '',
    responsable: row.responsable,
    estado: row.estado,
    umbralAtencionPct: String(row.umbralAtencionPct),
    umbralCriticoPct: String(row.umbralCriticoPct),
    fuenteDato: row.fuenteDato,
    notas: row.notas,
  }
}

export function formatNum(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function nextCodigo(existing: string[]): string {
  const re = /^META-(\d+)$/i
  let max = 0
  for (const code of existing) {
    const m = code.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `META-${String(max + 1).padStart(3, '0')}`
}

/** Semilla sugerida Fase 2. */
export const METAS_SEED: Array<Omit<MetaForm, 'localId' | 'id'>> = [
  {
    codigo: 'META-001',
    indicador: 'Reducir excedencias de monitoreo de agua residual',
    categoria: 'Agua',
    unidadNegocio: 'Agroprogreso',
    sitio: 'Todas las sedes',
    unidadMedida: '% cumplimiento',
    metaValor: '95',
    valorActual: '88',
    sentido: 'mayor_mejor',
    periodoAnio: String(new Date().getFullYear()),
    periodoTipo: 'Anual',
    fechaInicio: `${new Date().getFullYear()}-01-01`,
    fechaFin: `${new Date().getFullYear()}-12-31`,
    responsable: 'Ambiente Agro',
    estado: 'En curso',
    umbralAtencionPct: '90',
    umbralCriticoPct: '80',
    fuenteDato: 'umbrales',
    notas: 'Semilla Fase 2',
  },
  {
    codigo: 'META-002',
    indicador: 'Intensidad de residuos no valorizados',
    categoria: 'Residuos',
    unidadNegocio: 'Agroprogreso',
    sitio: 'Finca El Pilar',
    unidadMedida: 'kg/ha',
    metaValor: '120',
    valorActual: '145',
    sentido: 'menor_mejor',
    periodoAnio: String(new Date().getFullYear()),
    periodoTipo: 'Anual',
    fechaInicio: `${new Date().getFullYear()}-01-01`,
    fechaFin: `${new Date().getFullYear()}-12-31`,
    responsable: 'Operaciones Agro',
    estado: 'En curso',
    umbralAtencionPct: '85',
    umbralCriticoPct: '70',
    fuenteDato: 'manual',
    notas: 'Semilla Fase 2',
  },
  {
    codigo: 'META-003',
    indicador: 'Cierre oportuno de CAPA',
    categoria: 'Cumplimiento',
    unidadNegocio: 'Corporativo',
    sitio: 'Corporativo',
    unidadMedida: '% cierre a tiempo',
    metaValor: '90',
    valorActual: '72',
    sentido: 'mayor_mejor',
    periodoAnio: String(new Date().getFullYear()),
    periodoTipo: 'Anual',
    fechaInicio: `${new Date().getFullYear()}-01-01`,
    fechaFin: `${new Date().getFullYear()}-12-31`,
    responsable: 'Ambiente Corporativo',
    estado: 'En curso',
    umbralAtencionPct: '85',
    umbralCriticoPct: '70',
    fuenteDato: 'capa',
    notas: 'Semilla Fase 2',
  },
  {
    codigo: 'META-004',
    indicador: 'Consumo específico de energía eléctrica',
    categoria: 'Carbono / energía',
    unidadNegocio: 'Planta Alicón',
    sitio: 'Planta Alicón',
    unidadMedida: 'kWh/t',
    metaValor: '85',
    valorActual: '91',
    sentido: 'menor_mejor',
    periodoAnio: String(new Date().getFullYear()),
    periodoTipo: 'Anual',
    fechaInicio: `${new Date().getFullYear()}-01-01`,
    fechaFin: `${new Date().getFullYear()}-12-31`,
    responsable: 'Sostenibilidad Alicón',
    estado: 'En curso',
    umbralAtencionPct: '90',
    umbralCriticoPct: '75',
    fuenteDato: 'carbono',
    notas: 'Semilla Fase 2',
  },
]
