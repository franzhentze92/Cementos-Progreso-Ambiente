export const ENERGY_MIX = [
  { name: 'Renovables', value: 62.1, fill: '#5ab64b' },
  { name: 'No renovables', value: 37.9, fill: '#8b7355' },
]

export const THERMAL_MIX = [
  { name: 'Combustibles fósiles', value: 90.2, fill: '#5e5f61' },
  { name: 'Alternos (coprocesamiento)', value: 9.8, fill: '#c2d500' },
]

export const EMISSIONS_TREND = [
  { year: '2022', alcance1: 0.58, alcance2: 0.042 },
  { year: '2023', alcance1: 0.55, alcance2: 0.039 },
  { year: '2024', alcance1: 0.52, alcance2: 0.036 },
  { year: '2025', alcance1: 0.5, alcance2: 0.034 },
  { year: '2026', alcance1: 0.48, alcance2: 0.032 },
]

export const BIODIVERSITY = [
  { name: 'Aves', value: 240, fill: '#047935' },
  { name: 'Mamíferos', value: 25, fill: '#5ab64b' },
  { name: 'Mariposas', value: 155, fill: '#c2d500' },
  { name: 'Herpetofauna', value: 22, fill: '#347744' },
  { name: 'Flora', value: 514, fill: '#8fbf4a' },
]

export const COUNTRY_SITES = [
  { country: 'Guatemala', sites: 9 },
  { country: 'Costa Rica', sites: 9 },
  { country: 'Panamá', sites: 7 },
  { country: 'El Salvador', sites: 2 },
  { country: 'Belice', sites: 1 },
  { country: 'Honduras', sites: 1 },
  { country: 'Rep. Dom.', sites: 1 },
]

export const RECOMMENDATIONS = [
  {
    id: 'r1',
    priority: 'Alta',
    title: 'Acelerar sustitución térmica',
    detail:
      'La tasa actual es 9.8%. Priorizar coprocesamiento en San Miguel y Colorado puede reducir emisiones de Alcance 1.',
    action: 'Revisar plan de combustibles alternos 2025–2026',
  },
  {
    id: 'r2',
    priority: 'Media',
    title: 'Ampliar energía renovable',
    detail:
      'Ya se alcanza 62.1% renovable. Contratos PPA adicionales en Costa Rica y Panamá ayudarían a superar 70%.',
    action: 'Evaluar oferta renovable regional',
  },
  {
    id: 'r3',
    priority: 'Media',
    title: 'Integrar datos Mixto Listo',
    detail:
      'Las plantas de concreto en Guatemala ya están mapeadas; falta conectar indicadores de huella por planta al módulo DB.',
    action: 'Habilitar Entrada de Datos DB1–DB4',
  },
  {
    id: 'r4',
    priority: 'Baja',
    title: 'Comunicar biodiversidad',
    detail:
      '265 especies animales y 514 de flora monitoreadas desde 2007: buen contenido para el reporte de sostenibilidad.',
    action: 'Incluir panel en Reporte 3',
  },
]
