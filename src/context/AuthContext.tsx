import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ALWAYS_ALLOWED_MODULES,
  DIRECTORY_ADMIN_MODULES,
  allowedProjectScopes,
  getModuleByPath,
  hubUnlockedByRelated,
  normalizeRoleModuleIds,
  resolvesToModuleAccess,
  SECTION_HUB_ACCESS,
} from '../data/appModules'
import {
  getOperationalModule,
  type ProjectScope,
} from '../data/operationalModules'
import {
  canManageDirectory,
  canManageUsers,
  hasPermission,
  type AppPermission,
  type AppUser,
} from '../data/users'
import { authenticateAppUser, loadAppUserById } from '../lib/usersApi'
import { loadRoleModuleIds } from '../lib/roleModulesApi'

export type AuthUser = AppUser

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  moduleIds: string[]
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
  can: (permission: AppPermission) => boolean
  canAccessModule: (moduleId: string) => boolean
  canAccessPath: (pathname: string) => boolean
  /** Proyectos visibles dentro de un módulo operativo (vacío = ninguno). */
  accessibleScopesFor: (
    section: 'operaciones' | 'entrada-datos',
    moduleId: string,
  ) => ProjectScope[]
  isAdmin: boolean
  isDirectoryAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'cpa-auth-user'

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (!parsed?.id || !parsed?.username) return null
    return parsed
  } catch {
    return null
  }
}

function persistUser(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser())
  const [moduleIds, setModuleIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const applyUser = useCallback(async (next: AuthUser | null) => {
    setUser(next)
    persistUser(next)
    if (!next) {
      setModuleIds([])
      return
    }
    try {
      const ids = await loadRoleModuleIds(next.role)
      setModuleIds(normalizeRoleModuleIds(ids))
    } catch {
      // Sin módulos en DB: no bloquear sesión; menú vacío salvo perfil/admin
      setModuleIds([])
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const current = loadStoredUser()
    if (!current?.id) {
      await applyUser(null)
      setLoading(false)
      return
    }
    try {
      const fresh = await loadAppUserById(current.id)
      if (!fresh || !fresh.active) {
        await applyUser(null)
      } else {
        await applyUser(fresh)
      }
    } catch {
      setUser(current)
      try {
        setModuleIds(
          normalizeRoleModuleIds(await loadRoleModuleIds(current.role)),
        )
      } catch {
        setModuleIds([])
      }
    } finally {
      setLoading(false)
    }
  }, [applyUser])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const login = useCallback(
    async (username: string, password: string) => {
      const found = await authenticateAppUser(username, password)
      if (!found) return false
      await applyUser(found)
      return true
    },
    [applyUser],
  )

  const logout = useCallback(() => {
    void applyUser(null)
  }, [applyUser])

  const isDirectoryAdmin = canManageDirectory(user)
  const isAdmin = canManageUsers(user?.role ?? '')

  const moduleSet = useMemo(() => new Set(moduleIds), [moduleIds])

  const canAccessModule = useCallback(
    (moduleId: string) => {
      if (!user) return false
      if (ALWAYS_ALLOWED_MODULES.has(moduleId)) return true
      if (DIRECTORY_ADMIN_MODULES.has(moduleId)) {
        return isDirectoryAdmin
      }
      // Admin de aplicación: acceso completo a módulos asignables
      if (
        user.role === 'Admin' ||
        user.role === 'Administrador' ||
        isDirectoryAdmin
      ) {
        return true
      }
      const has = (id: string) => moduleSet.has(id)
      if (moduleSet.has(moduleId)) return true
      if (resolvesToModuleAccess(moduleId, has)) return true
      // Landings de sección: visibles si hay acceso a algún módulo del bloque
      if (moduleId in SECTION_HUB_ACCESS) {
        return hubUnlockedByRelated(moduleId, has)
      }
      return false
    },
    [user, moduleSet, isDirectoryAdmin],
  )

  const canAccessPath = useCallback(
    (pathname: string) => {
      const mod = getModuleByPath(pathname)
      if (!mod) {
        // Rutas legacy / desconocidas: permitir solo si hay sesión
        // (ProtectedRoute ya exige login). Preferimos no bloquear redirects.
        return Boolean(user)
      }
      // proyecto.* no es una ruta navegable
      if (mod.id.startsWith('proyecto.')) return Boolean(user)
      return canAccessModule(mod.id)
    },
    [user, canAccessModule],
  )

  const accessibleScopesFor = useCallback(
    (section: 'operaciones' | 'entrada-datos', moduleId: string) => {
      const def = getOperationalModule(moduleId)
      if (!def) return []
      if (!canAccessModule(`${section}.${moduleId}`)) return []

      const applicable = def.scopes
      if (
        user?.role === 'Admin' ||
        user?.role === 'Administrador' ||
        isDirectoryAdmin
      ) {
        return [...applicable]
      }

      const restricted = allowedProjectScopes((id) => moduleSet.has(id))
      if (restricted.length === 0) return [...applicable]
      return applicable.filter((s) => restricted.includes(s))
    },
    [canAccessModule, user, isDirectoryAdmin, moduleSet],
  )

  const can = useCallback(
    (permission: AppPermission) => {
      if (!user) return false
      if (user.role === 'Admin' || user.role === 'Administrador' || isDirectoryAdmin)
        return true
      const fallback: Record<string, AppPermission[]> = {
        Admin: ['*'],
        Gerencia: [
          'dashboard:read',
          'reportes:read',
          'mapa:read',
          'chatbot:use',
        ],
        Gestor_Datos_Alicon: ['entrada:write'],
        Gestor_Datos_Agroprogreso: ['entrada:write'],
      }
      return hasPermission(fallback[user.role] ?? [], permission)
    },
    [user, isDirectoryAdmin],
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      moduleIds,
      login,
      logout,
      refreshUser,
      can,
      canAccessModule,
      canAccessPath,
      accessibleScopesFor,
      isAdmin,
      isDirectoryAdmin,
    }),
    [
      user,
      loading,
      moduleIds,
      login,
      logout,
      refreshUser,
      can,
      canAccessModule,
      canAccessPath,
      accessibleScopesFor,
      isAdmin,
      isDirectoryAdmin,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
