import { NavLink, useLocation } from 'react-router-dom'
import {
  ClipboardList,
  FilePlus2,
  FolderOpen,
  History,
  Users,
} from 'lucide-react'

const LINKS = [
  {
    to: '/compromisos-ambientales/lista',
    label: 'Lista',
    icon: ClipboardList,
  },
  {
    to: '/compromisos-ambientales/crear',
    label: 'Crear / Editar',
    icon: FilePlus2,
    matchPrefix: '/compromisos-ambientales/editar',
  },
  {
    to: '/compromisos-ambientales/evidencias',
    label: 'Evidencias',
    icon: FolderOpen,
  },
  {
    to: '/compromisos-ambientales/seguimiento',
    label: 'Seguimiento',
    icon: History,
  },
  {
    to: '/compromisos-ambientales/responsables',
    label: 'Responsables',
    icon: Users,
  },
] as const

export function CompromisosSubnav() {
  const { pathname } = useLocation()

  return (
    <nav className="compromisos-subnav" aria-label="Compromisos Ambientales">
      {LINKS.map((link) => {
        const extraActive =
          'matchPrefix' in link &&
          typeof link.matchPrefix === 'string' &&
          pathname.startsWith(link.matchPrefix)
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `compromisos-subnav-link${isActive || extraActive ? ' active' : ''}`
            }
          >
            <link.icon size={14} />
            {link.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
