import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Building2,
  Leaf,
  LogOut,
  Mail,
  Shield,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

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
      value: user.role,
      icon: Shield,
      hint: 'Nivel de permisos',
    },
    {
      label: 'Departamento',
      value: user.department,
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
              {user.role} · {user.department}
            </p>
          </div>
        </div>

        <div className="profile-hero-actions">
          <div className="profile-chip">
            <Leaf size={14} />
            Cementos Progreso Ambiente
          </div>
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
          <strong>Administrador</strong>
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
        <h3>Gestión ambiental</h3>
        <p>
          Esta cuenta da acceso a reportes, entrada de datos y el mapa de
          operaciones de Cementos Progreso. Los cambios de perfil se gestionan
          con el administrador del sistema.
        </p>
      </section>
    </div>
  )
}
