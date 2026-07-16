/**
 * Catálogo estable de módulos/páginas para RBAC por rol.
 * Los ids se guardan en app_role_modules.module_id
 */

export type AppModuleGroupId =
  | 'core'
  | 'operaciones.agroprogreso'
  | 'operaciones.planta-alicon'
  | 'entrada-datos.agroprogreso'
  | 'entrada-datos.planta-alicon'
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

export const APP_MODULE_GROUPS: AppModuleGroup[] = [
  {
    id: 'core',
    label: 'General',
    description: 'Páginas principales de la aplicación',
  },
  {
    id: 'operaciones.agroprogreso',
    label: 'Operaciones · Agroprogreso',
    description: 'Reportes y analítica Agroprogreso',
  },
  {
    id: 'operaciones.planta-alicon',
    label: 'Operaciones · Planta Alicón',
    description: 'Reportes y analítica Alicón',
  },
  {
    id: 'entrada-datos.agroprogreso',
    label: 'Entrada de datos · Agroprogreso',
    description: 'Formularios de captura Agroprogreso',
  },
  {
    id: 'entrada-datos.planta-alicon',
    label: 'Entrada de datos · Planta Alicón',
    description: 'Formularios de captura Alicón',
  },
  {
    id: 'admin',
    label: 'Administración',
    description: 'Solo cuenta dueña del directorio',
  },
]

const AGRO_MODULES = [
  ['gestion-de-residuos', 'Gestión de residuos'],
  ['consumo-de-agua', 'Consumo de agua'],
  ['inspeccion-ambiental', 'Inspección ambiental'],
  ['incidentes-ambientales', 'Incidentes ambientales'],
  ['monitoreo-ambiental', 'Monitoreo ambiental'],
  ['capacitaciones', 'Capacitaciones'],
  ['licencias-ambientales', 'Licencias ambientales'],
  ['compostaje', 'Compostaje'],
  ['nda-casco-verde', 'NDA Casco Verde'],
  ['nda-general', 'NDA General'],
  ['gestion-de-tramites', 'Gestión de trámites'],
] as const

const ALICON_OPS = [
  ['inspeccion-ambiental', 'Inspección ambiental'],
  ['incidentes-ambientales', 'Incidentes ambientales'],
  ['monitoreo-ambiental', 'Monitoreo ambiental'],
  ['huella-de-carbono', 'Huella de carbono'],
] as const

const ALICON_ENTRY = [
  ['incidentes-ambientales', 'Incidentes ambientales'],
  ['inspeccion-ambiental', 'Inspección ambiental'],
  ['monitoreo-ambiental', 'Monitoreo ambiental'],
  ['huella-de-carbono', 'Huella de carbono'],
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

export const APP_MODULES: AppModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'core', path: '/dashboard' },
  { id: 'mapa', label: 'Mapa', group: 'core', path: '/mapa' },
  {
    id: 'monitoreo-en-vivo',
    label: 'Monitoreo en vivo',
    group: 'core',
    path: '/monitoreo-en-vivo',
  },
  { id: 'perfil', label: 'Perfil', group: 'core', path: '/perfil' },
  {
    id: 'chatbot',
    label: 'Chatbot ambiental',
    group: 'core',
    path: '#chatbot',
  },
  ...AGRO_MODULES.map(([slug, label]) =>
    leaf('operaciones.agroprogreso', 'operaciones.agroprogreso', slug, label),
  ),
  ...ALICON_OPS.map(([slug, label]) =>
    leaf('operaciones.planta-alicon', 'operaciones.planta-alicon', slug, label),
  ),
  ...AGRO_MODULES.map(([slug, label]) =>
    leaf('entrada-datos.agroprogreso', 'entrada-datos.agroprogreso', slug, label),
  ),
  ...ALICON_ENTRY.map(([slug, label]) =>
    leaf(
      'entrada-datos.planta-alicon',
      'entrada-datos.planta-alicon',
      slug,
      label,
    ),
  ),
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
    id: 'biblioteca',
    label: 'Biblioteca',
    group: 'admin',
    path: '/biblioteca',
  },
]

export const APP_MODULE_IDS = APP_MODULES.map((m) => m.id)

export const ASSIGNABLE_MODULES = APP_MODULES.filter((m) => m.group !== 'admin')

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
    if (mod && mod.id !== 'chatbot') return mod.path
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

  // Prefijos dinámicos /operaciones/:scope/:moduleId y /entrada-datos/...
  const ops = clean.match(/^\/(operaciones|entrada-datos)\/([^/]+)\/([^/]+)$/)
  if (ops) {
    const id = `${ops[1]}.${ops[2]}.${ops[3]}`
    return BY_ID.get(id)
  }
  return undefined
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
  'biblioteca',
])
