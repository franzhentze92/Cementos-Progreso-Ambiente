/**
 * Usuarios y roles de la app.
 * Catálogo en Supabase (app_users / app_roles).
 * Login simulado (sin Supabase Auth).
 *
 * Solo la cuenta DIRECTORY_ADMIN_USERNAME puede gestionar el directorio.
 */

/** Única cuenta con acceso a /usuarios y /accesos. */
export const DIRECTORY_ADMIN_USERNAME = 'lpaniagua@cempro.com'

export const APP_ROLE_CODES = [
  'Admin',
  'Gerencia',
  'Gestor_Datos_Alicon',
  'Gestor_Datos_Agroprogreso',
] as const

export type AppRoleCode = (typeof APP_ROLE_CODES)[number] | string

export type AppPermission =
  | '*'
  | 'dashboard:read'
  | 'reportes:read'
  | 'entrada:write'
  | 'mapa:read'
  | 'chatbot:use'
  | 'usuarios:manage'
  | (string & {})

export type AppRole = {
  code: string
  label: string
  description: string
  sortOrder: number
  permissions: AppPermission[]
}

export type AppUser = {
  id: string
  username: string
  name: string
  email: string
  role: string
  department: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type AppUserWithPassword = AppUser & {
  password: string
}

/** @deprecated Prefer AppUser. */
export type User = AppUserWithPassword

export type AppUserInput = {
  username: string
  password?: string
  name: string
  email: string
  role: string
  department: string
  active?: boolean
}

export type AppRoleInput = {
  code: string
  label: string
  description: string
  sortOrder?: number
  permissions: AppPermission[]
}

export function isKnownRoleCode(
  value: string,
): value is (typeof APP_ROLE_CODES)[number] {
  return (APP_ROLE_CODES as readonly string[]).includes(value)
}

/** @deprecated use isKnownRoleCode */
export function isAppRoleCode(value: string): boolean {
  return value.trim().length > 0
}

export function hasPermission(
  rolePermissions: readonly string[] | null | undefined,
  permission: AppPermission,
): boolean {
  if (!rolePermissions?.length) return false
  if (rolePermissions.includes('*')) return true
  return rolePermissions.includes(permission)
}

/** True solo para la cuenta dueña del directorio de usuarios. */
export function canManageDirectory(
  user: { username?: string | null } | null | undefined,
): boolean {
  if (!user?.username) return false
  return (
    user.username.trim().toLowerCase() ===
    DIRECTORY_ADMIN_USERNAME.toLowerCase()
  )
}

/** Rol Admin (acceso amplio en la app; /usuarios sigue siendo solo la cuenta dueña). */
export function canManageUsers(role: string): boolean {
  return role === 'Admin' || role === 'Administrador'
}

export const ROLE_FALLBACK: Record<
  string,
  Pick<AppRole, 'label' | 'description' | 'permissions'>
> = {
  Admin: {
    label: 'Admin',
    description:
      'Acceso total a dashboard, reportes, entrada de datos, mapa y chatbot.',
    permissions: ['*'],
  },
  Gerencia: {
    label: 'Gerencia',
    description:
      'Solo dashboard, reportes (operaciones), mapa, perfil y chatbot. Sin entrada de datos.',
    permissions: [
      'dashboard:read',
      'reportes:read',
      'mapa:read',
      'chatbot:use',
    ],
  },
  Gestor_Datos_Alicon: {
    label: 'Gestor de Datos Alicón',
    description:
      'Solo entrada de datos de Planta Alicón y perfil. Sin reportes, dashboard, mapa ni chatbot.',
    permissions: ['entrada:write'],
  },
  Gestor_Datos_Agroprogreso: {
    label: 'Gestor de Datos Agroprogreso',
    description:
      'Solo entrada de datos de Agroprogreso y perfil. Sin reportes, dashboard, mapa ni chatbot.',
    permissions: ['entrada:write'],
  },
}

export const ALL_PERMISSIONS: AppPermission[] = [
  '*',
  'dashboard:read',
  'reportes:read',
  'entrada:write',
  'mapa:read',
  'chatbot:use',
  'usuarios:manage',
]

export const PERMISSION_LABELS: Record<string, string> = {
  '*': 'Acceso total',
  'dashboard:read': 'Ver dashboard',
  'reportes:read': 'Ver reportes',
  'entrada:write': 'Capturar datos',
  'mapa:read': 'Ver mapa',
  'chatbot:use': 'Usar chatbot',
  'usuarios:manage': 'Gestionar usuarios',
}

export function normalizeRoleCode(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-áéíóúÁÉÍÓÚñÑ]/g, '')
}
