import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronRight,
  ClipboardList,
  Database,
  Droplets,
  Factory,
  FileBadge,
  FolderKanban,
  Gauge,
  GraduationCap,
  HardHat,
  LayoutDashboard,
  Leaf,
  MapPinned,
  Recycle,
  ShieldAlert,
  Sprout,
  Thermometer,
  Trash2,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavLeaf = {
  to: string
  label: string
  icon: LucideIcon
}

type NavBranch = {
  id: string
  label: string
  icon: LucideIcon
  match: string
  children: NavLeaf[]
}

const OPERACIONES_BRANCHES: NavBranch[] = [
  {
    id: 'agroprogreso',
    label: 'Agroprogreso',
    icon: Sprout,
    match: '/operaciones/agroprogreso',
    children: [
      {
        to: '/operaciones/agroprogreso/gestion-de-residuos',
        label: 'Gestión de residuos',
        icon: Trash2,
      },
      {
        to: '/operaciones/agroprogreso/consumo-de-agua',
        label: 'Consumo de agua',
        icon: Droplets,
      },
      {
        to: '/operaciones/agroprogreso/inspeccion-ambiental',
        label: 'Inspección ambiental',
        icon: ClipboardList,
      },
      {
        to: '/operaciones/agroprogreso/incidentes-ambientales',
        label: 'Incidentes ambientales',
        icon: ShieldAlert,
      },
      {
        to: '/operaciones/agroprogreso/monitoreo-ambiental',
        label: 'Monitoreo ambiental',
        icon: Thermometer,
      },
      {
        to: '/operaciones/agroprogreso/capacitaciones',
        label: 'Capacitaciones',
        icon: GraduationCap,
      },
      {
        to: '/operaciones/agroprogreso/licencias-ambientales',
        label: 'Licencias ambientales',
        icon: FileBadge,
      },
      {
        to: '/operaciones/agroprogreso/compostaje',
        label: 'Compostaje',
        icon: Recycle,
      },
      {
        to: '/operaciones/agroprogreso/nda-casco-verde',
        label: 'NDA Casco Verde',
        icon: HardHat,
      },
      {
        to: '/operaciones/agroprogreso/nda-general',
        label: 'NDA General',
        icon: Gauge,
      },
      {
        to: '/operaciones/agroprogreso/gestion-de-tramites',
        label: 'Gestión de trámites',
        icon: FolderKanban,
      },
    ],
  },
  {
    id: 'planta-alicon',
    label: 'Planta Alicón',
    icon: Factory,
    match: '/operaciones/planta-alicon',
    children: [
      {
        to: '/operaciones/planta-alicon/inspeccion-ambiental',
        label: 'Inspección ambiental',
        icon: ClipboardList,
      },
      {
        to: '/operaciones/planta-alicon/incidentes-ambientales',
        label: 'Incidentes ambientales',
        icon: ShieldAlert,
      },
      {
        to: '/operaciones/planta-alicon/monitoreo-ambiental',
        label: 'Monitoreo ambiental',
        icon: Thermometer,
      },
      {
        to: '/operaciones/planta-alicon/huella-de-carbono',
        label: 'Huella de carbono',
        icon: Leaf,
      },
    ],
  },
]

const ENTRADA_BRANCHES: NavBranch[] = [
  {
    id: 'agroprogreso',
    label: 'Agroprogreso',
    icon: Sprout,
    match: '/entrada-datos/agroprogreso',
    children: [
      {
        to: '/entrada-datos/agroprogreso/gestion-de-residuos',
        label: 'Gestión de residuos',
        icon: Trash2,
      },
      {
        to: '/entrada-datos/agroprogreso/consumo-de-agua',
        label: 'Consumo de agua',
        icon: Droplets,
      },
      {
        to: '/entrada-datos/agroprogreso/inspeccion-ambiental',
        label: 'Inspección ambiental',
        icon: ClipboardList,
      },
      {
        to: '/entrada-datos/agroprogreso/incidentes-ambientales',
        label: 'Incidentes ambientales',
        icon: ShieldAlert,
      },
      {
        to: '/entrada-datos/agroprogreso/monitoreo-ambiental',
        label: 'Monitoreo ambiental',
        icon: Thermometer,
      },
      {
        to: '/entrada-datos/agroprogreso/capacitaciones',
        label: 'Capacitaciones',
        icon: GraduationCap,
      },
      {
        to: '/entrada-datos/agroprogreso/licencias-ambientales',
        label: 'Licencias ambientales',
        icon: FileBadge,
      },
      {
        to: '/entrada-datos/agroprogreso/compostaje',
        label: 'Compostaje',
        icon: Recycle,
      },
      {
        to: '/entrada-datos/agroprogreso/nda-casco-verde',
        label: 'NDA Casco Verde',
        icon: HardHat,
      },
      {
        to: '/entrada-datos/agroprogreso/nda-general',
        label: 'NDA General',
        icon: Gauge,
      },
      {
        to: '/entrada-datos/agroprogreso/gestion-de-tramites',
        label: 'Gestión de trámites',
        icon: FolderKanban,
      },
    ],
  },
  {
    id: 'planta-alicon-entrada',
    label: 'Planta Alicón',
    icon: Factory,
    match: '/entrada-datos/planta-alicon',
    children: [
      {
        to: '/entrada-datos/planta-alicon/incidentes-ambientales',
        label: 'Incidentes ambientales',
        icon: ShieldAlert,
      },
      {
        to: '/entrada-datos/planta-alicon/inspeccion-ambiental',
        label: 'Inspección ambiental',
        icon: ClipboardList,
      },
      {
        to: '/entrada-datos/planta-alicon/monitoreo-ambiental',
        label: 'Monitoreo ambiental',
        icon: Thermometer,
      },
      {
        to: '/entrada-datos/planta-alicon/huella-de-carbono',
        label: 'Huella de carbono',
        icon: Leaf,
      },
    ],
  },
]

