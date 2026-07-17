import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  ALL_PROJECTS,
  PROJECT_SCOPE_LABELS,
  isProjectScope,
  supportsAllProjectsDefault,
  type OperationalSection,
  type ProjectScope,
  type ProjectScopeSelection,
} from '../data/operationalModules'

/**
 * Barra de filtro de proyecto (como unidad en Compromisos).
 * Sincroniza `?proyecto=` en la URL.
 * En inspección / incidentes / monitoreo default = todos.
 */
export function ProjectScopeFilter({
  section,
  moduleId,
  scopes,
  allowAll,
}: {
  section: OperationalSection
  moduleId: string
  /** Si se pasa, no consulta auth (útil en tests). */
  scopes?: ProjectScope[]
  /** Fuerza opción “Todos”. Por defecto según el módulo. */
  allowAll?: boolean
}) {
  const { accessibleScopesFor } = useAuth()
  const [params, setParams] = useSearchParams()
  const available = useMemo(
    () => scopes ?? accessibleScopesFor(section, moduleId),
    [scopes, accessibleScopesFor, section, moduleId],
  )

  const showAll =
    section === 'operaciones' &&
    (allowAll ?? supportsAllProjectsDefault(moduleId)) &&
    available.length > 1

  const raw = params.get('proyecto')
  const selected: ProjectScopeSelection | null = (() => {
    if (showAll && (raw === ALL_PROJECTS || raw == null || raw === '')) {
      return ALL_PROJECTS
    }
    if (raw && isProjectScope(raw) && available.includes(raw)) return raw
    if (showAll) return ALL_PROJECTS
    return available[0] ?? null
  })()

  useEffect(() => {
    if (!selected) return
    if (params.get('proyecto') === selected) return
    const next = new URLSearchParams(params)
    next.set('proyecto', selected)
    setParams(next, { replace: true })
  }, [selected, params, setParams])

  if (available.length <= 1 && !showAll) return null
  if (available.length === 0) return null

  return (
    <div className="project-scope-filter">
      <label htmlFor={`proyecto-${section}-${moduleId}`}>Proyecto</label>
      <select
        id={`proyecto-${section}-${moduleId}`}
        value={selected ?? ''}
        onChange={(e) => {
          const next = new URLSearchParams(params)
          next.set('proyecto', e.target.value)
          setParams(next, { replace: true })
        }}
      >
        {showAll ? (
          <option value={ALL_PROJECTS}>Todos los proyectos</option>
        ) : null}
        {available.map((s) => (
          <option key={s} value={s}>
            {PROJECT_SCOPE_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  )
}

export function useSelectedProjectScope(
  section: OperationalSection,
  moduleId: string,
): ProjectScopeSelection | null {
  const { accessibleScopesFor } = useAuth()
  const [params] = useSearchParams()
  const available = accessibleScopesFor(section, moduleId)
  const showAll =
    section === 'operaciones' &&
    supportsAllProjectsDefault(moduleId) &&
    available.length > 1
  const raw = params.get('proyecto')

  if (showAll && (raw === ALL_PROJECTS || raw == null || raw === '')) {
    return ALL_PROJECTS
  }
  if (raw && isProjectScope(raw) && available.includes(raw)) return raw
  if (showAll) return ALL_PROJECTS
  return available[0] ?? null
}
