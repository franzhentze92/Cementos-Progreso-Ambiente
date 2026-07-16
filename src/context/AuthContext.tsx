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
  getModuleByPath,
} from '../data/appModules'
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
      setModuleIds(ids)
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
        setModuleIds(await loadRoleModuleIds(current.role))
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
      if (isDirectoryAdmin) return true
      return moduleSet.has(moduleId)
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
      return canAccessModule(mod.id)
    },
    [user, canAccessModule],
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
