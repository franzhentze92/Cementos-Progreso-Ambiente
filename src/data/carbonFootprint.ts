/** Datos ilustrativos de huella de carbono para el módulo ejecutivo (Ambiente). */

export const CARBON_META = {
  period: '2025',
  updatedAt: 'Marzo 2026',
  methodology: 'GHG Protocol · Cement Sustainability Initiative',
  targetYear: 2030,
  baselineYear: 2020,
}

export const CARBON_KPIS = [
  {
    id: 'total',
    label: 'Emisiones totales',
    value: '4.82',
    unit: 'MtCO₂e',
    delta: -4.2,
    deltaLabel: 'vs 2024',
    hint: 'Alcances 1 + 2 + 3 (parcial)',
  },
  {
    id: 'intensity',
    label: 'Intensidad neta',
    value: '512',
    unit: 'kgCO₂ / t cem.',
    delta: -3.8,
    deltaLabel: 'vs 2024',
    hint: 'Cemento equivalente',
  },
  {
    id: 'scope1',
    label: 'Alcance 1',
    value: '78%',
    unit: 'del total',
    delta: -1.1,
    deltaLabel: 'pp vs 2024',
    hint: 'Proceso + combustión',
  },
  {
    id: 'target',
    label: 'Avance meta 2030',
    value: '41%',
    unit: 'de reducción',
    delta: 6,
    deltaLabel: 'pp vs plan',
    hint: 'Meta: −30% intensidad vs 2020',
  },
]

export const SCOPE_BREAKDOWN = [
  { name: 'Alcance 1 — Directas', value: 3.76, fill: '#047935', share: 78 },
  { name: 'Alcance 2 — Eléctricas', value: 0.41, fill: '#5ab64b', share: 8.5 },
  { name: 'Alcance 3 — Cadena', value: 0.65, fill: '#c2d500', share: 13.5 },
]

export const EMISSION_SOURCES = [
  { name: 'Calcínación (proceso)', value: 52, fill: '#047935' },
  { name: 'Combustibles fósiles', value: 26, fill: '#5e5f61' },
  { name: 'Electricidad', value: 8.5, fill: '#5ab64b' },
  { name: 'Combustibles alternos', value: 4, fill: '#c2d500' },
  { name: 'Logística y otros A3', value: 9.5, fill: '#8b7355' },
]

export const INTENSITY_PATHWAY = [
  { year: '2020', real: 640, meta: 640 },
  { year: '2021', real: 618, meta: 622 },
  { year: '2022', real: 590, meta: 604 },
  { year: '2023', real: 565, meta: 586 },
  { year: '2024', real: 532, meta: 568 },
  { year: '2025', real: 512, meta: 550 },
  { year: '2026', real: null, meta: 532 },
  { year: '2027', real: null, meta: 508 },
  { year: '2028', real: null, meta: 484 },
  { year: '2029', real: null, meta: 460 },
  { year: '2030', real: null, meta: 448 },
]

export const MONTHLY_EMISSIONS = [
  { month: 'Ene', alcance1: 308, alcance2: 34, alcance3: 52 },
  { month: 'Feb', alcance1: 295, alcance2: 31, alcance3: 49 },
  { month: 'Mar', alcance1: 318, alcance2: 35, alcance3: 54 },
  { month: 'Abr', alcance1: 301, alcance2: 33, alcance3: 51 },
  { month: 'May', alcance1: 322, alcance2: 36, alcance3: 55 },
  { month: 'Jun', alcance1: 310, alcance2: 34, alcance3: 53 },
  { month: 'Jul', alcance1: 315, alcance2: 35, alcance3: 54 },
  { month: 'Ago', alcance1: 308, alcance2: 33, alcance3: 52 },
  { month: 'Sep', alcance1: 298, alcance2: 32, alcance3: 50 },
  { month: 'Oct', alcance1: 312, alcance2: 34, alcance3: 53 },
  { month: 'Nov', alcance1: 305, alcance2: 33, alcance3: 51 },
  { month: 'Dic', alcance1: 268, alcance2: 30, alcance3: 46 },
]

export type PlantEmissions = {
  id: string
  name: string
  country: string
  type: 'Cemento' | 'Concreto'
  lat: number
  lng: number
  tco2e: number
  intensity: number
  thermalSub: number
  renewableShare: number
  status: 'En meta' | 'Atención' | 'Crítico'
  yoy: number
}

