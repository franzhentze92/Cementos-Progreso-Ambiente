/**
 * Árbol del side menu: 6 bloques por tarea mental del usuario.
 * Las rutas/ids RBAC se mantienen; aquí solo se reorganiza la navegación.
 */

import {
  Activity,
  Brain,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Files,
  Droplets,
  FileBadge,
  FilePlus2,
  FolderKanban,
  FolderOpen,
  Gauge,
  GraduationCap,
  HardHat,
  Handshake,
  History,
  KeyRound,
  LayoutDashboard,
  Leaf,
  Library,
  MapPinned,
  Network,
  Package,
  Radio,
  Recycle,
  Scale,
  Settings2,
  ShieldAlert,
  Sprout,
  Target,
  Thermometer,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { getOperationalModule } from './operationalModules'

export type NavLeaf = {
  kind: 'leaf'
  to: string
  label: string
  title?: string
  icon: LucideIcon
  /** Solo cuenta dueña del directorio */
  directoryAdminOnly?: boolean
  /** Siempre visible (p. ej. Perfil) */
  alwaysShow?: boolean
}

export type NavBranch = {
  kind: 'branch'
  id: string
  label: string
  title?: string
  icon: LucideIcon
  matchPrefixes: string[]
  children: NavLeaf[]
}

export type NavNode = NavLeaf | NavBranch

export type NavSection = {
  id: string
  label: string
  matchPrefixes: string[]
  items: NavNode[]
}

function opLeaf(
  moduleId: string,
  label?: string,
  icon?: LucideIcon,
): NavLeaf {
  const mod = getOperationalModule(moduleId)
  return {
    kind: 'leaf',
    to: `/operaciones/${moduleId}`,
    label: label ?? mod?.label ?? moduleId,
    icon: icon ?? ClipboardList,
  }
}

function entradaLeaf(moduleId: string, icon?: LucideIcon): NavLeaf {
  const mod = getOperationalModule(moduleId)
  return {
    kind: 'leaf',
    to: `/entrada-datos/${moduleId}`,
    label: mod?.label ?? moduleId,
    icon: icon ?? ClipboardList,
  }
}

const ENTRADA_MODULE_ORDER = [
  'monitoreo-ambiental',
  'inspeccion-ambiental',
  'incidentes-ambientales',
  'gestion-de-residuos',
  'consumo-de-agua',
  'compostaje',
  'capacitaciones',
  'licencias-ambientales',
  'nda-casco-verde',
  'nda-general',
  'gestion-de-tramites',
  'huella-de-carbono',
] as const

const ENTRADA_ICONS: Record<string, LucideIcon> = {
  'gestion-de-residuos': Trash2,
  'consumo-de-agua': Droplets,
  'inspeccion-ambiental': ClipboardList,
  'incidentes-ambientales': ShieldAlert,
  'monitoreo-ambiental': Thermometer,
  capacitaciones: GraduationCap,
  'licencias-ambientales': FileBadge,
  compostaje: Recycle,
  'nda-casco-verde': HardHat,
  'nda-general': Gauge,
  'gestion-de-tramites': FolderKanban,
  'huella-de-carbono': Leaf,
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'inicio',
    label: 'Inicio',
    matchPrefixes: [
      '/dashboard',
      '/mapa',
      '/monitoreo-en-vivo',
      '/analista',
    ],
    items: [
      {
        kind: 'leaf',
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        kind: 'leaf',
        to: '/mapa',
        label: 'Mapa',
        icon: MapPinned,
      },
      {
        kind: 'leaf',
        to: '/monitoreo-en-vivo',
        label: 'Monitoreo en vivo',
        title: 'Monitoreo en vivo',
        icon: Radio,
      },
      {
        kind: 'leaf',
        to: '/analista',
        label: 'Briefing Semanal',
        title: 'Briefing Semanal',
        icon: Brain,
      },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    matchPrefixes: [
      '/resumen-operaciones',
      '/operaciones/monitoreo-ambiental',
      '/operaciones/inspeccion-ambiental',
      '/operaciones/incidentes-ambientales',
      '/operaciones/gestion-de-residuos',
      '/operaciones/consumo-de-agua',
      '/operaciones/compostaje',
      '/operaciones/nda-casco-verde',
      '/operaciones/nda-general',
      '/operaciones/capacitaciones',
    ],
    items: [
      {
        kind: 'leaf',
        to: '/resumen-operaciones',
        label: 'Resumen de operaciones',
        icon: Sprout,
      },
      opLeaf('monitoreo-ambiental', undefined, Thermometer),
      opLeaf('inspeccion-ambiental', undefined, ClipboardList),
      opLeaf('incidentes-ambientales', undefined, ShieldAlert),
      opLeaf('gestion-de-residuos', undefined, Trash2),
      opLeaf('consumo-de-agua', undefined, Droplets),
      opLeaf('compostaje', undefined, Recycle),
      opLeaf('nda-casco-verde', undefined, HardHat),
      opLeaf('nda-general', undefined, Gauge),
      opLeaf('capacitaciones', undefined, GraduationCap),
    ],
  },
  {
    id: 'cumplimiento',
    label: 'Cumplimiento',
    matchPrefixes: [
      '/resumen-cumplimiento',
      '/cumplimiento',
      '/capa',
      '/compromisos-ambientales',
      '/calendario-legal',
      '/operaciones/licencias-ambientales',
      '/operaciones/gestion-de-tramites',
    ],
    items: [
      {
        kind: 'leaf',
        to: '/resumen-cumplimiento',
        label: 'Resumen de cumplimiento',
        icon: Scale,
      },
      {
        kind: 'branch',
        id: 'compromisos-ambientales',
        label: 'Compromisos ambientales',
        icon: Handshake,
        matchPrefixes: ['/compromisos-ambientales'],
        children: [
          {
            kind: 'leaf',
            to: '/compromisos-ambientales/lista',
            label: 'Lista de compromisos',
            icon: ClipboardList,
          },
          {
            kind: 'leaf',
            to: '/compromisos-ambientales/crear',
            label: 'Crear / Editar',
            icon: FilePlus2,
          },
          {
            kind: 'leaf',
            to: '/compromisos-ambientales/evidencias',
            label: 'Evidencias',
            icon: FolderOpen,
          },
          {
            kind: 'leaf',
            to: '/compromisos-ambientales/seguimiento',
            label: 'Seguimiento',
            icon: History,
          },
          {
            kind: 'leaf',
            to: '/compromisos-ambientales/responsables',
            label: 'Responsables',
            icon: Users,
          },
        ],
      },
      {
        kind: 'leaf',
        to: '/capa',
        label: 'Acciones correctivas (CAPA)',
        title: 'Acciones correctivas (CAPA)',
        icon: ClipboardCheck,
      },
      opLeaf('licencias-ambientales', undefined, FileBadge),
      opLeaf('gestion-de-tramites', undefined, FolderKanban),
      {
        kind: 'leaf',
        to: '/cumplimiento',
        label: 'Cumplimiento legal',
        title: 'Cumplimiento legal',
        icon: Scale,
      },
      {
        kind: 'leaf',
        to: '/calendario-legal',
        label: 'Calendario legal ambiental',
        icon: CalendarDays,
      },
    ],
  },
  {
    id: 'sostenibilidad',
    label: 'Sostenibilidad',
    matchPrefixes: [
      '/indicadores',
      '/metas',
      '/umbrales',
      '/intensidad',
      '/circularidad',
      '/operaciones/huella-de-carbono',
    ],
    items: [
      {
        kind: 'leaf',
        to: '/indicadores',
        label: 'Indicadores ambientales',
        icon: Sprout,
      },
      {
        kind: 'leaf',
        to: '/metas',
        label: 'Metas',
        title: 'Metas y KPIs',
        icon: Target,
      },
      {
        kind: 'leaf',
        to: '/umbrales',
        label: 'Umbrales',
        title: 'Umbrales de monitoreo',
        icon: Gauge,
      },
      {
        kind: 'leaf',
        to: '/intensidad',
        label: 'Intensidad ambiental',
        title: 'Intensidad ambiental',
        icon: Activity,
      },
      {
        kind: 'leaf',
        to: '/circularidad',
        label: 'Circularidad',
        icon: Recycle,
      },
      opLeaf('huella-de-carbono', undefined, Leaf),
    ],
  },
  {
    id: 'documentos',
    label: 'Documentos y Reportes',
    matchPrefixes: [
      '/centro-documental',
      '/expedientes',
      '/biblioteca',
      '/exportes',
    ],
    items: [
      {
        kind: 'leaf',
        to: '/centro-documental',
        label: 'Centro documental',
        icon: Files,
      },
      {
        kind: 'leaf',
        to: '/expedientes',
        label: 'Expedientes',
        title: 'Expedientes ambientales',
        icon: FolderOpen,
      },
      {
        kind: 'leaf',
        to: '/biblioteca',
        label: 'Biblioteca',
        icon: Library,
        directoryAdminOnly: true,
      },
      {
        kind: 'leaf',
        to: '/exportes',
        label: 'Exportes',
        icon: Package,
      },
    ],
  },
  {
    id: 'captura-datos',
    label: 'Captura de datos',
    matchPrefixes: ['/entrada-datos'],
    items: ENTRADA_MODULE_ORDER.map((id) =>
      entradaLeaf(id, ENTRADA_ICONS[id]),
    ),
  },
  {
    id: 'administracion',
    label: 'Administración',
    matchPrefixes: [
      '/administracion',
      '/usuarios',
      '/accesos',
      '/estructura-tecnica',
      '/perfil',
    ],
    items: [
      {
        kind: 'leaf',
        to: '/administracion',
        label: 'Resumen',
        title: 'Administración',
        icon: Settings2,
      },
      {
        kind: 'leaf',
        to: '/usuarios',
        label: 'Usuarios',
        title: 'Usuarios y roles',
        icon: Users,
        directoryAdminOnly: true,
      },
      {
        kind: 'leaf',
        to: '/accesos',
        label: 'Accesos',
        title: 'Accesos por rol',
        icon: KeyRound,
        directoryAdminOnly: true,
      },
      {
        kind: 'leaf',
        to: '/estructura-tecnica',
        label: 'Estructura Técnica',
        title: 'Mapa de proyectos y módulos',
        icon: Network,
        directoryAdminOnly: true,
      },
      {
        kind: 'leaf',
        to: '/perfil',
        label: 'Perfil',
        icon: UserRound,
        alwaysShow: true,
      },
    ],
  },
]

export function pathMatchesPrefixes(
  path: string,
  prefixes: string[],
): boolean {
  return prefixes.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p),
  )
}
