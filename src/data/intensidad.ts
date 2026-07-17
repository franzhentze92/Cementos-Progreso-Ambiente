/** Intensidad de carbono Alicón + escenarios «qué pasa si…». */

export const ESCENARIO_ESTADOS = ['Borrador', 'Activo', 'Archivado'] as const

export const DEFAULT_EF_ELECTRICIDAD = 0.45
export const DEFAULT_EF_DIESEL = 10.21

export type EscenarioRecord = {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  anioBase: number
  planta: string
  deltaProduccionPct: number
  deltaElectricidadPct: number
  deltaDieselPct: number
  deltaClinkerPct: number
  deltaAguaPct: number
  efElectricidadKgKwh: number
  efDieselKgGal: number
  metaIntensidadKgT: number | null
  responsable: string
  estado: string
  notas: string
}

export type EscenarioForm = {
  localId: string
  id?: string
  codigo: string
  nombre: string
  descripcion: string
  anioBase: string
  planta: string
  deltaProduccionPct: string
  deltaElectricidadPct: string
  deltaDieselPct: string
  deltaClinkerPct: string
  deltaAguaPct: string
  efElectricidadKgKwh: string
  efDieselKgGal: string
  metaIntensidadKgT: string
  responsable: string
  estado: string
  notas: string
}

export type IntensidadBaseline = {
  year: string
  plant: string
  totalCementT: number
  totalElecKwh: number
  totalDieselGal: number
  avgClinkerFactorPct: number | null
  avgKwhPerTon: number | null
  avgGalPerTon: number | null
  avgM3PerTon: number | null
  diversionRate: number | null
  /** Intensidad operativa estimada (kg CO2e/t) con factores configurables. */
  intensidadKgT: number | null
  efElectricidad: number
  efDiesel: number
}

export type IntensidadProyectada = IntensidadBaseline & {
  escenarioId: string | null
  escenarioNombre: string
  deltaVsBasePct: number | null
  cumpleMeta: boolean | null
}

export function computeIntensidadKgT(
  cementT: number,
  elecKwh: number,
  dieselGal: number,
  efElec: number,
  efDiesel: number,
): number | null {
  if (!cementT || cementT <= 0) return null
  return Math.round(((elecKwh * efElec + dieselGal * efDiesel) / cementT) * 100) / 100
}

export function applyEscenario(
  base: IntensidadBaseline,
  esc: Pick<
    EscenarioRecord,
    | 'id'
    | 'nombre'
    | 'deltaProduccionPct'
    | 'deltaElectricidadPct'
    | 'deltaDieselPct'
    | 'deltaClinkerPct'
    | 'deltaAguaPct'
    | 'efElectricidadKgKwh'
    | 'efDieselKgGal'
    | 'metaIntensidadKgT'
  >,
): IntensidadProyectada {
  const prod =
    base.totalCementT * (1 + esc.deltaProduccionPct / 100)
  const elec =
    base.totalElecKwh * (1 + esc.deltaElectricidadPct / 100)
  const diesel =
    base.totalDieselGal * (1 + esc.deltaDieselPct / 100)
  const clinker =
    base.avgClinkerFactorPct == null
      ? null
      : Math.round(
          (base.avgClinkerFactorPct * (1 + esc.deltaClinkerPct / 100)) * 10,
        ) / 10
  const m3PerTon =
    base.avgM3PerTon == null
      ? null
      : Math.round(
          (base.avgM3PerTon * (1 + esc.deltaAguaPct / 100)) * 1000,
        ) / 1000

  const intensidad = computeIntensidadKgT(
    prod,
    elec,
    diesel,
    esc.efElectricidadKgKwh,
    esc.efDieselKgGal,
  )
  const deltaVsBasePct =
    base.intensidadKgT != null &&
    intensidad != null &&
    base.intensidadKgT > 0
      ? Math.round(
          ((intensidad - base.intensidadKgT) / base.intensidadKgT) * 1000,
        ) / 10
      : null

  return {
    year: base.year,
    plant: base.plant,
    totalCementT: Math.round(prod * 10) / 10,
    totalElecKwh: Math.round(elec),
    totalDieselGal: Math.round(diesel * 10) / 10,
    avgClinkerFactorPct: clinker,
    avgKwhPerTon: prod > 0 ? Math.round((elec / prod) * 10) / 10 : null,
    avgGalPerTon: prod > 0 ? Math.round((diesel / prod) * 1000) / 1000 : null,
    avgM3PerTon: m3PerTon,
    diversionRate: base.diversionRate,
    intensidadKgT: intensidad,
    efElectricidad: esc.efElectricidadKgKwh,
    efDiesel: esc.efDieselKgGal,
    escenarioId: esc.id,
    escenarioNombre: esc.nombre,
    deltaVsBasePct,
    cumpleMeta:
      esc.metaIntensidadKgT != null && intensidad != null
        ? intensidad <= esc.metaIntensidadKgT
        : null,
  }
}

