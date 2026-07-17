/**
 * Catálogo estable de módulos/páginas para RBAC por rol.
 * Los ids se guardan en app_role_modules.module_id
 *
 * Grupos alineados a la lógica mental del side menu.
 * Operaciones / Entrada son módulos funcionales (como Compromisos).
 * Los proyectos se filtran dentro de cada módulo vía `proyecto.*`.
 */

import {
  OPERATIONAL_MODULES,
  PROJECT_SCOPES,
  expandLegacyModuleId,
  isProjectScope,
  projectScopeModuleId,
  type ProjectScope,
} from './operationalModules'

export type AppModuleGroupId =
  | 'inicio'
  | 'operaciones'
  | 'cumplimiento'
  | 'sostenibilidad'
  | 'documentos'
  | 'entrada-datos'
  | 'proyectos'
  | 'admin'

export type AppModuleDef = {
  id: string
  label: string
  group: AppModuleGroupId
  path: string
}

export type AppModuleGroup = {
  id: AppModuleGroupId
  label: string
  description: string
}

/** Módulos operativos que en el menú viven bajo Cumplimiento. */
const OPS_IN_CUMPLIMIENTO = new Set([
  'licencias-ambientales',
  'gestion-de-tramites',
])

/** Módulos operativos que en el menú viven bajo Sostenibilidad. */
const OPS_IN_SOSTENIBILIDAD = new Set(['huella-de-carbono'])

export const APP_MODULE_GROUPS: AppModuleGroup[] = [
  {
    id: 'inicio',
    label: 'Inicio',
    description: 'Consulta rápida y visión general del día a día',
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    description: 'Ejecución, registro y monitoreo en campo/planta',
  },
  {
    id: 'cumplimiento',
    label: 'Cumplimiento',
    description: 'Obligaciones, permisos, compromisos y corrección',
  },
  {
    id: 'sostenibilidad',
    label: 'Sostenibilidad',
    description: 'Indicadores, metas y desempeño ambiental',
  },
  {
    id: 'documentos',
    label: 'Documentos y Reportes',
    description: 'Evidencias, biblioteca y salidas de información',
  },
  {
    id: 'entrada-datos',
    label: 'Captura de datos',
    description: 'Formularios de captura por módulo (filtro de proyecto en página)',
  },
  {
    id: 'proyectos',
    label: 'Proyectos (filtro)',
    description:
      'Restringe qué proyectos ve el rol dentro de Operaciones y Entrada. Sin ninguno = todos los aplicables.',
  },
  {
    id: 'admin',
    label: 'Administración',
    description: 'Solo cuenta dueña del directorio',
  },
]

const COMPROMISOS_MODULES = [
  ['lista', 'Lista de compromisos'],
  ['crear', 'Crear / Editar compromiso'],
  ['evidencias', 'Evidencias'],
  ['seguimiento', 'Seguimiento'],
  ['responsables', 'Responsables'],
] as const

function leaf(
  prefix: string,
  group: AppModuleGroupId,
  slug: string,
  label: string,
): AppModuleDef {
  return {
    id: `${prefix}.${slug}`,
    label,
    group,
    path: `/${prefix.replace(/\./g, '/')}/${slug}`,
  }
}

function operacionesGroup(moduleId: string): AppModuleGroupId {
  if (OPS_IN_CUMPLIMIENTO.has(moduleId)) return 'cumplimiento'
  if (OPS_IN_SOSTENIBILIDAD.has(moduleId)) return 'sostenibilidad'
  return 'operaciones'
}

