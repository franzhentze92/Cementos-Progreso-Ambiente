/** Modelo de captura alineado a huella-carbono-alicon.xlsx (planta Alicon). */

export const MONITORING_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export type MonitoringMonth = (typeof MONITORING_MONTHS)[number]

export const BIODIVERSITY_YEARS = ['2020', '2021', '2022'] as const
export type BiodiversityYear = (typeof BIODIVERSITY_YEARS)[number]

export type CellValue = string

export type ProductionRow = {
  clinkerIngreso: CellValue
  clinkerConsumo: CellValue
  puzolana: CellValue
  caliza: CellValue
  yeso: CellValue
  aditivo: CellValue
  toba: CellValue
  prodUGC: CellValue
  clinkerUGC: CellValue
  prodCFB: CellValue
  clinkerCFB: CellValue
  prodOtro: CellValue
  clinkerOtro: CellValue
}

export type FuelRow = {
  glpControl: CellValue
  dieselGeneracion: CellValue
  dieselMovil: CellValue
  glpMontacargas: CellValue
  glpOtro: CellValue
  otros: CellValue
}

export type ElectricityRow = {
  produccionCemento: CellValue
  servicios: CellValue
  perdidas: CellValue
  redElectrica: CellValue
}

export type SuppliesRow = {
  r134a: CellValue
  r141b: CellValue
  r410: CellValue
  sacosMillares: CellValue
  sacosRotosFabrica: CellValue
  sacosRotosEnvasado: CellValue
  grasa: CellValue
  aceite: CellValue
}

export type WaterRow = {
  pipas: CellValue
  externoEntuvado: CellValue
  superficial: CellValue
  subsuperficial: CellValue
  lluvia: CellValue
  recirculacion: CellValue
  otrosUsos: CellValue
  produccion: CellValue
  aguaHumana: CellValue
}

export type WasteRow = {
  ordinarios: CellValue
  peligrosos: CellValue
  vertedero: CellValue
  coprocesamiento: CellValue
  reutilizados: CellValue
  reciclados: CellValue
  otraDisposicion: CellValue
  derramesCantidad: CellValue
  derramesVolumen: CellValue
}

export type WaterConfig = {
  disposicionResidual: CellValue
  puntosDescarga: CellValue
  metodosTratamiento: CellValue
}

export type BiodiversityMatrix = Record<
  string,
  Record<BiodiversityYear, CellValue>
>

export type MonitoringMeta = {
  year: CellValue
  version: CellValue
  plant: CellValue
  infoDate: CellValue
  responsible: CellValue
}

export type MonthlyStore<T> = Record<MonitoringMonth, T>

export type MonitoringState = {
  meta: MonitoringMeta
  production: MonthlyStore<ProductionRow>
  fuel: MonthlyStore<FuelRow>
  electricity: MonthlyStore<ElectricityRow>
  supplies: MonthlyStore<SuppliesRow>
  water: MonthlyStore<WaterRow>
  waterConfig: WaterConfig
  waste: MonthlyStore<WasteRow>
  biodiversity: BiodiversityMatrix
}

function blankProduction(): ProductionRow {
  return {
    clinkerIngreso: '',
    clinkerConsumo: '',
    puzolana: '',
    caliza: '',
    yeso: '',
    aditivo: '',
    toba: '',
    prodUGC: '',
    clinkerUGC: '',
    prodCFB: '',
    clinkerCFB: '',
    prodOtro: '',
    clinkerOtro: '',
  }
}

function blankFuel(): FuelRow {
  return {
    glpControl: '',
    dieselGeneracion: '',
    dieselMovil: '',
    glpMontacargas: '',
    glpOtro: '',
    otros: '',
  }
}

function blankElectricity(): ElectricityRow {
  return {
    produccionCemento: '',
    servicios: '',
    perdidas: '',
    redElectrica: '',
  }
}

function blankSupplies(): SuppliesRow {
  return {
    r134a: '',
    r141b: '',
    r410: '',
    sacosMillares: '',
    sacosRotosFabrica: '',
    sacosRotosEnvasado: '',
    grasa: '',
    aceite: '',
  }
}

