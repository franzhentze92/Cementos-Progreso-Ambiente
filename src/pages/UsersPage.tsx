import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  UserRound,
  UserX,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  ALL_PERMISSIONS,
  DIRECTORY_ADMIN_USERNAME,
  PERMISSION_LABELS,
  ROLE_FALLBACK,
  normalizeRoleCode,
  type AppPermission,
  type AppRole,
  type AppUser,
  type AppUserInput,
} from '../data/users'
import {
  createAppRole,
  createAppUser,
  deleteAppRole,
  deleteAppUser,
  loadAppRoles,
  loadAppUsers,
  setAppUserActive,
  updateAppRole,
  updateAppUser,
} from '../lib/usersApi'
import { setRoleModules } from '../lib/roleModulesApi'

type Tab = 'users' | 'roles'

type UserFormState = {
  username: string
  password: string
  name: string
  email: string
  role: string
  department: string
  active: boolean
}

type RoleFormState = {
  code: string
  label: string
  description: string
  sortOrder: number
  permissions: AppPermission[]
}

const EMPTY_USER: UserFormState = {
  username: '',
  password: '',
  name: '',
  email: '',
  role: 'Gerencia',
  department: '',
  active: true,
}

const EMPTY_ROLE: RoleFormState = {
  code: '',
  label: '',
  description: '',
  sortOrder: 10,
  permissions: ['dashboard:read', 'reportes:read', 'mapa:read'],
}

function toUserInput(form: UserFormState): AppUserInput {
  return {
    username: form.username,
    password: form.password || undefined,
    name: form.name,
    email: form.email,
    role: form.role,
    department: form.department,
    active: form.active,
  }
}