export const PLANT_EMISSIONS: PlantEmissions[] = [
  {
    id: 'gt-san-miguel',
    name: 'San Miguel',
    country: 'Guatemala',
    type: 'Cemento',
    lat: 14.813632,
    lng: -90.278771,
    tco2e: 1480,
    intensity: 505,
    thermalSub: 11.2,
    renewableShare: 68,
    status: 'En meta',
    yoy: -4.1,
  },
  {
    id: 'gt-san-gabriel',
    name: 'San Gabriel',
    country: 'Guatemala',
    type: 'Cemento',
    lat: 14.735452,
    lng: -90.703316,
    tco2e: 1120,
    intensity: 498,
    thermalSub: 8.4,
    renewableShare: 72,
    status: 'En meta',
    yoy: -5.2,
  },
  {
    id: 'cr-colorado',
    name: 'Colorado',
    country: 'Costa Rica',
    type: 'Cemento',
    lat: 10.199791,
    lng: -85.182032,
    tco2e: 620,
    intensity: 528,
    thermalSub: 6.1,
    renewableShare: 95,
    status: 'Atención',
    yoy: -1.8,
  },
  {
    id: 'cr-patarra',
    name: 'Patarrá',
    country: 'Costa Rica',
    type: 'Cemento',
    lat: 9.8515,
    lng: -84.0478,
    tco2e: 410,
    intensity: 541,
    thermalSub: 4.8,
    renewableShare: 92,
    status: 'Atención',
    yoy: -0.9,
  },
  {
    id: 'pa-el-limon',
    name: 'El Limón',
    country: 'Panamá',
    type: 'Cemento',
    lat: 8.9071663,
    lng: -79.7534351,
    tco2e: 540,
    intensity: 535,
    thermalSub: 7.5,
    renewableShare: 48,
    status: 'Atención',
    yoy: -2.4,
  },
  {
    id: 'bz-democracia',
    name: 'Belice',
    country: 'Belice',
    type: 'Cemento',
    lat: 17.3462,
    lng: -88.5518,
    tco2e: 180,
    intensity: 558,
    thermalSub: 2.1,
    renewableShare: 35,
    status: 'Crítico',
    yoy: 0.6,
  },
  {
    id: 'hn-bijao',
    name: 'Bijao',
    country: 'Honduras',
    type: 'Cemento',
    lat: 15.706281,
    lng: -87.93079,
    tco2e: 390,
    intensity: 522,
    thermalSub: 5.5,
    renewableShare: 42,
    status: 'Atención',
    yoy: -2.0,
  },
  {
    id: 'do-spm',
    name: 'San Pedro de Macorís',
    country: 'Rep. Dom.',
    type: 'Cemento',
    lat: 18.506193,
    lng: -69.339805,
    tco2e: 350,
    intensity: 515,
    thermalSub: 9.0,
    renewableShare: 38,
    status: 'En meta',
    yoy: -3.5,
  },
]

export const COUNTRY_FOOTPRINT = [
  { country: 'Guatemala', tco2e: 2.72, share: 56.4, intensity: 502 },
  { country: 'Costa Rica', tco2e: 0.88, share: 18.3, intensity: 533 },
  { country: 'Panamá', tco2e: 0.54, share: 11.2, intensity: 535 },
  { country: 'Honduras', tco2e: 0.39, share: 8.1, intensity: 522 },
  { country: 'Rep. Dom.', tco2e: 0.35, share: 7.3, intensity: 515 },
  { country: 'Belice', tco2e: 0.18, share: 3.7, intensity: 558 },
]

export const ABATEMENT_LEVERS = [
  {
    id: 'thermal',
    title: 'Sustitución térmica',
    impact: 'Alto',
    potential: '−180 ktCO₂e/año',
    progress: 32,
    owner: 'Operaciones / Energía',
    detail:
      'Elevar coprocesamiento de 9.8% a 18% en San Miguel, Colorado y El Limón.',
  },
  {
    id: 'clinker',
    title: 'Factor de clínker',
    impact: 'Alto',
    potential: '−220 ktCO₂e/año',
    progress: 48,
    owner: 'Producto / Calidad',
    detail:
      'Cementos compuestos y adiciones locales para bajar clínker/cemento a 0.72.',
  },
  {
    id: 'renewables',
    title: 'Electricidad renovable',
    impact: 'Medio',
    potential: '−95 ktCO₂e/año',
    progress: 71,
    owner: 'Compras de energía',
    detail: 'PPAs adicionales en Panamá, Belice y Honduras para superar 75% renovable.',
  },
  {
    id: 'efficiency',
    title: 'Eficiencia térmica y eléctrica',
    impact: 'Medio',
    potential: '−70 ktCO₂e/año',
    progress: 55,
    owner: 'Mantenimiento / CAPEX',
    detail: 'Modernización de molinos y hornos; recuperación de calor residual.',
  },
  {
    id: 'logistics',
    title: 'Logística baja en carbono',
    impact: 'Bajo',
    potential: '−40 ktCO₂e/año',
    progress: 22,
    owner: 'Supply Chain',
    detail: 'Optimización de rutas, flota Euro V/VI y mayor modal ferroviario/marino.',
  },
]

export const EXECUTIVE_ALERTS = [
  {
    id: 'a1',
    level: 'Crítico',
    title: 'Belice fuera de trayectoria',
    text: 'Intensidad 558 kgCO₂/t (+0.6% YoY). Requiere plan de combustibles alternos y energía limpia.',
  },
  {
    id: 'a2',
    level: 'Atención',
    title: 'Sustitución térmica bajo meta',
    text: 'Grupo en 9.8% vs meta interna 14% 2026. Gap mayor en Costa Rica y Belice.',
  },
  {
    id: 'a3',
    level: 'Positivo',
    title: 'Guatemala lidera reducción',
    text: 'San Miguel y San Gabriel concentran −4.5% YoY y 54% de la reducción absoluta del grupo.',
  },
]

export const ABATEMENT_CURVE = [
  { lever: 'Clínker', cost: 8, abatement: 220 },
  { lever: 'Térmica', cost: 12, abatement: 180 },
  { lever: 'Renovable', cost: 18, abatement: 95 },
  { lever: 'Eficiencia', cost: 25, abatement: 70 },
  { lever: 'Logística', cost: 35, abatement: 40 },
]