function blankWater(): WaterRow {
  return {
    pipas: '',
    externoEntuvado: '',
    superficial: '',
    subsuperficial: '',
    lluvia: '',
    recirculacion: '',
    otrosUsos: '',
    produccion: '',
    aguaHumana: '',
  }
}

function blankWaste(): WasteRow {
  return {
    ordinarios: '',
    peligrosos: '',
    vertedero: '',
    coprocesamiento: '',
    reutilizados: '',
    reciclados: '',
    otraDisposicion: '',
    derramesCantidad: '',
    derramesVolumen: '',
  }
}

function emptyMonthly<T>(factory: () => T): MonthlyStore<T> {
  return Object.fromEntries(
    MONITORING_MONTHS.map((m) => [m, factory()]),
  ) as MonthlyStore<T>
}

export function parseNum(value: CellValue): number | null {
  if (value == null) return null
  const t = String(value).trim()
  if (!t || t === '-' || /^n\/?a$/i.test(t)) return null
  const n = Number(t.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

export function formatNum(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function sumCells(...values: CellValue[]): number | null {
  const nums = values.map(parseNum)
  if (nums.every((n) => n == null)) return null
  return nums.reduce<number>((acc, n) => acc + (n ?? 0), 0)
}

export function safeDiv(a: CellValue, b: CellValue): number | null {
  const na = parseNum(a)
  const nb = parseNum(b)
  if (na == null || nb == null || nb === 0) return null
  return na / nb
}

/** Fórmulas equivalentes al Excel Alicon */
export function calcProduction(row: ProductionRow) {
  const totalMP = sumCells(
    row.clinkerConsumo,
    row.puzolana,
    row.caliza,
    row.yeso,
    row.aditivo,
    row.toba,
  )
  const factorUGC = safeDiv(row.clinkerUGC, row.prodUGC)
  const factorCFB = safeDiv(row.clinkerCFB, row.prodCFB)
  const factorOtro = safeDiv(row.clinkerOtro, row.prodOtro)
  const ugc = parseNum(row.prodUGC)
  const cfb = parseNum(row.prodCFB)
  // Excel: producción total = UGC + CFB (columna "otro" se registra aparte)
  const prodTotal =
    ugc == null && cfb == null ? null : (ugc ?? 0) + (cfb ?? 0)
  const factorPlanta =
    prodTotal && prodTotal !== 0
      ? (() => {
          const c = parseNum(row.clinkerConsumo)
          return c == null ? null : c / prodTotal
        })()
      : null
  return { totalMP, factorUGC, factorCFB, factorOtro, prodTotal, factorPlanta }
}

export function calcElectricity(row: ElectricityRow) {
  return {
    total: sumCells(
      row.produccionCemento,
      row.servicios,
      row.perdidas,
      row.redElectrica,
    ),
  }
}

export function calcSupplies(row: SuppliesRow) {
  const millares = parseNum(row.sacosMillares)
  const rotos = parseNum(row.sacosRotosEnvasado)
  return {
    sacosTon: millares == null ? null : (millares * 1000 * 0.12) / 1000,
    cementoReprocesado: rotos == null ? null : rotos * 1000 * 0.0425,
  }
}

export function calcWater(row: WaterRow) {
  return {
    consumoTotal: sumCells(
      row.pipas,
      row.externoEntuvado,
      row.superficial,
      row.subsuperficial,
      row.lluvia,
      row.recirculacion,
    ),
  }
}

export const BIODIVERSITY_ROWS: { key: string; group: string; label: string }[] =
  [
    {
      key: 'uicn_menor',
      group: 'UICN',
      label: 'Especies de menor preocupación',
    },
    { key: 'uicn_casi', group: 'UICN', label: 'Especies casi amenazadas' },
    { key: 'uicn_vuln', group: 'UICN', label: 'Especies vulnerables' },
    { key: 'cites_i', group: 'CITES', label: 'Apéndice I' },
    { key: 'cites_ii', group: 'CITES', label: 'Apéndice II' },
    { key: 'cites_iii', group: 'CITES', label: 'Apéndice III' },
    { key: 'lea_i', group: 'LEA - CONAP', label: 'Categoría I' },
    { key: 'lea_ii', group: 'LEA - CONAP', label: 'Categoría II' },
    { key: 'lea_iii', group: 'LEA - CONAP', label: 'Categoría III' },
    {
      key: 'shannon',
      group: 'Indicadores',
      label: 'Índice de Biodiversidad de Shannon-Wiener',
    },
    {
      key: 'canteras_autorizadas',
      group: 'Indicadores',
      label: 'Total de canteras autorizadas',
    },
    {
      key: 'canteras_operacion',
      group: 'Indicadores',
      label: 'Total de canteras en operación',
    },
    {
      key: 'canteras_alta_bio',
      group: 'Indicadores',
      label: 'Total de canteras con alta biodiversidad',
    },
    {
      key: 'pct_alta_bio',
      group: 'Indicadores',
      label: 'Porcentaje de canteras con alta biodiversidad',
    },
    {
      key: 'canteras_plan',
      group: 'Indicadores',
      label: 'Canteras con alta biodiversidad con plan de manejo',
    },
  ]

function blankBiodiversity(): BiodiversityMatrix {
  return Object.fromEntries(
    BIODIVERSITY_ROWS.map((r) => [
      r.key,
      Object.fromEntries(BIODIVERSITY_YEARS.map((y) => [y, ''])) as Record<
        BiodiversityYear,
        CellValue
      >,
    ]),
  )
}

export function createEmptyMonitoringState(
  meta?: Partial<MonitoringMeta>,
): MonitoringState {
  return {
    meta: {
      year: meta?.year ?? '2026',
      version: meta?.version ?? 'v.1',
      plant: meta?.plant ?? 'Alicon',
      infoDate: meta?.infoDate ?? '',
      responsible: meta?.responsible ?? '',
    },
    production: emptyMonthly(blankProduction),
    fuel: emptyMonthly(blankFuel),
    electricity: emptyMonthly(blankElectricity),
    supplies: emptyMonthly(blankSupplies),
    water: emptyMonthly(blankWater),
    waterConfig: {
      disposicionResidual: '',
      puntosDescarga: '',
      metodosTratamiento: '',
    },
    waste: emptyMonthly(blankWaste),
    biodiversity: blankBiodiversity(),
  }
}

/** Datos precargados Ene–Jun 2026 desde el Excel Alicon (valores de entrada). */
export function createInitialMonitoringState(): MonitoringState {
  const production = emptyMonthly(blankProduction)
  const fuel = emptyMonthly(blankFuel)
  const electricity = emptyMonthly(blankElectricity)
  const supplies = emptyMonthly(blankSupplies)
  const water = emptyMonthly(blankWater)
  const waste = emptyMonthly(blankWaste)

  Object.assign(production.Enero, {
    clinkerIngreso: '15573.19',
    clinkerConsumo: '11445.31',
    caliza: '1513.49',
    yeso: '1068.39',
    aditivo: '4760',
    toba: '3667.43',
    prodUGC: '16235.03',
    clinkerUGC: '10874.41',
    prodCFB: '686.04',
    clinkerCFB: '570.9',
    prodOtro: 'n/a',
    clinkerOtro: 'n/a',
  } satisfies Partial<ProductionRow>)

  Object.assign(production.Febrero, {
    clinkerIngreso: '16125.19',
    clinkerConsumo: '11849.81',
    caliza: '1656.93',
    yeso: '1098.46',
    aditivo: '10710',
    toba: '3860.29',
    prodUGC: '18476.85',
    clinkerUGC: '11650.01',
    prodCFB: '241.95',
    clinkerCFB: '199.8',
    prodOtro: 'n/a',
    clinkerOtro: 'n/a',
  } satisfies Partial<ProductionRow>)

  Object.assign(production.Marzo, {
    clinkerIngreso: '20421.58',
    clinkerConsumo: '12174.92',
    caliza: '1829.87',
    yeso: '1052.55',
    aditivo: '8330',
    toba: '3953.74',
    prodUGC: '20170.06',
    clinkerUGC: '13485.75',
    prodCFB: '649.25',
    clinkerCFB: '552',
    prodOtro: 'n/a',
    clinkerOtro: 'n/a',
  } satisfies Partial<ProductionRow>)

  Object.assign(production.Abril, {
    clinkerIngreso: '18572.78',
    clinkerConsumo: '12022.75',
    caliza: '1479.04',
    yeso: '919.53',
    aditivo: '5950',
    toba: '3234.74',
    prodUGC: '15838.24',
    clinkerUGC: '10999.45',
    prodCFB: '1219.92',
    clinkerCFB: '1023.3',
    prodOtro: 'n/a',
    clinkerOtro: 'n/a',
  } satisfies Partial<ProductionRow>)

  Object.assign(production.Mayo, {
    clinkerIngreso: '11557.13',
    clinkerConsumo: '13957.73',
    caliza: '1752.34',
    yeso: '1014.055',
    aditivo: '5950',
    toba: '3183.42',
    prodUGC: '18876.86',
    clinkerUGC: '13311.53',
    prodCFB: '783.59',
    clinkerCFB: '646.2',
    prodOtro: 'n/a',
    clinkerOtro: 'n/a',
  } satisfies Partial<ProductionRow>)

  Object.assign(production.Junio, {
    clinkerIngreso: '25072',
    clinkerConsumo: '13957.73',
    caliza: '1500.58',
    yeso: '941.89',
    aditivo: '7140',
    toba: '3312.27',
    prodUGC: '17773.58',
    clinkerUGC: '12769.5',
    prodCFB: '985.201',
    clinkerCFB: '834.4',
    prodOtro: 'n/a',
    clinkerOtro: 'n/a',
  } satisfies Partial<ProductionRow>)

  const diesel: Partial<Record<MonitoringMonth, string>> = {
    Enero: '1511',
    Febrero: '1877',
    Marzo: '2347',
    Abril: '1773',
    Mayo: '2011',
    Junio: '2312.81',
  }
  for (const [m, v] of Object.entries(diesel)) {
    fuel[m as MonitoringMonth].dieselMovil = v
  }

  const elec: Partial<
    Record<MonitoringMonth, Pick<ElectricityRow, 'produccionCemento' | 'servicios'>>
  > = {
    Enero: { produccionCemento: '678664.6', servicios: '42723.3' },
    Febrero: { produccionCemento: '757514.36', servicios: '45398.45' },
    Marzo: { produccionCemento: '842107.62', servicios: '51897.21' },
    Abril: { produccionCemento: '717950.74', servicios: '48301.54' },
    Mayo: { produccionCemento: '857976.87', servicios: '56291.68' },
    Junio: { produccionCemento: '818551.62', servicios: '55171.102605' },
  }
  for (const [m, v] of Object.entries(elec)) {
    Object.assign(electricity[m as MonitoringMonth], v, {
      perdidas: '0',
      redElectrica: '',
    })
  }

  const bags: Partial<
    Record<
      MonitoringMonth,
      Pick<SuppliesRow, 'sacosMillares' | 'sacosRotosEnvasado' | 'grasa'>
    >
  > = {
    Enero: { sacosMillares: '327.36', sacosRotosEnvasado: '0.93', grasa: '0' },
    Febrero: {
      sacosMillares: '561.177',
      sacosRotosEnvasado: '0.72',
      grasa: '0.033',
    },
    Marzo: { sacosMillares: '355.68', sacosRotosEnvasado: '0.95', grasa: '0' },
    Abril: { sacosMillares: '491.334', sacosRotosEnvasado: '1.12', grasa: '0' },
    Mayo: { sacosMillares: '619.25', sacosRotosEnvasado: '0.36', grasa: '0' },
    Junio: { sacosMillares: '328.32', sacosRotosEnvasado: '1.74', grasa: '0' },
  }
  for (const [m, v] of Object.entries(bags)) {
    Object.assign(supplies[m as MonitoringMonth], {
      r134a: '0',
      r141b: '0',
      r410: '0',
      sacosRotosFabrica: '0',
      aceite: '0',
      ...v,
    })
  }

  const pipas: Partial<Record<MonitoringMonth, { pipas: string; aguaHumana: string }>> =
    {
      Enero: { pipas: '330.6', aguaHumana: '185' },
      Febrero: { pipas: '262.2', aguaHumana: '162' },
      Marzo: { pipas: '319.2', aguaHumana: '172' },
      Abril: { pipas: '250.8', aguaHumana: '126' },
      Mayo: { pipas: '296.4', aguaHumana: '220' },
      Junio: { pipas: '193.8', aguaHumana: '174' },
    }
  for (const [m, v] of Object.entries(pipas)) {
    Object.assign(water[m as MonitoringMonth], v)
  }

  Object.assign(waste.Enero, {
    ordinarios: '0.8',
    peligrosos: '0',
    vertedero: '0.8',
    coprocesamiento: '0',
    reutilizados: '0',
    reciclados: '0',
    otraDisposicion: '0',
    derramesCantidad: '0',
    derramesVolumen: '0',
  })
  Object.assign(waste.Febrero, {
    ordinarios: '0.22',
    peligrosos: '0',
    vertedero: '0.22',
    coprocesamiento: '0',
    reutilizados: '0',
    reciclados: '0',
    otraDisposicion: '0',
    derramesCantidad: '0',
    derramesVolumen: '0',
  })
  Object.assign(waste.Marzo, {
    ordinarios: '3.02',
    peligrosos: '0',
    vertedero: '0.67',
    coprocesamiento: '0',
    reutilizados: '0',
    reciclados: '2.35',
    otraDisposicion: '0',
    derramesCantidad: '0',
    derramesVolumen: '0',
  })
  Object.assign(waste.Abril, {
    ordinarios: '2.74',
    peligrosos: '0',
    vertedero: '2.24',
    coprocesamiento: '0',
    reutilizados: '0',
    reciclados: '0.5',
    otraDisposicion: '0',
    derramesCantidad: '0',
    derramesVolumen: '0',
  })
  Object.assign(waste.Mayo, {
    ordinarios: '9.95',
    peligrosos: '0',
    vertedero: '1.56',
    coprocesamiento: '0',
    reutilizados: '14.85',
    reciclados: '8.39',
    otraDisposicion: '0',
    derramesCantidad: '0',
    derramesVolumen: '0',
  })
  Object.assign(waste.Junio, {
    ordinarios: '7.19',
    peligrosos: '0',
    vertedero: '2.49',
    coprocesamiento: '0',
    reutilizados: '0',
    reciclados: '4.7',
    otraDisposicion: '0',
    derramesCantidad: '0',
    derramesVolumen: '0',
  })

  return {
    meta: {
      year: '2026',
      version: 'v.1',
      plant: 'Alicon',
      infoDate: '',
      responsible: '',
    },
    production,
    fuel,
    electricity,
    supplies,
    water,
    waterConfig: {
      disposicionResidual: 'Reutilización tipo 1 según AG236-2006',
      puntosDescarga: '1',
      metodosTratamiento: 'Primario, secundario y terciario',
    },
    waste,
    biodiversity: blankBiodiversity(),
  }
}

export function rowHasData(row: Record<string, CellValue>): boolean {
  return Object.values(row).some((v) => {
    const t = String(v).trim()
    return t !== '' && t !== '0' && !/^n\/?a$/i.test(t)
  })
}

export function monthFillCount(
  store: MonthlyStore<Record<string, CellValue>>,
): number {
  return MONITORING_MONTHS.filter((m) => rowHasData(store[m])).length
}
