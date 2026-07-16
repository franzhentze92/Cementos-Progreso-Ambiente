import { Navigate, useLocation } from 'react-router-dom'
import { Loader2, ShieldOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getModuleByPath } from '../data/appModules'

export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, canAccessPath } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-boot">
        <Loader2 className="hc-spin" size={28} />
        <p>Verificando acceso…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!canAccessPath(location.pathname)) {
    const mod = getModuleByPath(location.pathname)
    return (
      <div className="access-denied">
        <ShieldOff size={32} />
        <h1>Sin acceso a este módulo</h1>
        <p>
          Tu rol no tiene asignada la página
          {mod ? ` “${mod.label}”` : ''}. Pide al administrador que te habilite
          el acceso.
        </p>
        <Link to="/perfil" className="btn-primary-link">
          Ir a mi perfil
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
