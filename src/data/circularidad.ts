/** Circularidad / economía circular de residuos. */

export const CIRC_UNIDADES = ['Agroprogreso', 'Planta Alicón'] as const
export const CIRC_RUTAS = [
  'Compostaje',
  'Reciclaje',
  'Coprocesamiento',
  'Tratamiento',
  'Disposición final',
  'Reutilización',
] as const
export const CIRC_CLASIFICACIONES = ['Ordinario', 'Especial', 'Peligroso'] as const
export const CIRC_ESTADOS = [
  'Registrado',
  'En tránsito',
  'Entregado',
  'Cerrado',
  'Anulado',
] as const
export const CIRC_SEDES = [
  'Finca El Pilar',
  'Finca La Marina',
  'Agro San Miguel',
  'Saquipec',
  'Planta Alicón',
] as const

export const RUTAS_VALORIZADAS = new Set([
  'Compostaje',
  'Reciclaje',
  'Coprocesamiento',
  'Reutilización',
  'Tratamiento',
])

export type CircularidadRecord = {
  id: string
  codigo: string
  unidadNegocio: string
  sede: string
  tipoResiduo: string
  clasificacion: string
  ruta: string
  gestor: string
  manifiesto: string
  cantidadLbs: number | null
  costoGtq: number | null
  fecha: string | null
  valorizado: boolean
  estado: string
  evidenciaUrl: string
  notas: string
}

export type CircularidadForm = {
  localId: string
  id?: string
  codigo: string
  unidadNegocio: string
  sede: string
  tipoResiduo: string
  clasificacion: string
  ruta: string
  gestor: string
  manifiesto: string
  cantidadLbs: string
  costoGtq: string
  fecha: string
  valorizado: boolean
  estado: string
  evidenciaUrl: string
  notas: string
}

export function isRutaValorizada(ruta: string): boolean {
  return RUTAS_VALORIZADAS.has(ruta) || /recicl|compost|coproces|reutil|tratam/i.test(ruta)
}

export function emptyCircularidadForm(
  patch: Partial<CircularidadForm> = {},
): CircularidadForm {
  return {
    localId: crypto.randomUUID(),
    codigo: '',
    unidadNegocio: 'Agroprogreso',
    sede: '',
    tipoResiduo: '',
    clasificacion: 'Ordinario',
    ruta: 'Reciclaje',
    gestor: '',
    manifiesto: '',
    cantidadLbs: '',
    costoGtq: '',
    fecha: new Date().toISOString().slice(0, 10),
    valorizado: true,
    estado: 'Registrado',
    evidenciaUrl: '',
    notas: '',
    ...patch,
  }
}

export function formFromRecord(row: CircularidadRecord): CircularidadForm {
  return {
    localId: row.id,
    id: row.id,
    codigo: row.codigo,
    unidadNegocio: row.unidadNegocio,
    sede: row.sede,
    tipoResiduo: row.tipoResiduo,
    clasificacion: row.clasificacion,
    ruta: row.ruta,
    gestor: row.gestor,
    manifiesto: row.manifiesto,
    cantidadLbs: row.cantidadLbs == null ? '' : String(row.cantidadLbs),
    costoGtq: row.costoGtq == null ? '' : String(row.costoGtq),
    fecha: row.fecha ?? '',
    valorizado: row.valorizado,
    estado: row.estado,
    evidenciaUrl: row.evidenciaUrl,
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
  const re = /^CIR-(\d+)$/i
  let max = 0
  for (const code of existing) {
    const m = code.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `CIR-${String(max + 1).padStart(3, '0')}`
}

export const CIRCULARIDAD_SEED: Array<Omit<CircularidadForm, 'localId' | 'id'>> = [
  {
    codigo: 'CIR-001',
    unidadNegocio: 'Agroprogreso',
    sede: 'Finca El Pilar',
    tipoResiduo: 'Orgánico',
    clasificacion: 'Ordinario',
    ruta: 'Compostaje',
    gestor: 'Finca El Pilar',
    manifiesto: 'MAN-2026-001',
    cantidadLbs: '2400',
    costoGtq: '0',
    fecha: `${new Date().getFullYear()}-03-15`,
    valorizado: true,
    estado: 'Cerrado',
    evidenciaUrl: '',
    notas: 'Semilla Fase 3',
  },
  {
    codigo: 'CIR-002',
    unidadNegocio: 'Agroprogreso',
    sede: 'Finca El Pilar',
    tipoResiduo: 'Plásticos',
    clasificacion: 'Especial',
    ruta: 'Reciclaje',
    gestor: 'Gestor reciclaje GT',
    manifiesto: 'MAN-2026-014',
    cantidadLbs: '850',
    costoGtq: '1200',
    fecha: `${new Date().getFullYear()}-04-02`,
    valorizado: true,
    estado: 'Entregado',
    evidenciaUrl: '',
    notas: 'Semilla Fase 3',
  },
  {
    codigo: 'CIR-003',
    unidadNegocio: 'Agroprogreso',
    sede: 'Finca La Marina',
    tipoResiduo: 'No orgánico',
    clasificacion: 'Ordinario',
    ruta: 'Disposición final',
    gestor: 'Vertedero autorizado',
    manifiesto: 'MAN-2026-022',
    cantidadLbs: '1600',
    costoGtq: '3400',
    fecha: `${new Date().getFullYear()}-05-10`,
    valorizado: false,
    estado: 'Cerrado',
    evidenciaUrl: '',
    notas: 'Semilla Fase 3',
  },
  {
    codigo: 'CIR-004',
    unidadNegocio: 'Planta Alicón',
    sede: 'Planta Alicón',
    tipoResiduo: 'Coprocesable',
    clasificacion: 'Especial',
    ruta: 'Coprocesamiento',
    gestor: 'Horno Alicón',
    manifiesto: 'MAN-ALI-009',
    cantidadLbs: '5200',
    costoGtq: '0',
    fecha: `${new Date().getFullYear()}-02-20`,
    valorizado: true,
    estado: 'Cerrado',
    evidenciaUrl: '',
    notas: 'Semilla Fase 3',
  },
]
