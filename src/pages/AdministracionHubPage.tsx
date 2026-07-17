import { Link } from 'react-router-dom'
import { KeyRound, Network, UserRound, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const LINKS = [
  {
    to: '/usuarios',
    label: 'Usuarios',
    description: 'Cuentas, roles y directorio.',
    icon: Users,
    adminOnly: true,
  },
  {
    to: '/accesos',
    label: 'Accesos',
    description: 'Módulos visibles por rol.',
    icon: KeyRound,
    adminOnly: true,
  },
  {
    to: '/estructura-tecnica',
    label: 'Estructura Técnica',
    description: 'Mapa de proyectos, módulos y datos reales.',
    icon: Network,
    adminOnly: true,
  },
  {
    to: '/perfil',
    label: 'Perfil',
    description: 'Datos de su cuenta.',
    icon: UserRound,
    adminOnly: false,
  },
] as const

export function AdministracionHubPage() {
  const { canAccessPath, isDirectoryAdmin } = useAuth()

  const visible = LINKS.filter((link) => {
    if (link.adminOnly && !isDirectoryAdmin) return false
    if (link.to === '/perfil') return true
    return canAccessPath(link.to)
  })

  return (
    <div className="carbon-page fase1-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">Administración</p>
          <h1>Administración</h1>
          <p>
            Configuración de usuarios, accesos, estructura técnica y perfil. La
            captura de datos vive en su propio módulo del menú.
          </p>
        </div>
      </div>

      <section className="carbon-section">
        <ul className="admin-hub-list">
          {visible.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="admin-hub-row">
                <span className="section-hub-card-icon">
                  <link.icon size={20} />
                </span>
                <span className="calendario-legal-main">
                  <strong>{link.label}</strong>
                  <span>{link.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
