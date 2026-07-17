import { Navigate, useLocation } from 'react-router-dom'
import { Loader2, ShieldOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { firstAllowedPath, getModuleByPath } from '../data/appModules'

export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, canAccessPath, canAccessModule } = useAuth()
  const location = useLocation()
  const home = firstAllowedPath(canAccessModule)

  if (loading) {
    return (
      <div className="auth-boot">
        <Loader2 className="hc-spin" size={28} />
        <p>Verificando acceso…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Rutas catch-all del layout (404): no aplicar RBAC de módulo
  const mod = getModuleByPath(location.pathname)
  if (!mod) {
    return <>{children}</>
  }

  if (!canAccessPath(location.pathname)) {
    if (
      location.pathname === '/dashboard' ||
      location.pathname === '/' ||
      location.pathname === ''
    ) {
      return <Navigate to={home} replace />
    }
    return (
      <div className="access-denied">
        <ShieldOff size={32} />
        <h1>Sin acceso a este módulo</h1>
        <p>
          Tu rol no tiene asignada la página “{mod.label}”. Pide al
          administrador que te habilite el acceso en Accesos por rol.
        </p>
        <Link to={home} className="btn-primary-link">
          Ir a inicio
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
