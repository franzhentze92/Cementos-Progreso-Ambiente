/** Umbrales de monitoreo ambiental + evaluación automática. */

export const UMBRAL_OPERADORES = [
  { id: 'entre', label: 'Entre min y max' },
  { id: 'lte', label: '≤ máximo' },
  { id: 'gte', label: '≥ mínimo' },
  { id: 'lt', label: '< máximo' },
  { id: 'gt', label: '> mínimo' },
] as const

export const UMBRAL_CRITICIDADES = ['Alta', 'Media', 'Baja'] as const

export const UMBRAL_UNIDADES = ['Agroprogreso', 'Planta Alicón'] as const

export type UmbralRecord = {
  id: string
  parametro: string
  tipoAgua: string
  unidadMedida: string
  operador: string
  limiteMin: number | null
  limiteMax: number | null
  unidadNegocio: string
  autoridadRef: string
  criticidad: string
  activo: boolean
  notas: string
}

export type UmbralForm = {
  localId: string
  id?: string
  parametro: string
  tipoAgua: string
  unidadMedida: string
  operador: string
  limiteMin: string
  limiteMax: string
  unidadNegocio: string
  autoridadRef: string
  criticidad: string
  activo: boolean
  notas: string
}

export type EvaluacionResultado = 'cumple' | 'excede' | 'sin-umbral' | 'sin-dato'

export function evaluateAgainstUmbral(
  resultado: number | null,
  umbral: Pick<UmbralRecord, 'operador' | 'limiteMin' | 'limiteMax'>,
): EvaluacionResultado {
  if (resultado == null || Number.isNaN(resultado)) return 'sin-dato'
  const { operador, limiteMin, limiteMax } = umbral
  switch (operador) {
    case 'entre':
      if (limiteMin == null || limiteMax == null) return 'sin-umbral'
      return resultado >= limiteMin && resultado <= limiteMax ? 'cumple' : 'excede'
    case 'lte':
      if (limiteMax == null) return 'sin-umbral'
      return resultado <= limiteMax ? 'cumple' : 'excede'
    case 'lt':
      if (limiteMax == null) return 'sin-umbral'
      return resultado < limiteMax ? 'cumple' : 'excede'
    case 'gte':
      if (limiteMin == null) return 'sin-umbral'
      return resultado >= limiteMin ? 'cumple' : 'excede'
    case 'gt':
      if (limiteMin == null) return 'sin-umbral'
      return resultado > limiteMin ? 'cumple' : 'excede'
    default:
      return 'sin-umbral'
  }
}

export function umbralLabel(u: Pick<UmbralRecord, 'operador' | 'limiteMin' | 'limiteMax' | 'unidadMedida'>): string {
  const unit = u.unidadMedida ? ` ${u.unidadMedida}` : ''
  switch (u.operador) {
    case 'entre':
      return `${u.limiteMin ?? '—'} – ${u.limiteMax ?? '—'}${unit}`
    case 'lte':
      return `≤ ${u.limiteMax ?? '—'}${unit}`
    case 'lt':
      return `< ${u.limiteMax ?? '—'}${unit}`
    case 'gte':
      return `≥ ${u.limiteMin ?? '—'}${unit}`
    case 'gt':
      return `> ${u.limiteMin ?? '—'}${unit}`
    default:
      return '—'
  }
}

export function emptyUmbralForm(patch: Partial<UmbralForm> = {}): UmbralForm {
  return {
    localId: crypto.randomUUID(),
    parametro: '',
    tipoAgua: 'Agua residual',
    unidadMedida: '',
    operador: 'entre',
    limiteMin: '',
    limiteMax: '',
    unidadNegocio: 'Agroprogreso',
    autoridadRef: '',
    criticidad: 'Media',
    activo: true,
    notas: '',
    ...patch,
  }
}

export function formFromRecord(row: UmbralRecord): UmbralForm {
  return {
    localId: row.id,
    id: row.id,
    parametro: row.parametro,
    tipoAgua: row.tipoAgua,
    unidadMedida: row.unidadMedida,
    operador: row.operador,
    limiteMin: row.limiteMin == null ? '' : String(row.limiteMin),
    limiteMax: row.limiteMax == null ? '' : String(row.limiteMax),
    unidadNegocio: row.unidadNegocio,
    autoridadRef: row.autoridadRef,
    criticidad: row.criticidad,
    activo: row.activo,
    notas: row.notas,
  }
}

export function formatNum(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

/** Semilla sugerida alineada a parámetros Agro frecuentes. */
export const UMBRALES_SEED: Array<Omit<UmbralForm, 'localId' | 'id'>> = [
  {
    parametro: 'pH',
    tipoAgua: 'Agua residual',
    unidadMedida: 'u',
    operador: 'entre',
    limiteMin: '6',
    limiteMax: '9',
    unidadNegocio: 'Agroprogreso',
    autoridadRef: 'Acuerdo Gubernativo / MARN',
    criticidad: 'Alta',
    activo: true,
    notas: 'Semilla Fase 2',
  },
  {
    parametro: 'DBO',
    tipoAgua: 'Agua residual',
    unidadMedida: 'mg/L',
    operador: 'lte',
    limiteMin: '',
    limiteMax: '100',
    unidadNegocio: 'Agroprogreso',
    autoridadRef: 'Límite referencial residual',
    criticidad: 'Alta',
    activo: true,
    notas: 'Semilla Fase 2',
  },
  {
    parametro: 'DQO',
    tipoAgua: 'Agua residual',
    unidadMedida: 'mg/L',
    operador: 'lte',
    limiteMin: '',
    limiteMax: '200',
    unidadNegocio: 'Agroprogreso',
    autoridadRef: 'Límite referencial residual',
    criticidad: 'Alta',
    activo: true,
    notas: 'Semilla Fase 2',
  },
  {
    parametro: 'Sólidos suspendidos',
    tipoAgua: 'Agua residual',
    unidadMedida: 'mg/L',
    operador: 'lte',
    limiteMin: '',
    limiteMax: '100',
    unidadNegocio: 'Agroprogreso',
    autoridadRef: 'Límite referencial',
    criticidad: 'Media',
    activo: true,
    notas: 'Semilla Fase 2',
  },
  {
    parametro: 'Coliformes fecales',
    tipoAgua: 'Agua residual',
    unidadMedida: 'NMP/100mL',
    operador: 'lte',
    limiteMin: '',
    limiteMax: '1000',
    unidadNegocio: 'Agroprogreso',
    autoridadRef: 'Límite referencial',
    criticidad: 'Alta',
    activo: true,
    notas: 'Semilla Fase 2',
  },
  {
    parametro: 'Grasas y aceites',
    tipoAgua: 'Agua residual',
    unidadMedida: 'mg/L',
    operador: 'lte',
    limiteMin: '',
    limiteMax: '25',
    unidadNegocio: 'Agroprogreso',
    autoridadRef: 'Límite referencial',
    criticidad: 'Media',
    activo: true,
    notas: 'Semilla Fase 2',
  },
]
