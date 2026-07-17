import { Link, useLocation } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { firstAllowedPath, getModuleByPath } from '../data/appModules'

/** Fallback cuando la URL no coincide con ninguna ruta registrada. */
export function NotFoundPage() {
  const location = useLocation()
  const { canAccessModule } = useAuth()
  const home = firstAllowedPath(canAccessModule)
  const mod = getModuleByPath(location.pathname)

  return (
    <div className="access-denied">
      <ShieldOff size={32} />
      <h1>Página no encontrada</h1>
      <p>
        No hay una ruta registrada para{' '}
        <code>{location.pathname}</code>
        {mod ? ` (módulo “${mod.label}”).` : '.'} Si acabas de actualizar la
        app, recarga con Ctrl+F5.
      </p>
      <Link to={home} className="btn-primary-link">
        Ir a inicio
      </Link>
    </div>
  )
}