export const APP_MODULES: AppModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'inicio', path: '/dashboard' },
  { id: 'mapa', label: 'Mapa', group: 'inicio', path: '/mapa' },
  {
    id: 'monitoreo-en-vivo',
    label: 'Monitoreo en vivo',
    group: 'inicio',
    path: '/monitoreo-en-vivo',
  },
  {
    id: 'analista',
    label: 'Briefing Semanal',
    group: 'inicio',
    path: '/analista',
  },
  {
    id: 'chatbot',
    label: 'Chatbot ambiental',
    group: 'inicio',
    path: '#chatbot',
  },
  {
    id: 'resumen-operaciones',
    label: 'Resumen de operaciones',
    group: 'operaciones',
    path: '/resumen-operaciones',
  },
  {
    id: 'resumen-cumplimiento',
    label: 'Resumen de cumplimiento',
    group: 'cumplimiento',
    path: '/resumen-cumplimiento',
  },
  {
    id: 'cumplimiento',
    label: 'Cumplimiento legal',
    group: 'cumplimiento',
    path: '/cumplimiento',
  },
  {
    id: 'capa',
    label: 'Acciones correctivas (CAPA)',
    group: 'cumplimiento',
    path: '/capa',
  },
  {
    id: 'calendario-legal',
    label: 'Calendario legal ambiental',
    group: 'cumplimiento',
    path: '/calendario-legal',
  },
  {
    id: 'indicadores',
    label: 'Indicadores ambientales',
    group: 'sostenibilidad',
    path: '/indicadores',
  },
  {
    id: 'centro-documental',
    label: 'Centro documental',
    group: 'documentos',
    path: '/centro-documental',
  },
  {
    id: 'metas',
    label: 'Metas y KPIs',
    group: 'sostenibilidad',
    path: '/metas',
  },
  {
    id: 'umbrales',
    label: 'Umbrales de monitoreo',
    group: 'sostenibilidad',
    path: '/umbrales',
  },
  {
    id: 'intensidad',
    label: 'Intensidad ambiental',
    group: 'sostenibilidad',
    path: '/intensidad',
  },
  {
    id: 'circularidad',
    label: 'Circularidad',
    group: 'sostenibilidad',
    path: '/circularidad',
  },
  {
    id: 'expedientes',
    label: 'Expedientes',
    group: 'documentos',
    path: '/expedientes',
  },
  {
    id: 'exportes',
    label: 'Exportes',
    group: 'documentos',
    path: '/exportes',
  },
  {
    id: 'administracion',
    label: 'Administración',
    group: 'admin',
    path: '/administracion',
  },
  { id: 'perfil', label: 'Perfil', group: 'admin', path: '/perfil' },
  ...COMPROMISOS_MODULES.map(([slug, label]) =>
    leaf('compromisos-ambientales', 'cumplimiento', slug, label),
  ),
  ...OPERATIONAL_MODULES.filter((m) => m.operaciones).map((m) => ({
    id: `operaciones.${m.id}`,
    label: m.label,
    group: operacionesGroup(m.id),
    path: `/operaciones/${m.id}`,
  })),
  ...OPERATIONAL_MODULES.filter((m) => m.entrada).map((m) => ({
    id: `entrada-datos.${m.id}`,
    label: m.label,
    group: 'entrada-datos' as const,
    path: `/entrada-datos/${m.id}`,
  })),
  ...PROJECT_SCOPES.map((p) => ({
    id: projectScopeModuleId(p.id),
    label: p.label,
    group: 'proyectos' as const,
    path: `#proyecto/${p.id}`,
  })),
  {
    id: 'usuarios',
    label: 'Usuarios y roles',
    group: 'admin',
    path: '/usuarios',
  },
  {
    id: 'accesos',
    label: 'Accesos por rol',
    group: 'admin',
    path: '/accesos',
  },
  {
    id: 'estructura-tecnica',
    label: 'Estructura Técnica',
    group: 'admin',
    path: '/estructura-tecnica',
  },
  {
    id: 'biblioteca',
    label: 'Biblioteca',
    group: 'admin',
    path: '/biblioteca',
  },
]

export const APP_MODULE_IDS = APP_MODULES.map((m) => m.id)

export const ASSIGNABLE_MODULES = APP_MODULES.filter((m) => m.group !== 'admin')

/**
 * Landings de sección: accesibles si el rol tiene el hub
 * o cualquiera de los módulos relacionados.
 */
export const SECTION_HUB_ACCESS: Record<string, string[]> = {
  'resumen-operaciones': OPERATIONAL_MODULES.filter(
    (m) =>
      m.operaciones &&
      !OPS_IN_CUMPLIMIENTO.has(m.id) &&
      !OPS_IN_SOSTENIBILIDAD.has(m.id),
  ).map((m) => `operaciones.${m.id}`),
  'resumen-cumplimiento': [
    'cumplimiento',
    'capa',
    'calendario-legal',
    'compromisos-ambientales.lista',
    'compromisos-ambientales.crear',
    'compromisos-ambientales.evidencias',
    'compromisos-ambientales.seguimiento',
    'compromisos-ambientales.responsables',
    'operaciones.licencias-ambientales',
    'operaciones.gestion-de-tramites',
  ],
  'calendario-legal': ['cumplimiento', 'capa', 'resumen-cumplimiento'],
  indicadores: [
    'metas',
    'umbrales',
    'intensidad',
    'circularidad',
    'operaciones.huella-de-carbono',
  ],
  'centro-documental': ['expedientes', 'exportes', 'biblioteca'],
  administracion: ['perfil', 'usuarios', 'accesos', 'estructura-tecnica'],
}

/** ¿El hub se habilita por acceso a un módulo hijo? */
export function hubUnlockedByRelated(
  hubId: string,
  hasModule: (id: string) => boolean,
): boolean {
  const related = SECTION_HUB_ACCESS[hubId]
  if (!related) return false
  return related.some(
    (id) =>
      ALWAYS_ALLOWED_MODULES.has(id) ||
      hasModule(id) ||
      resolvesToModuleAccess(id, hasModule),
  )
}

/** Prefijos útiles para armar sets de acceso por rol. */
export function moduleIdsByPrefix(prefix: string): string[] {
  return ASSIGNABLE_MODULES.filter((m) => m.id.startsWith(prefix)).map(
    (m) => m.id,
  )
}

