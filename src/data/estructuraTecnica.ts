/**
 * Grafo de estructura técnica: proyectos ↔ módulos.
 * Topología canónica desde OPERATIONAL_MODULES + APP_MODULES.
 */

import { AGRO_INSPECCION_SEDES } from './agroInspecciones'
import { ALICON_INSPECCION_SEDE } from './aliconInspecciones'
import {
  DESCARGA_BARCOS_INSPECCION_SEDE,
  MATERIALES_DESCARGA,
} from './descargaBarcosInspecciones'
import {
  OPERATIONAL_MODULES,
  PROJECT_SCOPES,
  type ProjectScope,
} from './operationalModules'

export type StructureGroupId =
  | 'inicio'
  | 'operaciones'
  | 'cumplimiento'
  | 'sostenibilidad'
  | 'documentos'
  | 'admin'

export type StructureModuleNode = {
  id: string
  label: string
  group: StructureGroupId
  path: string
  /** Proyectos conectados; vacío = plataforma (todos). */
  scopes: ProjectScope[]
  /** Tablas Supabase asociadas (conteo en vivo). */
  tables: string[]
  /** true si el alcance viene de OPERATIONAL_MODULES.scopes */
  scoped: boolean
}

export type StructureProjectNode = {
  id: ProjectScope
  label: string
  sites: string[]
  color: string
}

export type StructureEdge = {
  id: string
  projectId: ProjectScope
  moduleId: string
  kind: 'scoped' | 'platform'
}

export type StructureGroupMeta = {
  id: StructureGroupId
  label: string
  color: string
  /** Ángulo inicial/final del arco (grados, 0 = este, sentido horario desde arriba). */
  startDeg: number
  endDeg: number
}

/** Colores del diagrama (alineados a la leyenda de grupos). */
export const STRUCTURE_GROUPS: StructureGroupMeta[] = [
  { id: 'inicio', label: 'Inicio', color: '#5ab64b', startDeg: 200, endDeg: 250 },
  {
    id: 'operaciones',
    label: 'Operaciones',
    color: '#2d8a5a',
    startDeg: 280,
    endDeg: 20,
  },
  {
    id: 'cumplimiento',
    label: 'Cumplimiento Legal',
    color: '#3b82f6',
    startDeg: 25,
    endDeg: 70,
  },
  {
    id: 'sostenibilidad',
    label: 'Sostenibilidad',
    color: '#eab308',
    startDeg: 75,
    endDeg: 115,
  },
  {
    id: 'admin',
    label: 'Administración',
    color: '#f97316',
    startDeg: 120,
    endDeg: 160,
  },
  {
    id: 'documentos',
    label: 'Documentos y reportes',
    color: '#a855f7',
    startDeg: 165,
    endDeg: 195,
  },
]

export const STRUCTURE_GROUP_COLOR: Record<StructureGroupId, string> =
  Object.fromEntries(STRUCTURE_GROUPS.map((g) => [g.id, g.color])) as Record<
    StructureGroupId,
    string
  >

export const STRUCTURE_PROJECTS: StructureProjectNode[] = [
  {
    id: 'agroprogreso',
    label: 'AgroProgreso',
    sites: [...AGRO_INSPECCION_SEDES],
    color: '#5ab64b',
  },
  {
    id: 'planta-alicon',
    label: 'Planta Alicón',
    sites: [ALICON_INSPECCION_SEDE, 'Áreas operativas'],
    color: '#38bdf8',
  },
  {
    id: 'descarga-barcos',
    label: 'Descarga Barcos',
    sites: [DESCARGA_BARCOS_INSPECCION_SEDE, ...MATERIALES_DESCARGA],
    color: '#818cf8',
  },
]

const ALL_SCOPES = PROJECT_SCOPES.map((p) => p.id)