function NestedBranchNav({
  branches,
  openMap,
  onToggle,
  path,
  onNavigate,
}: {
  branches: NavBranch[]
  openMap: Record<string, boolean>
  onToggle: (id: string) => void
  path: string
  onNavigate?: () => void
}) {
  return (
    <>
      {branches.map((branch) => {
        const routeActive = path.startsWith(branch.match)
        const expanded = openMap[branch.id] ?? false
        return (
          <div key={branch.id} className="nav-nested-group">
            <button
              type="button"
              className={`nav-group-btn nav-group-btn--nested${routeActive ? ' active' : ''}${expanded ? ' expanded' : ''}`}
              onClick={() => onToggle(branch.id)}
              title={branch.label}
              aria-expanded={expanded}
            >
              <branch.icon size={16} />
              <span className="nav-label">{branch.label}</span>
              <ChevronRight
                className={`nav-chevron${expanded ? ' open' : ''}`}
                size={14}
              />
            </button>
            <div
              className={`nav-sub nav-sub--nested${expanded ? ' open' : ''}`}
            >
              {branch.children.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `nav-item${isActive ? ' active' : ''}`
                  }
                  title={item.label}
                  onClick={onNavigate}
                >
                  <item.icon size={14} />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

function initialBranchOpen(branches: NavBranch[], path: string) {
  return Object.fromEntries(
    branches.map((b) => [b.id, path.startsWith(b.match)]),
  )
}

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
  const path = location.pathname

  const [operacionesOpen, setOperacionesOpen] = useState(
    path.startsWith('/operaciones'),
  )
  const [entradasOpen, setEntradasOpen] = useState(
    path.startsWith('/entrada-datos'),
  )
  const [operacionesBranchOpen, setOperacionesBranchOpen] = useState(() =>
    initialBranchOpen(OPERACIONES_BRANCHES, path),
  )
  const [entradaBranchOpen, setEntradaBranchOpen] = useState(() =>
    initialBranchOpen(ENTRADA_BRANCHES, path),
  )

  useEffect(() => {
    if (path.startsWith('/operaciones')) {
      setOperacionesOpen(true)
      setEntradasOpen(false)
      setOperacionesBranchOpen((prev) => {
        const next = { ...prev }
        for (const b of OPERACIONES_BRANCHES) {
          if (path.startsWith(b.match)) next[b.id] = true
        }
        return next
      })
    }
    if (path.startsWith('/entrada-datos')) {
      setEntradasOpen(true)
      setOperacionesOpen(false)
      setEntradaBranchOpen((prev) => {
        const next = { ...prev }
        for (const b of ENTRADA_BRANCHES) {
          if (path.startsWith(b.match)) next[b.id] = true
        }
        return next
      })
    }
  }, [path])

  const operacionesRouteActive = path.startsWith('/operaciones')
  const entradaRouteActive = path.startsWith('/entrada-datos')

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
          className={`nav-group-btn${operacionesRouteActive ? ' active' : ''}${operacionesOpen ? ' expanded' : ''}`}
          onClick={() => setOperacionesOpen((v) => !v)}
          title="Operaciones"
          aria-expanded={operacionesOpen}
        >
          <Sprout />
          <span className="nav-label">Operaciones</span>
          <ChevronRight
            className={`nav-chevron${operacionesOpen ? ' open' : ''}`}
            size={16}
          />
        </button>
        <div className={`nav-sub${operacionesOpen ? ' open' : ''}`}>
          <NestedBranchNav
            branches={OPERACIONES_BRANCHES}
            openMap={operacionesBranchOpen}
            onToggle={(id) =>
              setOperacionesBranchOpen((prev) => ({
                ...prev,
                [id]: !prev[id],
              }))
            }
            path={path}
            onNavigate={onNavigate}
          />
        </div>

        <button
          type="button"
          className={`nav-group-btn${entradaRouteActive ? ' active' : ''}${entradasOpen ? ' expanded' : ''}`}
          onClick={() => setEntradasOpen((v) => !v)}
          title="Entrada de Datos"
          aria-expanded={entradasOpen}
        >
          <Database />
          <span className="nav-label">Entrada de Datos</span>
          <ChevronRight
            className={`nav-chevron${entradasOpen ? ' open' : ''}`}
            size={16}
          />
        </button>
        <div className={`nav-sub${entradasOpen ? ' open' : ''}`}>
          <NestedBranchNav
            branches={ENTRADA_BRANCHES}
            openMap={entradaBranchOpen}
            onToggle={(id) =>
              setEntradaBranchOpen((prev) => ({
                ...prev,
                [id]: !prev[id],
              }))
            }
            path={path}
            onNavigate={onNavigate}
          />
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