export function emptyEscenarioForm(patch: Partial<EscenarioForm> = {}): EscenarioForm {
  const y = new Date().getFullYear()
  return {
    localId: crypto.randomUUID(),
    codigo: '',
    nombre: '',
    descripcion: '',
    anioBase: String(y),
    planta: 'Alicon',
    deltaProduccionPct: '0',
    deltaElectricidadPct: '0',
    deltaDieselPct: '0',
    deltaClinkerPct: '0',
    deltaAguaPct: '0',
    efElectricidadKgKwh: String(DEFAULT_EF_ELECTRICIDAD),
    efDieselKgGal: String(DEFAULT_EF_DIESEL),
    metaIntensidadKgT: '',
    responsable: '',
    estado: 'Borrador',
    notas: '',
    ...patch,
  }
}

export function formFromRecord(row: EscenarioRecord): EscenarioForm {
  return {
    localId: row.id,
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    anioBase: String(row.anioBase),
    planta: row.planta,
    deltaProduccionPct: String(row.deltaProduccionPct),
    deltaElectricidadPct: String(row.deltaElectricidadPct),
    deltaDieselPct: String(row.deltaDieselPct),
    deltaClinkerPct: String(row.deltaClinkerPct),
    deltaAguaPct: String(row.deltaAguaPct),
    efElectricidadKgKwh: String(row.efElectricidadKgKwh),
    efDieselKgGal: String(row.efDieselKgGal),
    metaIntensidadKgT:
      row.metaIntensidadKgT == null ? '' : String(row.metaIntensidadKgT),
    responsable: row.responsable,
    estado: row.estado,
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
  const re = /^ESC-(\d+)$/i
  let max = 0
  for (const code of existing) {
    const m = code.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `ESC-${String(max + 1).padStart(3, '0')}`
}

export const ESCENARIOS_SEED: Array<Omit<EscenarioForm, 'localId' | 'id'>> = [
  {
    codigo: 'ESC-001',
    nombre: 'Línea base (factores default)',
    descripcion: 'Misma operación; factores de emisión referenciales editables.',
    anioBase: String(new Date().getFullYear()),
    planta: 'Alicon',
    deltaProduccionPct: '0',
    deltaElectricidadPct: '0',
    deltaDieselPct: '0',
    deltaClinkerPct: '0',
    deltaAguaPct: '0',
    efElectricidadKgKwh: String(DEFAULT_EF_ELECTRICIDAD),
    efDieselKgGal: String(DEFAULT_EF_DIESEL),
    metaIntensidadKgT: '120',
    responsable: 'Sostenibilidad Alicón',
    estado: 'Activo',
    notas: 'Semilla Fase 3',
  },
  {
    codigo: 'ESC-002',
    nombre: '−10% electricidad específica',
    descripcion: 'Eficiencia de molienda / mix energético sin bajar producción.',
    anioBase: String(new Date().getFullYear()),
    planta: 'Alicon',
    deltaProduccionPct: '0',
    deltaElectricidadPct: '-10',
    deltaDieselPct: '0',
    deltaClinkerPct: '0',
    deltaAguaPct: '0',
    efElectricidadKgKwh: String(DEFAULT_EF_ELECTRICIDAD),
    efDieselKgGal: String(DEFAULT_EF_DIESEL),
    metaIntensidadKgT: '110',
    responsable: 'Operaciones Alicón',
    estado: 'Activo',
    notas: 'Semilla Fase 3',
  },
  {
    codigo: 'ESC-003',
    nombre: '−5% clinker factor + −8% diesel',
    descripcion: 'Más adiciones + logística más eficiente.',
    anioBase: String(new Date().getFullYear()),
    planta: 'Alicon',
    deltaProduccionPct: '2',
    deltaElectricidadPct: '0',
    deltaDieselPct: '-8',
    deltaClinkerPct: '-5',
    deltaAguaPct: '0',
    efElectricidadKgKwh: String(DEFAULT_EF_ELECTRICIDAD),
    efDieselKgGal: String(DEFAULT_EF_DIESEL),
    metaIntensidadKgT: '105',
    responsable: 'Sostenibilidad Alicón',
    estado: 'Borrador',
    notas: 'Semilla Fase 3',
  },
]