/** Módulos de plataforma (conectan a todos los proyectos). */
const PLATFORM_MODULES: Omit<StructureModuleNode, 'scopes' | 'scoped'>[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    group: 'inicio',
    path: '/dashboard',
    tables: [],
  },
  {
    id: 'mapa',
    label: 'Mapa',
    group: 'inicio',
    path: '/mapa',
    tables: [],
  },
  {
    id: 'monitoreo-en-vivo',
    label: 'Monitoreo en vivo',
    group: 'inicio',
    path: '/monitoreo-en-vivo',
    tables: [],
  },
  {
    id: 'analista',
    label: 'Analista IA',
    group: 'inicio',
    path: '/analista',
    tables: ['briefings_semanales'],
  },
  {
    id: 'resumen-operaciones',
    label: 'Resumen operaciones',
    group: 'operaciones',
    path: '/resumen-operaciones',
    tables: [],
  },
  {
    id: 'compromisos',
    label: 'Compromisos ambientales',
    group: 'cumplimiento',
    path: '/compromisos-ambientales/lista',
    tables: ['compromisos_ambientales'],
  },
  {
    id: 'auditorias',
    label: 'Auditorías',
    group: 'cumplimiento',
    path: '/auditorias',
    tables: [
      'auditorias_compromisos',
      'compromisos_ambientales',
      'compromisos_evidencias',
    ],
  },
  {
    id: 'capa',
    label: 'Acciones correctivas (CAPA)',
    group: 'cumplimiento',
    path: '/capa',
    tables: ['capa_acciones'],
  },
  {
    id: 'cumplimiento',
    label: 'Cumplimiento legal',
    group: 'cumplimiento',
    path: '/cumplimiento',
    tables: ['cumplimiento_obligaciones'],
  },
  {
    id: 'calendario-legal',
    label: 'Calendario legal',
    group: 'cumplimiento',
    path: '/calendario-legal',
    tables: ['cumplimiento_obligaciones'],
  },
  {
    id: 'resumen-cumplimiento',
    label: 'Resumen cumplimiento',
    group: 'cumplimiento',
    path: '/resumen-cumplimiento',
    tables: [],
  },
  {
    id: 'circularidad',
    label: 'Circularidad',
    group: 'sostenibilidad',
    path: '/circularidad',
    tables: ['circularidad_flujos'],
  },
  {
    id: 'metas',
    label: 'Metas',
    group: 'sostenibilidad',
    path: '/metas',
    tables: ['metas_ambientales'],
  },
  {
    id: 'umbrales',
    label: 'Umbrales',
    group: 'sostenibilidad',
    path: '/umbrales',
    tables: ['monitoreo_umbrales'],
  },
  {
    id: 'intensidad',
    label: 'Intensidad ambiental',
    group: 'sostenibilidad',
    path: '/intensidad',
    tables: ['carbon_escenarios'],
  },
  {
    id: 'indicadores',
    label: 'Indicadores',
    group: 'sostenibilidad',
    path: '/indicadores',
    tables: [],
  },
  {
    id: 'expedientes',
    label: 'Expedientes',
    group: 'documentos',
    path: '/expedientes',
    tables: ['expedientes_ambientales'],
  },
  {
    id: 'exportes',
    label: 'Exportes',
    group: 'documentos',
    path: '/exportes',
    tables: [],
  },
  {
    id: 'biblioteca',
    label: 'Biblioteca',
    group: 'documentos',
    path: '/biblioteca',
    tables: ['biblioteca_documentos'],
  },
  {
    id: 'centro-documental',
    label: 'Centro documental',
    group: 'documentos',
    path: '/centro-documental',
    tables: [],
  },
  {
    id: 'entrada-datos',
    label: 'Entrada de datos',
    group: 'admin',
    path: '/entrada-datos/inspeccion-ambiental',
    tables: [],
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    group: 'admin',
    path: '/usuarios',
    tables: ['app_users'],
  },
  {
    id: 'accesos',
    label: 'Accesos',
    group: 'admin',
    path: '/accesos',
    tables: ['app_role_modules'],
  },
  {
    id: 'perfil',
    label: 'Perfil',
    group: 'admin',
    path: '/perfil',
    tables: [],
  },
]

