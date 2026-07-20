import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Activity,
  Brain,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Database,
  Droplets,
  Factory,
  Files,
  FileBadge,
  FolderKanban,
  FolderOpen,
  Gauge,
  GraduationCap,
  HardHat,
  Handshake,
  KeyRound,
  LayoutDashboard,
  Leaf,
  Library,
  Loader2,
  MapPinned,
  Package,
  Radio,
  Recycle,
  Scale,
  SearchCheck,
  Settings2,
  ShieldAlert,
  Ship,
  Sprout,
  Target,
  Thermometer,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DIRECTORY_ADMIN_USERNAME } from '../data/users'
import {
  buildStructureGraph,
  layoutModuleAngles,
  layoutProjectPositions,
  polarToCartesian,
  STRUCTURE_GROUP_COLOR,
  type StructureGroupId,
  type StructureModuleNode,
} from '../data/estructuraTecnica'
import type { ProjectScope } from '../data/operationalModules'
import {
  loadStructureLiveStats,
  type ModuleLiveStats,
} from '../lib/estructuraTecnicaApi'

const MODULE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  mapa: MapPinned,
  'monitoreo-en-vivo': Radio,
  analista: Brain,
  'resumen-operaciones': Activity,
  'gestion-de-residuos': Trash2,
  'consumo-de-agua': Droplets,
  'inspeccion-ambiental': ClipboardCheck,
  'incidentes-ambientales': ShieldAlert,
  'monitoreo-ambiental': Thermometer,
  capacitaciones: GraduationCap,
  compostaje: Sprout,
  'nda-casco-verde': HardHat,
  'nda-general': Gauge,
  compromisos: Handshake,
  auditorias: SearchCheck,
  capa: ClipboardList,
  cumplimiento: Scale,
  'calendario-legal': CalendarDays,
  'resumen-cumplimiento': FolderKanban,
  'licencias-ambientales': FileBadge,
  'gestion-de-tramites': Files,
  'huella-de-carbono': Leaf,
  circularidad: Recycle,
  metas: Target,
  umbrales: Gauge,
  intensidad: Activity,
  indicadores: Activity,
  expedientes: FolderOpen,
  exportes: Package,
  biblioteca: Library,
  'centro-documental': Files,
  'entrada-datos': Database,
  usuarios: Users,
  accesos: KeyRound,
  perfil: UserRound,
}

const PROJECT_ICONS: Record<ProjectScope, LucideIcon> = {
  agroprogreso: Leaf,
  'planta-alicon': Factory,
  'descarga-barcos': Ship,
}

const VB = { w: 1280, h: 920 }
const CX = 640
const CY = 430
const RING_R = 355

function edgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const bulge = Math.min(90, len * 0.18)
  const cx = mx - (dy / len) * bulge * 0.35
  const cy = my + (dx / len) * bulge * 0.35
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

