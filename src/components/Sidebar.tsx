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
  Radio,
  Recycle,
  Scale,
  ClipboardCheck,
  Package,
  Target,
  ShieldAlert,
  Activity,
  Brain,
  FolderOpen,
  Ship,
  Sprout,
  Thermometer,
  Trash2,
  Users,
  UserRound,
  KeyRound,
  Library,
  FilePlus2,
  History,
  Handshake,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
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
  {
    id: 'descarga-barcos',
    label: 'Descarga Barcos',
    icon: Ship,
    match: '/operaciones/descarga-barcos',
    children: [
      {
        to: '/operaciones/descarga-barcos/inspeccion-ambiental',
        label: 'Inspecciones',
        icon: ClipboardList,
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
  {
    id: 'descarga-barcos-entrada',
    label: 'Descarga Barcos',
    icon: Ship,
    match: '/entrada-datos/descarga-barcos',
    children: [
      {
        to: '/entrada-datos/descarga-barcos/inspeccion-ambiental',
        label: 'Inspecciones',
        icon: ClipboardList,
      },
    ],
  },
]

const COMPROMISOS_BRANCH: NavBranch = {
  id: 'compromisos-ambientales',
  label: 'Compromisos Ambientales',
  icon: Handshake,
  match: '/compromisos-ambientales',
  children: [
    {
      to: '/compromisos-ambientales/lista',
      label: 'Lista de compromisos',
      icon: ClipboardList,
    },
    {
      to: '/compromisos-ambientales/crear',
      label: 'Crear / Editar',
      icon: FilePlus2,
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
  ],
}

function NestedBranchNav({
  branches,
  openMap,
  onToggle,
  path,
  onNavigate,
  canAccessPath,
}: {
  branches: NavBranch[]
  openMap: Record<string, boolean>
  onToggle: (id: string) => void
  path: string
  onNavigate?: () => void
  canAccessPath: (pathname: string) => boolean
}) {
  return (
    <>
      {branches.map((branch) => {
        const visibleChildren = branch.children.filter((item) =>
          canAccessPath(item.to),
        )
        if (visibleChildren.length === 0) return null

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
              {visibleChildren.map((item) => (
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
  const { isDirectoryAdmin, canAccessPath } = useAuth()

  const visibleOperaciones = OPERACIONES_BRANCHES.map((b) => ({
    ...b,
    children: b.children.filter((c) => canAccessPath(c.to)),
  })).filter((b) => b.children.length > 0)

  const visibleEntrada = ENTRADA_BRANCHES.map((b) => ({
    ...b,
    children: b.children.filter((c) => canAccessPath(c.to)),
  })).filter((b) => b.children.length > 0)

  const visibleCompromisos = COMPROMISOS_BRANCH.children.filter((c) =>
    canAccessPath(c.to),
  )
  const showCompromisos = visibleCompromisos.length > 0

  const showDashboard = canAccessPath('/dashboard')
  const showMapa = canAccessPath('/mapa')
  const showMonitoreoEnVivo = canAccessPath('/monitoreo-en-vivo')
  const showCumplimiento = canAccessPath('/cumplimiento')
  const showCapa = canAccessPath('/capa')
  const showMetas = canAccessPath('/metas')
  const showUmbrales = canAccessPath('/umbrales')
  const showIntensidad = canAccessPath('/intensidad')
  const showCircularidad = canAccessPath('/circularidad')
  const showExpedientes = canAccessPath('/expedientes')
  const showAnalista = canAccessPath('/analista')
  const showExportes = canAccessPath('/exportes')
  const showOperaciones = visibleOperaciones.length > 0
  const showEntrada = visibleEntrada.length > 0

  const [operacionesOpen, setOperacionesOpen] = useState(
    path.startsWith('/operaciones'),
  )
  const [entradasOpen, setEntradasOpen] = useState(
    path.startsWith('/entrada-datos'),
  )
  const [compromisosOpen, setCompromisosOpen] = useState(
    path.startsWith('/compromisos-ambientales'),
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
    if (path.startsWith('/compromisos-ambientales')) {
      setCompromisosOpen(true)
    }
  }, [path])

  const operacionesRouteActive = path.startsWith('/operaciones')
  const entradaRouteActive = path.startsWith('/entrada-datos')
  const compromisosRouteActive = path.startsWith('/compromisos-ambientales')

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
        {showDashboard && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Dashboard"
            onClick={onNavigate}
          >
            <LayoutDashboard />
            <span className="nav-label">Dashboard</span>
          </NavLink>
        )}

        {showMapa && (
          <NavLink
            to="/mapa"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Mapa"
            onClick={onNavigate}
          >
            <MapPinned />
            <span className="nav-label">Mapa</span>
          </NavLink>
        )}

        {showMonitoreoEnVivo && (
          <NavLink
            to="/monitoreo-en-vivo"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Monitoreo En Vivo"
            onClick={onNavigate}
          >
            <Radio />
            <span className="nav-label">Monitoreo En Vivo</span>
          </NavLink>
        )}

        {showCumplimiento && (
          <NavLink
            to="/cumplimiento"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Cumplimiento legal"
            onClick={onNavigate}
          >
            <Scale />
            <span className="nav-label">Cumplimiento</span>
          </NavLink>
        )}

        {showCapa && (
          <NavLink
            to="/capa"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="CAPA"
            onClick={onNavigate}
          >
            <ClipboardCheck />
            <span className="nav-label">CAPA</span>
          </NavLink>
        )}

        {showCompromisos && (
          <>
            <button
              type="button"
              className={`nav-group-btn${compromisosRouteActive ? ' active' : ''}${compromisosOpen ? ' expanded' : ''}`}
              onClick={() => setCompromisosOpen((v) => !v)}
              title="Compromisos Ambientales"
              aria-expanded={compromisosOpen}
            >
              <Handshake />
              <span className="nav-label">Compromisos Ambientales</span>
              <ChevronRight
                className={`nav-chevron${compromisosOpen ? ' open' : ''}`}
                size={16}
              />
            </button>
            <div className={`nav-sub${compromisosOpen ? ' open' : ''}`}>
              {visibleCompromisos.map((item) => (
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
          </>
        )}

        {showMetas && (
          <NavLink
            to="/metas"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Metas y KPIs"
            onClick={onNavigate}
          >
            <Target />
            <span className="nav-label">Metas</span>
          </NavLink>
        )}

        {showUmbrales && (
          <NavLink
            to="/umbrales"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Umbrales de monitoreo"
            onClick={onNavigate}
          >
            <Gauge />
            <span className="nav-label">Umbrales</span>
          </NavLink>
        )}

        {showIntensidad && (
          <NavLink
            to="/intensidad"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Intensidad de carbono"
            onClick={onNavigate}
          >
            <Activity />
            <span className="nav-label">Intensidad</span>
          </NavLink>
        )}

        {showCircularidad && (
          <NavLink
            to="/circularidad"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Circularidad"
            onClick={onNavigate}
          >
            <Recycle />
            <span className="nav-label">Circularidad</span>
          </NavLink>
        )}

        {showExpedientes && (
          <NavLink
            to="/expedientes"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Expedientes ambientales"
            onClick={onNavigate}
          >
            <FolderOpen />
            <span className="nav-label">Expedientes</span>
          </NavLink>
        )}

        {showAnalista && (
          <NavLink
            to="/analista"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Analista semanal"
            onClick={onNavigate}
          >
            <Brain />
            <span className="nav-label">Analista</span>
          </NavLink>
        )}

        {showExportes && (
          <NavLink
            to="/exportes"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Exportes"
            onClick={onNavigate}
          >
            <Package />
            <span className="nav-label">Exportes</span>
          </NavLink>
        )}

        {showOperaciones && (
          <>
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
                branches={visibleOperaciones}
                openMap={operacionesBranchOpen}
                onToggle={(id) =>
                  setOperacionesBranchOpen((prev) => ({
                    ...prev,
                    [id]: !prev[id],
                  }))
                }
                path={path}
                onNavigate={onNavigate}
                canAccessPath={canAccessPath}
              />
            </div>
          </>
        )}

        {showEntrada && (
          <>
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
                branches={visibleEntrada}
                openMap={entradaBranchOpen}
                onToggle={(id) =>
                  setEntradaBranchOpen((prev) => ({
                    ...prev,
                    [id]: !prev[id],
                  }))
                }
                path={path}
                onNavigate={onNavigate}
                canAccessPath={canAccessPath}
              />
            </div>
          </>
        )}

        {isDirectoryAdmin && (
          <>
            <NavLink
              to="/usuarios"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title="Usuarios"
              onClick={onNavigate}
            >
              <Users />
              <span className="nav-label">Usuarios</span>
            </NavLink>
            <NavLink
              to="/accesos"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title="Accesos"
              onClick={onNavigate}
            >
              <KeyRound />
              <span className="nav-label">Accesos</span>
            </NavLink>
            <NavLink
              to="/biblioteca"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title="Biblioteca"
              onClick={onNavigate}
            >
              <Library />
              <span className="nav-label">Biblioteca</span>
            </NavLink>
          </>
        )}

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
