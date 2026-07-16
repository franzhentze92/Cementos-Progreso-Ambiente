import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  CheckSquare,
  Library,
  Loader2,
  Save,
  Shield,
  Square,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  APP_MODULE_GROUPS,
  ASSIGNABLE_MODULES,
  type AppModuleGroupId,
} from '../data/appModules'
import { DIRECTORY_ADMIN_USERNAME, type AppRole } from '../data/users'
import { loadAppRoles } from '../lib/usersApi'
import {
  loadAllRoleModules,
  setRoleModules,
} from '../lib/roleModulesApi'

export function RoleAccessPage() {
  const { isDirectoryAdmin, refreshUser } = useAuth()
  const [roles, setRoles] = useState<AppRole[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [baseline, setBaseline] = useState<Set<string>>(new Set())
  const [allMaps, setAllMaps] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [r, maps] = await Promise.all([
        loadAppRoles(),
        loadAllRoleModules(),
      ])
      setRoles(r)
      setAllMaps(maps)
      const nextRole =
        selectedRole && r.some((x) => x.code === selectedRole)
          ? selectedRole
          : r[0]?.code ?? ''
      setSelectedRole(nextRole)
      const ids = new Set(maps[nextRole] ?? [])
      // Filtrar solo asignables
      const assignable = new Set(ASSIGNABLE_MODULES.map((m) => m.id))
      const filtered = new Set([...ids].filter((id) => assignable.has(id)))
      setSelected(filtered)
      setBaseline(new Set(filtered))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isDirectoryAdmin) return
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirectoryAdmin])

  useEffect(() => {
    if (!selectedRole) return
    const assignable = new Set(ASSIGNABLE_MODULES.map((m) => m.id))
    const ids = new Set(
      (allMaps[selectedRole] ?? []).filter((id) => assignable.has(id)),
    )
    setSelected(ids)
    setBaseline(new Set(ids))
    setOkMsg(null)
    setError(null)
  }, [selectedRole, allMaps])

  const dirty = useMemo(() => {
    if (selected.size !== baseline.size) return true
    for (const id of selected) {
      if (!baseline.has(id)) return true
    }
    return false
  }, [selected, baseline])

  const groups = useMemo(
    () =>
      APP_MODULE_GROUPS.filter((g) => g.id !== 'admin').map((g) => ({
        ...g,
        modules: ASSIGNABLE_MODULES.filter((m) => m.group === g.id),
      })),
    [],
  )

  if (!isDirectoryAdmin) {
    return <Navigate to="/perfil" replace />
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setGroup(groupId: AppModuleGroupId, on: boolean) {
    const ids = ASSIGNABLE_MODULES.filter((m) => m.group === groupId).map(
      (m) => m.id,
    )
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      // Perfil siempre on
      next.add('perfil')
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(ASSIGNABLE_MODULES.map((m) => m.id)))
  }

  function selectNone() {
    setSelected(new Set(['perfil']))
  }

  async function handleSave() {
    if (!selectedRole) return
    setSaving(true)
    setError(null)
    setOkMsg(null)
    try {
      await setRoleModules(selectedRole, [...selected])
      const maps = await loadAllRoleModules()
      setAllMaps(maps)
      const assignable = new Set(ASSIGNABLE_MODULES.map((m) => m.id))
      const ids = new Set(
        (maps[selectedRole] ?? []).filter((id) => assignable.has(id)),
      )
      setSelected(ids)
      setBaseline(new Set(ids))
      setOkMsg(`Accesos guardados para el rol “${selectedRole}”.`)
      await refreshUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="access-page">
      <div className="page-header dash-header">
        <div>
          <h1>Accesos por rol</h1>
          <p>
            Solo {DIRECTORY_ADMIN_USERNAME}. Asigna o quita módulos y páginas a
            cada rol; el menú y las rutas se actualizan al instante.
          </p>
        </div>
        <div className="dash-header-actions">
          <Link to="/usuarios" className="btn-secondary-link">
            <Users size={16} />
            Usuarios
          </Link>
          <Link to="/biblioteca" className="btn-secondary-link">
            <Library size={16} />
            Biblioteca
          </Link>
          <button
            type="button"
            className="btn-primary-link"
            onClick={() => void handleSave()}
            disabled={saving || !dirty || !selectedRole}
          >
            {saving ? (
              <Loader2 className="hc-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            Guardar accesos
          </button>
        </div>
      </div>

      {error && (
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}
      {okMsg && (
        <div className="hc-banner hc-banner-ok" role="status">
          {okMsg}
        </div>
      )}

      {loading ? (
        <div className="hc-loading users-loading">
          <Loader2 className="hc-spin" size={24} />
          <p>Cargando roles y módulos…</p>
        </div>
      ) : (
        <div className="access-layout">
          <aside className="access-roles content-panel">
            <div className="dash-panel-head">
              <h2>Roles</h2>
              <p>Elige un rol para editar sus módulos</p>
            </div>
            <ul className="access-role-list">
              {roles.map((r) => {
                const count = (allMaps[r.code] ?? []).filter((id) =>
                  ASSIGNABLE_MODULES.some((m) => m.id === id),
                ).length
                return (
                  <li key={r.code}>
                    <button
                      type="button"
                      className={selectedRole === r.code ? 'active' : ''}
                      onClick={() => setSelectedRole(r.code)}
                    >
                      <Shield size={16} />
                      <span>
                        <strong>{r.label}</strong>
                        <small>
                          {count}/{ASSIGNABLE_MODULES.length} módulos
                        </small>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          <section className="access-modules content-panel">
            <div className="dash-panel-head row">
              <div>
                <h2>
                  Módulos · {roles.find((r) => r.code === selectedRole)?.label ?? selectedRole}
                </h2>
                <p>
                  {selected.size} seleccionados
                  {dirty ? ' · cambios sin guardar' : ''}
                </p>
              </div>
              <div className="access-bulk">
                <button type="button" className="btn-secondary-link" onClick={selectAll}>
                  <CheckSquare size={14} />
                  Todos
                </button>
                <button type="button" className="btn-secondary-link" onClick={selectNone}>
                  <Square size={14} />
                  Solo perfil
                </button>
              </div>
            </div>

            <div className="access-groups">
              {groups.map((g) => {
                const allOn = g.modules.every((m) => selected.has(m.id))
                const someOn = g.modules.some((m) => selected.has(m.id))
                return (
                  <div key={g.id} className="access-group">
                    <div className="access-group-head">
                      <div>
                        <strong>{g.label}</strong>
                        <p>{g.description}</p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary-link"
                        onClick={() => setGroup(g.id, !allOn)}
                      >
                        {allOn ? 'Quitar grupo' : someOn ? 'Completar grupo' : 'Asignar grupo'}
                      </button>
                    </div>
                    <ul className="access-module-list">
                      {g.modules.map((m) => {
                        const on = selected.has(m.id)
                        const locked = m.id === 'perfil'
                        return (
                          <li key={m.id}>
                            <label className={on ? 'on' : ''}>
                              <input
                                type="checkbox"
                                checked={on}
                                disabled={locked}
                                onChange={() => toggle(m.id)}
                              />
                              <span>
                                <strong>{m.label}</strong>
                                <small>{m.path}</small>
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