/** Tablas por módulo operativo (conteo en vivo). */
const OPS_TABLES: Record<string, string[]> = {
  'gestion-de-residuos': ['agro_gestion_residuos'],
  'consumo-de-agua': ['agro_consumo_agua'],
  'inspeccion-ambiental': [
    'ejecuciones_inspecciones',
    'inspecciones_campo',
  ],
  'incidentes-ambientales': ['incidentes_ambientales'],
  'monitoreo-ambiental': [
    'agro_monitoreos_ambientales',
    'ejecuciones_monitoreos',
  ],
  capacitaciones: ['agro_capacitaciones'],
  'licencias-ambientales': ['agro_licencias_ambientales'],
  compostaje: ['agro_compostaje'],
  'nda-casco-verde': ['agro_nda_casco_verde'],
  'nda-general': ['agro_nda_general'],
  'gestion-de-tramites': ['agro_gestion_tramites'],
  'huella-de-carbono': [
    'carbon_plants',
    'carbon_campaigns',
    'carbon_production_monthly',
  ],
}

function opsGroup(moduleId: string): StructureGroupId {
  if (
    moduleId === 'licencias-ambientales' ||
    moduleId === 'gestion-de-tramites'
  ) {
    return 'cumplimiento'
  }
  if (moduleId === 'huella-de-carbono') return 'sostenibilidad'
  return 'operaciones'
}

export function buildStructureModules(): StructureModuleNode[] {
  const ops: StructureModuleNode[] = OPERATIONAL_MODULES.filter(
    (m) => m.operaciones,
  ).map((m) => ({
    id: m.id,
    label: m.label,
    group: opsGroup(m.id),
    path: `/operaciones/${m.id}`,
    scopes: [...m.scopes],
    tables: OPS_TABLES[m.id] ?? [],
    scoped: true,
  }))

  const platform: StructureModuleNode[] = PLATFORM_MODULES.map((m) => ({
    ...m,
    scopes: [...ALL_SCOPES],
    scoped: false,
  }))

  return [...platform, ...ops]
}

export function buildStructureEdges(
  modules: StructureModuleNode[],
): StructureEdge[] {
  return modules.flatMap((m) =>
    m.scopes.map((projectId) => ({
      id: `${projectId}->${m.id}`,
      projectId,
      moduleId: m.id,
      kind: m.scoped ? ('scoped' as const) : ('platform' as const),
    })),
  )
}

export type StructureGraph = {
  projects: StructureProjectNode[]
  modules: StructureModuleNode[]
  edges: StructureEdge[]
  groups: StructureGroupMeta[]
}

export function buildStructureGraph(): StructureGraph {
  const modules = buildStructureModules()
  return {
    projects: STRUCTURE_PROJECTS,
    modules,
    edges: buildStructureEdges(modules),
    groups: STRUCTURE_GROUPS,
  }
}

/** Posición polar → cartesiana (0° = arriba, sentido horario). */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  degFromTop: number,
): { x: number; y: number } {
  const rad = ((degFromTop - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function normalizeSpan(start: number, end: number): { start: number; span: number } {
  let s = start
  let e = end
  if (e < s) e += 360
  return { start: s, span: e - s }
}

/** Ángulos equiespaciados por grupo para los módulos del anillo. */
export function layoutModuleAngles(
  modules: StructureModuleNode[],
): Map<string, number> {
  const byGroup = new Map<StructureGroupId, StructureModuleNode[]>()
  for (const g of STRUCTURE_GROUPS) byGroup.set(g.id, [])
  for (const m of modules) {
    byGroup.get(m.group)?.push(m)
  }

  const angles = new Map<string, number>()
  for (const g of STRUCTURE_GROUPS) {
    const list = byGroup.get(g.id) ?? []
    if (list.length === 0) continue
    const { start, span } = normalizeSpan(g.startDeg, g.endDeg)
    const pad = list.length === 1 ? span / 2 : span / (list.length + 1)
    list.forEach((m, i) => {
      const t = list.length === 1 ? start + span / 2 : start + pad * (i + 1)
      angles.set(m.id, t % 360)
    })
  }
  return angles
}

/** Posiciones fijas de proyectos en el núcleo. */
export function layoutProjectPositions(
  cx: number,
  cy: number,
): Record<ProjectScope, { x: number; y: number }> {
  return {
    agroprogreso: { x: cx - 10, y: cy - 78 },
    'planta-alicon': { x: cx - 95, y: cy + 55 },
    'descarga-barcos': { x: cx + 95, y: cy + 55 },
  }
}
