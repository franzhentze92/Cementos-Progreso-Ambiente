import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronRight,
  Database,
  FileBarChart2,
  LayoutDashboard,
  Leaf,
  MapPinned,
  UserRound,
} from 'lucide-react'

const REPORTES = [
  { to: '/reportes/reporte-1', label: 'Reporte 1' },
  { to: '/reportes/reporte-2', label: 'Reporte 2' },
  { to: '/reportes/reporte-3', label: 'Reporte 3' },
  { to: '/reportes/reporte-4', label: 'Reporte 4' },
  { to: '/reportes/huella-de-carbono', label: 'Huella de Carbono' },
]

const ENTRADAS = [
  { to: '/entrada-datos/db1', label: 'DB1' },
  { to: '/entrada-datos/db2', label: 'DB2' },
  { to: '/entrada-datos/db3', label: 'DB3' },
  { to: '/entrada-datos/db4', label: 'DB4' },
  { to: '/entrada-datos/huella-de-carbono', label: 'Huella de Carbono' },
]

export function Sidebar({
  onMouseEnter,
  onMouseLeave,
  onNavigate,
}: {
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onNavigate?: () => void
}) {
  const location = useLocation()
  const [reportesOpen, setReportesOpen] = useState(
    location.pathname.startsWith('/reportes'),
  )
  const [entradasOpen, setEntradasOpen] = useState(
    location.pathname.startsWith('/entrada-datos'),
  )

  useEffect(() => {
    if (location.pathname.startsWith('/reportes')) setReportesOpen(true)
    if (location.pathname.startsWith('/entrada-datos')) setEntradasOpen(true)
  }, [location.pathname])

  return (
    <aside
      className="sidebar"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="sidebar-header">
        <img src="/logo-mark.svg" alt="Progreso" />
        <span className="sidebar-brand-text">
          Cementos Progreso
          <br />
          Ambiente
        </span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          title="Dashboard"
          onClick={onNavigate}
        >
          <LayoutDashboard />
          <span className="nav-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/mapa"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          title="Mapa"
          onClick={onNavigate}
        >
          <MapPinned />
          <span className="nav-label">Mapa</span>
        </NavLink>

        <button
          type="button"
          className={`nav-group-btn${reportesOpen || location.pathname.startsWith('/reportes') ? ' active' : ''}`}
          onClick={() => setReportesOpen((v) => !v)}
          title="Reportes"
        >
          <FileBarChart2 />
          <span className="nav-label">Reportes</span>
          <ChevronRight className={`nav-chevron${reportesOpen ? ' open' : ''}`} size={16} />
        </button>
        <div className={`nav-sub${reportesOpen ? ' open' : ''}`}>
          {REPORTES.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={item.label}
              onClick={onNavigate}
            >
              <Leaf size={16} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          className={`nav-group-btn${entradasOpen || location.pathname.startsWith('/entrada-datos') ? ' active' : ''}`}
          onClick={() => setEntradasOpen((v) => !v)}
          title="Entrada de Datos"
        >
          <Database />
          <span className="nav-label">Entrada de Datos</span>
          <ChevronRight className={`nav-chevron${entradasOpen ? ' open' : ''}`} size={16} />
        </button>
        <div className={`nav-sub${entradasOpen ? ' open' : ''}`}>
          {ENTRADAS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={item.label}
              onClick={onNavigate}
            >
              <Database size={16} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <NavLink
          to="/perfil"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          title="Perfil"
          onClick={onNavigate}
        >
          <UserRound />
          <span className="nav-label">Perfil</span>
        </NavLink>
      </nav>
    </aside>
  )
}
