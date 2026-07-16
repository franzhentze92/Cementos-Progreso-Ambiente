import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Building2,
  Leaf,
  Loader2,
  LogOut,
  Mail,
  Shield,
  Users,
  KeyRound,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  PERMISSION_LABELS,
  ROLE_FALLBACK,
  type AppPermission,
  type AppRole,
} from '../data/users'
import { loadAppRoles } from '../lib/usersApi'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function ProfilePage() {
  const { user, logout, isDirectoryAdmin, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [roleMeta, setRoleMeta] = useState<AppRole | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  useEffect(() => {
    if (!user) return
    const roleCode = user.role
    let cancelled = false
    ;(async () => {
      setLoadingRole(true)
      try {
        await refreshUser()
        const roles = await loadAppRoles()
        if (cancelled) return
        const found = roles.find((r) => r.code === roleCode) ?? null
        setRoleMeta(
          found ?? {
            code: roleCode,
            label: ROLE_FALLBACK[roleCode]?.label ?? roleCode,
            description: ROLE_FALLBACK[roleCode]?.description ?? '',
            sortOrder: 0,
            permissions: ROLE_FALLBACK[roleCode]?.permissions ?? [],
          },
        )
      } catch {
        if (!cancelled) {
          const fb = ROLE_FALLBACK[roleCode]
          setRoleMeta({
            code: roleCode,
            label: fb?.label ?? roleCode,
            description: fb?.description ?? '',
            sortOrder: 0,
            permissions: fb?.permissions ?? [],
          })
        }
      } finally {
        if (!cancelled) setLoadingRole(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role, refreshUser])

  if (!user) return null

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const permissions: AppPermission[] =
    roleMeta?.permissions ?? ROLE_FALLBACK[user.role]?.permissions ?? []

  const fields = [
    {
      label: 'Usuario',
      value: user.username,
      icon: UserRound,
      hint: 'Credencial de acceso',
    },
    {
      label: 'Correo',
      value: user.email,
      icon: Mail,
      hint: 'Contacto corporativo',
    },
    {
      label: 'Rol',
      value: roleMeta?.label ?? user.role,
      icon: Shield,
      hint: roleMeta?.description ?? 'Nivel de permisos',
    },
    {
      label: 'Departamento',
      value: user.department || '—',
      icon: Building2,
      hint: 'Área responsable',
    },
  ]

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Perfil</h1>
        <p>Información de la cuenta activa y acceso al sistema.</p>
      </div>

      <section className="profile-hero">
        <div className="profile-hero-bg" aria-hidden>
          <img src="/logo-mark.svg" alt="" className="profile-hero-mark" />
        </div>

        <div className="profile-hero-main">
          <div className="profile-avatar-lg">{initials(user.name)}</div>
          <div className="profile-hero-text">
            <div className="profile-status">
              <BadgeCheck size={14} />
              Sesión activa
            </div>
            <h2>{user.name}</h2>
            <p>
              {roleMeta?.label ?? user.role} · {user.department || 'Sin área'}
            </p>
          </div>
        </div>

        <div className="profile-hero-actions">
          <div className="profile-chip">
            <Leaf size={14} />
            Cementos Progreso Ambiente
          </div>
          {isDirectoryAdmin && (
            <>
              <Link to="/usuarios" className="btn-secondary-link">
                <Users size={16} />
                Gestionar usuarios
              </Link>
              <Link to="/accesos" className="btn-secondary-link">
                <KeyRound size={16} />
                Accesos por rol
              </Link>
            </>
          )}
          <button type="button" className="btn-ghost-danger" onClick={handleLogout}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </section>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-label">Organización</span>
          <strong>CEMPRO</strong>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-label">Módulo</span>
          <strong>Ambiente</strong>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-label">Acceso</span>
          <strong>{roleMeta?.label ?? user.role}</strong>
        </div>
      </div>

      <section className="profile-cards">
        {fields.map(({ label, value, icon: Icon, hint }) => (
          <article key={label} className="profile-info-card">
            <div className="profile-info-icon">
              <Icon size={18} />
            </div>
            <div className="profile-info-body">
              <span className="profile-info-label">{label}</span>
              <strong>{value}</strong>
              <small>{hint}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="profile-note content-panel">
        <h3>Permisos del rol</h3>
        {loadingRole ? (
          <p className="profile-perms-loading">
            <Loader2 className="hc-spin" size={16} /> Cargando desde catálogo…
          </p>
        ) : (
          <>
            <p>
              {roleMeta?.description ??
                ROLE_FALLBACK[user.role]?.description ??
                'Sin descripción de rol.'}
            </p>
            <ul className="profile-perms">
              {permissions.map((p) => (
                <li key={p}>{PERMISSION_LABELS[p] ?? p}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