export function UsersPage() {
  const { user, isDirectoryAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<AppUser[]>([])
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState<UserFormState>(EMPTY_USER)
  const [showUserForm, setShowUserForm] = useState(false)
  const [query, setQuery] = useState('')

  const [editingRoleCode, setEditingRoleCode] = useState<string | null>(null)
  const [roleForm, setRoleForm] = useState<RoleFormState>(EMPTY_ROLE)
  const [showRoleForm, setShowRoleForm] = useState(false)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [u, r] = await Promise.all([loadAppUsers(), loadAppRoles()])
      setUsers(u)
      setRoles(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isDirectoryAdmin) return
    void reload()
  }, [isDirectoryAdmin])

  const roleOptions = useMemo(() => {
    if (roles.length) return roles
    return Object.entries(ROLE_FALLBACK).map(([code, meta]) => ({
      code,
      label: meta.label,
      description: meta.description,
      sortOrder: 0,
      permissions: meta.permissions,
    }))
  }, [roles])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q),
    )
  }, [users, query])

  if (!isDirectoryAdmin) {
    return <Navigate to="/perfil" replace />
  }

  function flashOk(msg: string) {
    setOkMsg(msg)
    setTimeout(() => setOkMsg(null), 3500)
  }

  function openCreateUser() {
    setEditingUserId(null)
    setUserForm({
      ...EMPTY_USER,
      role: roleOptions.find((r) => r.code === 'Gerencia')?.code ?? roleOptions[0]?.code ?? 'Gerencia',
    })
    setShowUserForm(true)
    setShowRoleForm(false)
    setTab('users')
    setError(null)
  }

  function openEditUser(u: AppUser) {
    setEditingUserId(u.id)
    setUserForm({
      username: u.username,
      password: '',
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      active: u.active,
    })
    setShowUserForm(true)
    setShowRoleForm(false)
    setTab('users')
    setError(null)
  }

  function closeUserForm() {
    setShowUserForm(false)
    setEditingUserId(null)
    setUserForm(EMPTY_USER)
  }

  async function handleUserSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingUserId) {
        await updateAppUser(editingUserId, toUserInput(userForm))
        flashOk(
          userForm.password.trim()
            ? 'Usuario y contraseña actualizados.'
            : 'Usuario actualizado.',
        )
      } else {
        await createAppUser(toUserInput(userForm))
        flashOk('Usuario creado. Ya puede iniciar sesión.')
      }
      closeUserForm()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(u: AppUser) {
    if (u.id === user?.id) {
      setError('No puedes desactivar tu propia cuenta.')
      return
    }
    setError(null)
    try {
      await setAppUserActive(u.id, !u.active)
      flashOk(u.active ? 'Usuario desactivado.' : 'Usuario activado.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar')
    }
  }

  async function handleDeleteUser(u: AppUser) {
    if (u.id === user?.id) {
      setError('No puedes eliminar tu propia cuenta.')
      return
    }
    if (u.username.toLowerCase() === DIRECTORY_ADMIN_USERNAME.toLowerCase()) {
      setError('No se puede eliminar la cuenta dueña del directorio.')
      return
    }
    const ok = window.confirm(
      `¿Eliminar a ${u.name} (${u.username})?\nEsta acción no se puede deshacer.`,
    )
    if (!ok) return
    setError(null)
    try {
      await deleteAppUser(u.id)
      flashOk('Usuario eliminado.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  function openCreateRole() {
    setEditingRoleCode(null)
    setRoleForm(EMPTY_ROLE)
    setShowRoleForm(true)
    setShowUserForm(false)
    setTab('roles')
    setError(null)
  }

  function openEditRole(r: AppRole) {
    setEditingRoleCode(r.code)
    setRoleForm({
      code: r.code,
      label: r.label,
      description: r.description,
      sortOrder: r.sortOrder,
      permissions: [...r.permissions],
    })
    setShowRoleForm(true)
    setShowUserForm(false)
    setTab('roles')
    setError(null)
  }

  function closeRoleForm() {
    setShowRoleForm(false)
    setEditingRoleCode(null)
    setRoleForm(EMPTY_ROLE)
  }

  function togglePerm(perm: AppPermission) {
    setRoleForm((f) => {
      const has = f.permissions.includes(perm)
      if (perm === '*') {
        return { ...f, permissions: has ? [] : ['*'] }
      }
      const withoutStar = f.permissions.filter((p) => p !== '*')
      if (has) {
        return { ...f, permissions: withoutStar.filter((p) => p !== perm) }
      }
      return { ...f, permissions: [...withoutStar, perm] }
    })
  }

  async function handleRoleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingRoleCode) {
        await updateAppRole(editingRoleCode, {
          label: roleForm.label,
          description: roleForm.description,
          sortOrder: roleForm.sortOrder,
          permissions: roleForm.permissions,
        })
        flashOk('Rol actualizado.')
      } else {
        const created = await createAppRole({
          code: roleForm.code,
          label: roleForm.label,
          description: roleForm.description,
          sortOrder: roleForm.sortOrder,
          permissions: roleForm.permissions,
        })
        await setRoleModules(created.code || normalizeRoleCode(roleForm.code), [
          'perfil',
          'dashboard',
        ])
        flashOk('Rol creado. Configura módulos en Accesos por rol.')
      }
      closeRoleForm()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el rol')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRole(r: AppRole) {
    const ok = window.confirm(
      `¿Eliminar el rol "${r.label}" (${r.code})?\nSolo si no hay usuarios asignados.`,
    )
    if (!ok) return
    setError(null)
    try {
      await deleteAppRole(r.code)
      flashOk('Rol eliminado.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el rol')
    }
  }

  return (
    <div className="users-page">
      <div className="page-header dash-header">
        <div>
          <h1>Gestión de usuarios</h1>
          <p>
            Solo visible para {DIRECTORY_ADMIN_USERNAME}. Crea cuentas, cambia
            contraseñas y define roles sin depender del equipo de desarrollo.
          </p>
        </div>
        <div className="dash-header-actions">
          <Link to="/perfil" className="btn-secondary-link">
            <UserRound size={16} />
            Mi perfil
          </Link>
          <Link to="/accesos" className="btn-secondary-link">
            <Shield size={16} />
            Accesos por rol
          </Link>
          {tab === 'users' ? (
            <button type="button" className="btn-primary-link" onClick={openCreateUser}>
              <Plus size={16} />
              Nuevo usuario
            </button>
          ) : (
            <button type="button" className="btn-primary-link" onClick={openCreateRole}>
              <Plus size={16} />
              Nuevo rol
            </button>
          )}
        </div>
      </div>

      <div className="users-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={tab === 'users' ? 'active' : ''}
          aria-selected={tab === 'users'}
          onClick={() => setTab('users')}
        >
          <UserRound size={16} />
          Usuarios ({users.length})
        </button>
        <button
          type="button"
          role="tab"
          className={tab === 'roles' ? 'active' : ''}
          aria-selected={tab === 'roles'}
          onClick={() => setTab('roles')}
        >
          <Shield size={16} />
          Roles ({roles.length})
        </button>
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

      {tab === 'users' && (
        <>
          <div className="users-roles-strip">
            {roleOptions.map((r) => (
              <article key={r.code} className="users-role-card">
                <div className="users-role-head">
                  <Shield size={16} />
                  <strong>{r.label}</strong>
                </div>
                <p>{r.description}</p>
                <span>
                  {users.filter((u) => u.role === r.code).length} usuario
                  {users.filter((u) => u.role === r.code).length === 1 ? '' : 's'}
                </span>
              </article>
            ))}
          </div>

          {showUserForm && (
            <section className="users-form-panel content-panel">
              <div className="dash-panel-head row">
                <div>
                  <h2>{editingUserId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
                  <p>
                    {editingUserId
                      ? 'Puedes cambiar datos, rol y contraseña. La contraseña solo se actualiza si la llenas.'
                      : 'Define usuario, contraseña y rol. La persona podrá entrar de inmediato.'}
                  </p>
                </div>
                <button type="button" className="btn-secondary-link" onClick={closeUserForm}>
                  Cancelar
                </button>
              </div>

              <form className="users-form" onSubmit={handleUserSubmit}>
                <div className="form-field">
                  <label htmlFor="u-name">Nombre completo</label>
                  <input
                    id="u-name"
                    value={userForm.name}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                    disabled={saving}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="u-username">Usuario (login)</label>
                  <input
                    id="u-username"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, username: e.target.value }))
                    }
                    required
                    disabled={saving}
                    autoComplete="off"
                    placeholder="correo@cempro.com"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="u-email">Correo</label>
                  <input
                    id="u-email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, email: e.target.value }))
                    }
                    required
                    disabled={saving}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="u-dept">Departamento</label>
                  <input
                    id="u-dept"
                    value={userForm.department}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, department: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="u-role">Rol</label>
                  <select
                    id="u-role"
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, role: e.target.value }))
                    }
                    disabled={saving || roleOptions.length === 0}
                    required
                  >
                    {roleOptions.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="u-pass">
                    <KeyRound size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    {editingUserId
                      ? 'Nueva contraseña (opcional)'
                      : 'Contraseña inicial'}
                  </label>
                  <input
                    id="u-pass"
                    type="password"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, password: e.target.value }))
                    }
                    required={!editingUserId}
                    disabled={saving}
                    autoComplete="new-password"
                    placeholder={
                      editingUserId
                        ? 'Dejar vacío para no cambiar'
                        : 'Contraseña temporal'
                    }
                  />
                </div>
                <div className="form-field users-active-field">
                  <label htmlFor="u-active">
                    <input
                      id="u-active"
                      type="checkbox"
                      checked={userForm.active}
                      onChange={(e) =>
                        setUserForm((f) => ({ ...f, active: e.target.checked }))
                      }
                      disabled={saving}
                    />
                    Cuenta activa (puede iniciar sesión)
                  </label>
                </div>
                <div className="users-form-actions">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? (
                      <Loader2 className="hc-spin" size={16} />
                    ) : editingUserId ? (
                      <Pencil size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    {editingUserId ? 'Guardar cambios' : 'Crear usuario'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="users-table-panel content-panel">
            <div className="dash-panel-head row">
              <div>
                <h2>Directorio</h2>
                <p>
                  {users.length} usuario{users.length === 1 ? '' : 's'} en
                  Supabase
                </p>
              </div>
              <input
                className="users-search"
                type="search"
                placeholder="Buscar por nombre, correo, rol…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="hc-loading users-loading">
                <Loader2 className="hc-spin" size={24} />
                <p>Cargando usuarios…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="dash-empty">
                <p>No hay usuarios que coincidan.</p>
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={openCreateUser}
                >
                  Crear el primero →
                </button>
              </div>
            ) : (
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Departamento</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id} className={u.active ? '' : 'inactive'}>
                        <td>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </td>
                        <td>{u.username}</td>
                        <td>
                          <span className="users-role-pill">{u.role}</span>
                        </td>
                        <td>{u.department || '—'}</td>
                        <td>
                          <span
                            className={`users-status ${u.active ? 'on' : 'off'}`}
                          >
                            {u.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="users-actions">
                          <button
                            type="button"
                            title="Editar / cambiar contraseña"
                            onClick={() => openEditUser(u)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            title={u.active ? 'Desactivar' : 'Activar'}
                            onClick={() => void toggleActive(u)}
                          >
                            {u.active ? (
                              <UserX size={15} />
                            ) : (
                              <UserCheck size={15} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="danger"
                            title="Eliminar"
                            onClick={() => void handleDeleteUser(u)}
                            disabled={
                              u.id === user?.id ||
                              u.username.toLowerCase() ===
                                DIRECTORY_ADMIN_USERNAME.toLowerCase()
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'roles' && (
        <>
          {showRoleForm && (
            <section className="users-form-panel content-panel">
              <div className="dash-panel-head row">
                <div>
                  <h2>{editingRoleCode ? 'Editar rol' : 'Nuevo rol'}</h2>
                  <p>
                    Define nombre, descripción y permisos. El código no se puede
                    cambiar después de crear el rol.
                  </p>
                </div>
                <button type="button" className="btn-secondary-link" onClick={closeRoleForm}>
                  Cancelar
                </button>
              </div>
              <p className="users-hint-link">
                Tras crear el rol, asigna módulos en{' '}
                <Link to="/accesos">Accesos por rol</Link>.
              </p>

              <form className="users-form" onSubmit={handleRoleSubmit}>
                {!editingRoleCode && (
                  <div className="form-field">
                    <label htmlFor="r-code">Código</label>
                    <input
                      id="r-code"
                      value={roleForm.code}
                      onChange={(e) =>
                        setRoleForm((f) => ({ ...f, code: e.target.value }))
                      }
                      required
                      disabled={saving}
                      placeholder="Ej. Supervisor_Planta"
                    />
                  </div>
                )}
                <div className="form-field">
                  <label htmlFor="r-label">Nombre visible</label>
                  <input
                    id="r-label"
                    value={roleForm.label}
                    onChange={(e) =>
                      setRoleForm((f) => ({ ...f, label: e.target.value }))
                    }
                    required
                    disabled={saving}
                  />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="r-desc">Descripción</label>
                  <textarea
                    id="r-desc"
                    rows={2}
                    value={roleForm.description}
                    onChange={(e) =>
                      setRoleForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="r-order">Orden</label>
                  <input
                    id="r-order"
                    type="number"
                    value={roleForm.sortOrder}
                    onChange={(e) =>
                      setRoleForm((f) => ({
                        ...f,
                        sortOrder: Number(e.target.value) || 0,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Permisos</label>
                  <div className="users-perms-grid">
                    {ALL_PERMISSIONS.map((perm) => (
                      <label key={perm} className="users-perm-chip">
                        <input
                          type="checkbox"
                          checked={roleForm.permissions.includes(perm)}
                          onChange={() => togglePerm(perm)}
                          disabled={saving}
                        />
                        {PERMISSION_LABELS[perm] ?? perm}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="users-form-actions">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? (
                      <Loader2 className="hc-spin" size={16} />
                    ) : (
                      <Shield size={16} />
                    )}
                    {editingRoleCode ? 'Guardar rol' : 'Crear rol'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="users-table-panel content-panel">
            <div className="dash-panel-head row">
              <div>
                <h2>Catálogo de roles</h2>
                <p>Asignables al crear o editar usuarios</p>
              </div>
            </div>

            {loading ? (
              <div className="hc-loading users-loading">
                <Loader2 className="hc-spin" size={24} />
                <p>Cargando roles…</p>
              </div>
            ) : (
              <div className="users-roles-list">
                {roles.map((r) => (
                  <article key={r.code} className="users-role-detail">
                    <div className="users-role-detail-head">
                      <div>
                        <strong>{r.label}</strong>
                        <small>{r.code}</small>
                      </div>
                      <div className="users-actions">
                        <button
                          type="button"
                          title="Editar rol"
                          onClick={() => openEditRole(r)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="danger"
                          title="Eliminar rol"
                          onClick={() => void handleDeleteRole(r)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <p>{r.description || 'Sin descripción'}</p>
                    <ul className="profile-perms">
                      {r.permissions.map((p) => (
                        <li key={p}>{PERMISSION_LABELS[p] ?? p}</li>
                      ))}
                    </ul>
                    <span className="users-role-count">
                      {users.filter((u) => u.role === r.code).length} usuario(s)
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