export function firstAllowedPath(
  canAccessModule: (id: string) => boolean,
): string {
  const preferred = [
    'dashboard',
    'mapa',
    'monitoreo-en-vivo',
    'analista',
    'resumen-operaciones',
    'resumen-cumplimiento',
    'cumplimiento',
    'capa',
    'compromisos-ambientales.lista',
    'calendario-legal',
    'indicadores',
    'metas',
    'umbrales',
    'intensidad',
    'circularidad',
    'centro-documental',
    'expedientes',
    'exportes',
    'administracion',
    ...ASSIGNABLE_MODULES.filter((m) => m.id.startsWith('operaciones.')).map(
      (m) => m.id,
    ),
    ...ASSIGNABLE_MODULES.filter((m) =>
      m.id.startsWith('entrada-datos.'),
    ).map((m) => m.id),
    'perfil',
  ]
  for (const id of preferred) {
    if (!canAccessModule(id)) continue
    const mod = getModuleById(id)
    if (mod && mod.id !== 'chatbot' && !mod.id.startsWith('proyecto.')) {
      return mod.path
    }
  }
  return '/perfil'
}

const BY_ID = new Map(APP_MODULES.map((m) => [m.id, m]))
const BY_PATH = new Map(APP_MODULES.map((m) => [m.path, m]))

export function getModuleById(id: string): AppModuleDef | undefined {
  return BY_ID.get(id)
}

export function getModuleByPath(pathname: string): AppModuleDef | undefined {
  const clean = pathname.replace(/\/+$/, '') || '/'
  const exact = BY_PATH.get(clean)
  if (exact) return exact

  // /compromisos-ambientales/editar/:id → mismo módulo que crear
  if (/^\/compromisos-ambientales\/editar\/[^/]+$/.test(clean)) {
    return BY_ID.get('compromisos-ambientales.crear')
  }

  // Informes de inspección
  if (
    /^\/(operaciones|entrada-datos)\/inspeccion-ambiental\/informe\/[^/]+$/.test(
      clean,
    ) ||
    /^\/(operaciones|entrada-datos)\/(agroprogreso|planta-alicon|descarga-barcos)\/inspeccion-ambiental\/informe\/[^/]+$/.test(
      clean,
    )
  ) {
    const section = clean.startsWith('/operaciones')
      ? 'operaciones'
      : 'entrada-datos'
    return BY_ID.get(`${section}.inspeccion-ambiental`)
  }

  // Legacy: /operaciones|entrada-datos/:scope/:moduleId
  const legacy = clean.match(
    /^\/(operaciones|entrada-datos)\/(agroprogreso|planta-alicon|descarga-barcos)\/([^/]+)(?:\/.*)?$/,
  )
  if (legacy) {
    return BY_ID.get(`${legacy[1]}.${legacy[3]}`)
  }

  // Nuevo: /operaciones|entrada-datos/:moduleId
  const flat = clean.match(/^\/(operaciones|entrada-datos)\/([^/]+)$/)
  if (flat) {
    return BY_ID.get(`${flat[1]}.${flat[2]}`)
  }

  return undefined
}

/**
 * Normaliza IDs legacy o flat a los IDs actuales del catálogo.
 * Devuelve el set de IDs flat + proyecto.* derivados.
 */
export function normalizeRoleModuleIds(ids: string[]): string[] {
  const out = new Set<string>()
  for (const id of ids) {
    if (BY_ID.has(id)) {
      out.add(id)
      continue
    }
    const { flatId, projectScope } = expandLegacyModuleId(id)
    if (flatId && BY_ID.has(flatId)) out.add(flatId)
    if (projectScope) out.add(projectScopeModuleId(projectScope))
  }
  return [...out]
}

/**
 * ¿El rol puede ver este módulo funcional?
 * Acepta ID flat o legacy con scope.
 */
export function resolvesToModuleAccess(
  moduleId: string,
  hasModule: (id: string) => boolean,
): boolean {
  if (hasModule(moduleId)) return true
  const { flatId } = expandLegacyModuleId(moduleId)
  if (flatId && hasModule(flatId)) return true
  // Si preguntan por flat y el rol aún tiene legacy
  const m = moduleId.match(/^(operaciones|entrada-datos)\.(.+)$/)
  if (m && !isProjectScope(m[2])) {
    return PROJECT_SCOPES.some((p) =>
      hasModule(`${m[1]}.${p.id}.${m[2]}`),
    )
  }
  return false
}

/** Proyectos permitidos para un rol (vacío = sin restricción). */
export function allowedProjectScopes(
  hasModule: (id: string) => boolean,
): ProjectScope[] {
  return PROJECT_SCOPES.map((p) => p.id).filter((id) =>
    hasModule(projectScopeModuleId(id)),
  )
}

export function modulesByGroup(groupId: AppModuleGroupId): AppModuleDef[] {
  return APP_MODULES.filter((m) => m.group === groupId)
}

/** Módulos que siempre quedan disponibles para cualquier sesión válida. */
export const ALWAYS_ALLOWED_MODULES = new Set(['perfil'])

/** Módulos exclusivos de la cuenta dueña del directorio. */
export const DIRECTORY_ADMIN_MODULES = new Set([
  'usuarios',
  'accesos',
  'estructura-tecnica',
  'biblioteca',
])
