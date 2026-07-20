/**
 * Catálogo módulo-primero para Operaciones y Entrada de Datos.
 * Los proyectos (Agroprogreso, Alicón, Descarga Barcos) son filtros,
 * no ramas del menú.
 */

export type ProjectScope = 'agroprogreso' | 'planta-alicon' | 'descarga-barcos'

/** Sentinel URL/filtro: todos los proyectos accesibles del módulo. */
export const ALL_PROJECTS = 'todos' as const
export type ProjectScopeSelection = ProjectScope | typeof ALL_PROJECTS

export type OperationalSection = 'operaciones' | 'entrada-datos'

/** Módulos de Operaciones que defaultan a “Todos los proyectos”. */
export const MODULES_DEFAULT_ALL_PROJECTS = new Set([
  'inspeccion-ambiental',
  'incidentes-ambientales',
  'monitoreo-ambiental',
])

export type OperationalModuleDef = {
  id: string
  label: string
  /** Proyectos donde aplica este módulo */
  scopes: ProjectScope[]
  operaciones: boolean
  entrada: boolean
  /**
   * Si true, no aparece como ítem propio del menú (sigue siendo ruta válida).
   * Ej.: NDA Casco Verde vive dentro de NDA General.
   */
  navHidden?: boolean
}

export const PROJECT_SCOPES: { id: ProjectScope; label: string }[] = [
  { id: 'agroprogreso', label: 'Agroprogreso' },
  { id: 'planta-alicon', label: 'Planta Alicón' },
  { id: 'descarga-barcos', label: 'Descarga Barcos' },
]

export const PROJECT_SCOPE_IDS = PROJECT_SCOPES.map((p) => p.id)

export const PROJECT_SCOPE_LABELS: Record<ProjectScope, string> = {
  agroprogreso: 'Agroprogreso',
  'planta-alicon': 'Planta Alicón',
  'descarga-barcos': 'Descarga Barcos',
}

export function supportsAllProjectsDefault(moduleId: string): boolean {
  return MODULES_DEFAULT_ALL_PROJECTS.has(moduleId)
}

export function isProjectScope(value: string): value is ProjectScope {
  return PROJECT_SCOPE_IDS.includes(value as ProjectScope)
}

export function isProjectScopeSelection(
  value: string,
): value is ProjectScopeSelection {
  return value === ALL_PROJECTS || isProjectScope(value)
}

export function resolveScopesForSelection(
  selection: ProjectScopeSelection | null,
  available: ProjectScope[],
): ProjectScope[] {
  if (!selection || selection === ALL_PROJECTS) return [...available]
  return available.includes(selection) ? [selection] : [...available]
}

export function scopesLabel(scopes: ProjectScope[]): string {
  if (scopes.length === 0) return 'Sin proyecto'
  if (scopes.length > 1) return 'Todos los proyectos'
  return PROJECT_SCOPE_LABELS[scopes[0]]
}

/** IDs RBAC para restringir qué proyectos ve un rol dentro de un módulo. */
export function projectScopeModuleId(scope: ProjectScope): string {
  return `proyecto.${scope}`
}

export const OPERATIONAL_MODULES: OperationalModuleDef[] = [
  {
    id: 'gestion-de-residuos',
    label: 'Gestión de residuos',
    scopes: ['agroprogreso'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'consumo-de-agua',
    label: 'Consumo de agua',
    scopes: ['agroprogreso'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'inspeccion-ambiental',
    label: 'Inspección ambiental',
    scopes: ['agroprogreso', 'planta-alicon', 'descarga-barcos'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'incidentes-ambientales',
    label: 'Incidentes ambientales',
    scopes: ['agroprogreso', 'planta-alicon'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'monitoreo-ambiental',
    label: 'Monitoreos de cumplimiento / control',
    scopes: ['agroprogreso', 'planta-alicon'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'capacitaciones',
    label: 'Capacitaciones',
    scopes: ['agroprogreso'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'licencias-ambientales',
    label: 'Licencias ambientales',
    scopes: ['agroprogreso'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'compostaje',
    label: 'Compostaje',
    scopes: ['agroprogreso'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'nda-casco-verde',
    label: 'Inspecciones casco verde',
    scopes: ['agroprogreso'],
    operaciones: true,
    entrada: true,
    /** Acceso desde el botón en NDA General; no es ítem de menú aparte. */
    navHidden: true,
  },
  {
    id: 'nda-general',
    label: 'NDA General',
    scopes: ['agroprogreso'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'gestion-de-tramites',
    label: 'Gestión de trámites',
    scopes: ['agroprogreso'],
    operaciones: true,
    entrada: true,
  },
  {
    id: 'huella-de-carbono',
    label: 'Huella de carbono',
    scopes: ['planta-alicon'],
    operaciones: true,
    entrada: true,
  },
]

const BY_ID = new Map(OPERATIONAL_MODULES.map((m) => [m.id, m]))

export function getOperationalModule(
  moduleId: string,
): OperationalModuleDef | undefined {
  return BY_ID.get(moduleId)
}

export function modulesForSection(
  section: OperationalSection,
): OperationalModuleDef[] {
  return OPERATIONAL_MODULES.filter((m) =>
    section === 'operaciones' ? m.operaciones : m.entrada,
  )
}

export function pathForModule(
  section: OperationalSection,
  moduleId: string,
  scope?: ProjectScope | typeof ALL_PROJECTS,
): string {
  const base = `/${section}/${moduleId}`
  return scope ? `${base}?proyecto=${scope}` : base
}

/**
 * Convierte IDs legacy `operaciones.agroprogreso.X` → flat + proyecto.
 * Útil al migrar accesos y al resolver compatibilidad.
 */
export function expandLegacyModuleId(moduleId: string): {
  flatId?: string
  projectScope?: ProjectScope
} {
  const m = moduleId.match(
    /^(operaciones|entrada-datos)\.(agroprogreso|planta-alicon|descarga-barcos)\.(.+)$/,
  )
  if (!m) return {}
  return {
    flatId: `${m[1]}.${m[3]}`,
    projectScope: m[2] as ProjectScope,
  }
}