export function EstructuraTecnicaPage() {
  const { isDirectoryAdmin } = useAuth()
  const navigate = useNavigate()
  const graph = useMemo(() => buildStructureGraph(), [])
  const angles = useMemo(
    () => layoutModuleAngles(graph.modules),
    [graph.modules],
  )
  const projectPos = useMemo(() => layoutProjectPositions(CX, CY), [])

  const [focusProject, setFocusProject] = useState<ProjectScope | null>(null)
  const [focusModule, setFocusModule] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, ModuleLiveStats>>({})
  const [loadingStats, setLoadingStats] = useState(true)
  const [groupFilter, setGroupFilter] = useState<StructureGroupId | 'all'>(
    'all',
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const live = await loadStructureLiveStats(graph.modules)
        if (!cancelled) setStats(live)
      } finally {
        if (!cancelled) setLoadingStats(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [graph.modules])

  const modulePos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const m of graph.modules) {
      const deg = angles.get(m.id) ?? 0
      map.set(m.id, polarToCartesian(CX, CY, RING_R, deg))
    }
    return map
  }, [graph.modules, angles])

  const activeEdges = useMemo(() => {
    if (!focusProject && !focusModule) return null
    return new Set(
      graph.edges
        .filter((e) => {
          if (focusProject && e.projectId !== focusProject) return false
          if (focusModule && e.moduleId !== focusModule) return false
          return true
        })
        .map((e) => e.id),
    )
  }, [focusProject, focusModule, graph.edges])

  const relatedModuleIds = useMemo(() => {
    if (!focusProject) return null
    return new Set(
      graph.edges
        .filter((e) => e.projectId === focusProject)
        .map((e) => e.moduleId),
    )
  }, [focusProject, graph.edges])

  const relatedProjectIds = useMemo(() => {
    if (!focusModule) return null
    return new Set(
      graph.edges
        .filter((e) => e.moduleId === focusModule)
        .map((e) => e.projectId),
    )
  }, [focusModule, graph.edges])

  const moduleIndex = useMemo(() => {
    const map = new Map<string, number>()
    graph.modules.forEach((m, i) => map.set(m.id, i + 1))
    return map
  }, [graph.modules])

  const focusModuleNode = focusModule
    ? graph.modules.find((m) => m.id === focusModule)
    : null

  const visibleModules =
    groupFilter === 'all'
      ? graph.modules
      : graph.modules.filter((m) => m.group === groupFilter)

  const scopedCount = graph.edges.filter((e) => e.kind === 'scoped').length
  const totalRows = Object.values(stats).reduce((s, x) => s + x.rowCount, 0)

  if (!isDirectoryAdmin) {
    return <Navigate to="/administracion" replace />
  }

  function clearFocus() {
    setFocusProject(null)
    setFocusModule(null)
  }

  function onModuleClick(m: StructureModuleNode) {
    if (m.path.startsWith('#')) return
    navigate(m.path)
  }

  return (
    <div className="estructura-page">
      <div className="estructura-header">
        <div>
          <p className="estructura-kicker">Administración · Estructura técnica</p>
          <h1>Estructura de la Plataforma de Ambiente</h1>
          <p>
            Proyectos y negocios al centro, módulos conectados alrededor — datos
            reales del catálogo y de Supabase. Solo {DIRECTORY_ADMIN_USERNAME}.
          </p>
        </div>
        <div className="estructura-header-actions">
          <Link to="/administracion" className="btn-secondary-link">
            <Settings2 size={16} />
            Administración
          </Link>
          <Link to="/accesos" className="btn-secondary-link">
            <KeyRound size={16} />
            Accesos
          </Link>
        </div>
      </div>

      <div className="estructura-toolbar">
        <div className="estructura-filters" role="group" aria-label="Filtrar grupo">
          <button
            type="button"
            className={
              groupFilter === 'all'
                ? 'estructura-chip is-active'
                : 'estructura-chip'
            }
            onClick={() => setGroupFilter('all')}
          >
            Todos
          </button>
          {graph.groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className={
                groupFilter === g.id
                  ? 'estructura-chip is-active'
                  : 'estructura-chip'
              }
              style={
                {
                  '--chip-color': g.color,
                } as CSSProperties
              }
              onClick={() =>
                setGroupFilter((prev) => (prev === g.id ? 'all' : g.id))
              }
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="estructura-stats-bar">
          <span>
            <strong>{graph.projects.length}</strong> proyectos
          </span>
          <span>
            <strong>{graph.modules.length}</strong> módulos
          </span>
          <span>
            <strong>{scopedCount}</strong> vínculos operativos
          </span>
          <span>
            {loadingStats ? (
              <>
                <Loader2 size={14} className="spin" /> Cargando datos…
              </>
            ) : (
              <>
                <strong>{totalRows.toLocaleString('es-GT')}</strong> registros
                en BD
              </>
            )}
          </span>
          {(focusProject || focusModule) && (
            <button
              type="button"
              className="estructura-chip"
              onClick={clearFocus}
            >
              Limpiar foco
            </button>
          )}
        </div>
      </div>

      <div className="estructura-stage">
        <svg
          className="estructura-svg"
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          role="img"
          aria-label="Diagrama de estructura: proyectos al centro y módulos alrededor"
          onClick={clearFocus}
        >
          <defs>
            <radialGradient id="et-glow" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#0f3d28" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#071510" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#040a08" stopOpacity="1" />
            </radialGradient>
            <filter id="et-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={VB.w} height={VB.h} fill="url(#et-glow)" rx="18" />

          {/* Anillos decorativos */}
          <circle
            cx={CX}
            cy={CY}
            r={RING_R + 28}
            fill="none"
            stroke="rgba(90,182,75,0.12)"
            strokeWidth="1"
            strokeDasharray="4 10"
          />
          <circle
            cx={CX}
            cy={CY}
            r={RING_R - 55}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />

          {/* Edges: scoped always; platform only when focused */}
          <g className="estructura-edges" filter="url(#et-soft)">
            {graph.edges.map((e) => {
              if (
                groupFilter !== 'all' &&
                !visibleModules.some((m) => m.id === e.moduleId)
              ) {
                return null
              }
              const isScoped = e.kind === 'scoped'
              const showPlatform =
                !isScoped &&
                (focusModule === e.moduleId || focusProject === e.projectId)
              if (!isScoped && !showPlatform) return null

              const from = projectPos[e.projectId]
              const to = modulePos.get(e.moduleId)
              if (!from || !to) return null
              const mod = graph.modules.find((m) => m.id === e.moduleId)
              const color = mod
                ? STRUCTURE_GROUP_COLOR[mod.group]
                : '#5ab64b'
              const dimmed =
                activeEdges !== null && !activeEdges.has(e.id)
              return (
                <path
                  key={e.id}
                  d={edgePath(from, to)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isScoped ? 1.6 : 1.2}
                  strokeOpacity={
                    dimmed ? 0.04 : isScoped ? 0.55 : 0.35
                  }
                  strokeDasharray={isScoped ? undefined : '3 6'}
                  className="estructura-edge"
                />
              )
            })}
          </g>

          {/* Project hubs */}
          {graph.projects.map((p) => {
            const pos = projectPos[p.id]
            const Icon = PROJECT_ICONS[p.id]
            const dimmed =
              (relatedProjectIds !== null && !relatedProjectIds.has(p.id)) ||
              (focusProject !== null && focusProject !== p.id)
            const active = focusProject === p.id
            return (
              <g
                key={p.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className={
                  dimmed
                    ? 'estructura-project is-dim'
                    : active
                      ? 'estructura-project is-active'
                      : 'estructura-project'
                }
                onClick={(ev) => {
                  ev.stopPropagation()
                  setFocusModule(null)
                  setFocusProject((prev) => (prev === p.id ? null : p.id))
                }}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={-108}
                  y={-42}
                  width={216}
                  height={84}
                  rx={14}
                  fill="rgba(12, 28, 20, 0.92)"
                  stroke={p.color}
                  strokeWidth={active ? 2.4 : 1.5}
                  style={{
                    filter: `drop-shadow(0 0 ${active ? 14 : 8}px ${p.color}66)`,
                  }}
                />
                <foreignObject x={-98} y={-34} width={196} height={68}>
                  <div className="estructura-project-card">
                    <span
                      className="estructura-project-icon"
                      style={{ color: p.color }}
                    >
                      <Icon size={18} />
                    </span>
                    <strong>{p.label}</strong>
                    <ul>
                      {p.sites.slice(0, 3).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                      {p.sites.length > 3 && (
                        <li>+{p.sites.length - 3} más</li>
                      )}
                    </ul>
                  </div>
                </foreignObject>
              </g>
            )
          })}

          {/* Module nodes */}
          {visibleModules.map((m) => {
            const pos = modulePos.get(m.id)
            if (!pos) return null
            const Icon = MODULE_ICONS[m.id] ?? LayoutDashboard
            const color = STRUCTURE_GROUP_COLOR[m.group]
            const dimmed =
              (relatedModuleIds !== null && !relatedModuleIds.has(m.id)) ||
              (focusModule !== null && focusModule !== m.id)
            const active = focusModule === m.id
            const count = stats[m.id]?.rowCount
            const num = moduleIndex.get(m.id) ?? 0

            return (
              <g
                key={m.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className={
                  dimmed
                    ? 'estructura-module is-dim'
                    : active
                      ? 'estructura-module is-active'
                      : 'estructura-module'
                }
                onClick={(ev) => {
                  ev.stopPropagation()
                  setFocusProject(null)
                  setFocusModule((prev) => (prev === m.id ? null : m.id))
                }}
                onDoubleClick={(ev) => {
                  ev.stopPropagation()
                  onModuleClick(m)
                }}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={-78}
                  y={-22}
                  width={156}
                  height={44}
                  rx={10}
                  fill="rgba(8, 18, 14, 0.94)"
                  stroke={color}
                  strokeWidth={active ? 2 : 1.2}
                  style={{
                    filter: `drop-shadow(0 0 ${active ? 10 : 5}px ${color}55)`,
                  }}
                />
                <foreignObject x={-74} y={-18} width={148} height={36}>
                  <div className="estructura-module-card">
                    <span style={{ color }}>
                      <Icon size={14} />
                    </span>
                    <span className="estructura-module-label">{m.label}</span>
                    {typeof count === 'number' && count > 0 && (
                      <span className="estructura-module-count">
                        {formatCount(count)}
                      </span>
                    )}
                  </div>
                </foreignObject>
                <circle
                  cx={70}
                  cy={-14}
                  r={9}
                  fill={color}
                  opacity={0.95}
                />
                <text
                  x={70}
                  y={-10}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  fill="#04110a"
                >
                  {num}
                </text>
              </g>
            )
          })}

          <text
            x={CX}
            y={VB.h - 36}
            textAnchor="middle"
            fill="rgba(255,255,255,0.45)"
            fontSize="12"
            fontFamily="IBM Plex Sans, sans-serif"
          >
            Una sola plataforma para gestionar operaciones, cumplimiento,
            sostenibilidad y documentación ambiental por proyecto o negocio.
          </text>
        </svg>

        <aside className="estructura-side">
          <div className="estructura-legend">
            <h2>Leyenda (Grupos)</h2>
            <ul>
              {graph.groups.map((g) => (
                <li key={g.id}>
                  <span
                    className="estructura-legend-swatch"
                    style={{ background: g.color }}
                  />
                  {g.label}
                  <em>
                    {
                      graph.modules.filter((m) => m.group === g.id).length
                    }
                  </em>
                </li>
              ))}
            </ul>
            <p className="estructura-legend-note">
              Línea continua = vínculo operativo real (alcance del módulo). Al
              enfocar un módulo de plataforma se muestran vínculos punteados a
              todos los proyectos.
            </p>
          </div>

          <div className="estructura-detail">
            <h2>
              {focusModuleNode
                ? focusModuleNode.label
                : focusProject
                  ? graph.projects.find((p) => p.id === focusProject)?.label
                  : 'Detalle'}
            </h2>
            {focusModuleNode ? (
              <>
                <p>
                  Grupo:{' '}
                  <strong style={{ color: STRUCTURE_GROUP_COLOR[focusModuleNode.group] }}>
                    {
                      graph.groups.find((g) => g.id === focusModuleNode.group)
                        ?.label
                    }
                  </strong>
                </p>
                <p>
                  Alcance:{' '}
                  {focusModuleNode.scoped
                    ? focusModuleNode.scopes
                        .map(
                          (s) =>
                            graph.projects.find((p) => p.id === s)?.label ?? s,
                        )
                        .join(', ')
                    : 'Plataforma (todos los proyectos)'}
                </p>
                {stats[focusModuleNode.id] && (
                  <p>
                    Registros en BD:{' '}
                    <strong>
                      {stats[focusModuleNode.id].rowCount.toLocaleString(
                        'es-GT',
                      )}
                    </strong>
                    {stats[focusModuleNode.id].tables.length > 0 && (
                      <span className="estructura-tables">
                        {' '}
                        · {stats[focusModuleNode.id].tables.join(', ')}
                      </span>
                    )}
                  </p>
                )}
                <button
                  type="button"
                  className="btn-primary-link"
                  onClick={() => onModuleClick(focusModuleNode)}
                >
                  Abrir módulo
                </button>
              </>
            ) : focusProject ? (
              <>
                <ul className="estructura-site-list">
                  {(
                    graph.projects.find((p) => p.id === focusProject)?.sites ??
                    []
                  ).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p>
                  Módulos operativos vinculados:{' '}
                  <strong>
                    {
                      graph.edges.filter(
                        (e) =>
                          e.projectId === focusProject && e.kind === 'scoped',
                      ).length
                    }
                  </strong>
                </p>
                <ul className="estructura-link-list">
                  {graph.modules
                    .filter(
                      (m) =>
                        m.scoped && m.scopes.includes(focusProject),
                    )
                    .map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setFocusProject(null)
                            setFocusModule(m.id)
                          }}
                        >
                          {m.label}
                        </button>
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <p>
                Clic en un proyecto o módulo para resaltar conexiones. Doble
                clic en un módulo para abrirlo. Los conteos vienen de Supabase
                en tiempo real.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Vista lista (móvil / accesible) */}
      <section className="estructura-matrix">
        <h2>Matriz proyecto × módulo operativo</h2>
        <div className="estructura-matrix-scroll">
          <table>
            <thead>
              <tr>
                <th>Módulo</th>
                {graph.projects.map((p) => (
                  <th key={p.id}>{p.label}</th>
                ))}
                <th>Registros</th>
              </tr>
            </thead>
            <tbody>
              {graph.modules
                .filter((m) => m.scoped)
                .map((m) => (
                  <tr key={m.id}>
                    <td>
                      <button
                        type="button"
                        className="estructura-matrix-link"
                        onClick={() => onModuleClick(m)}
                      >
                        {m.label}
                      </button>
                    </td>
                    {graph.projects.map((p) => (
                      <td key={p.id} className="estructura-matrix-cell">
                        {m.scopes.includes(p.id) ? (
                          <span
                            className="estructura-dot"
                            style={{
                              background: STRUCTURE_GROUP_COLOR[m.group],
                            }}
                            title="Conectado"
                          />
                        ) : (
                          <span className="estructura-dot is-off" />
                        )}
                      </td>
                    ))}
                    <td>
                      {stats[m.id]
                        ? stats[m.id].rowCount.toLocaleString('es-GT')
                        : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
