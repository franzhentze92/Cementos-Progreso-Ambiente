import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { firstAllowedPath } from '../data/appModules'

/** Redirige al primer módulo permitido del rol activo. */
export function SmartHomeRedirect() {
  const { user, loading, canAccessModule } = useAuth()

  if (loading) {
    return (
      <div className="auth-boot">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={firstAllowedPath(canAccessModule)} replace />
}
