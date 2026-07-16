import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, KeyRound, UserRound, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function TopBar({
  onToggleSidebar,
  sidebarOpen = false,
}: {
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
}) {
  const { user, logout, isDirectoryAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="topbar-title">
          <span className="topbar-title-full">Cementos Progreso Ambiente</span>
          <span className="topbar-title-short">CEMPRO Ambiente</span>
        </span>
      </div>

      <div className="profile-menu" ref={menuRef}>
        <button
          type="button"
          className="profile-trigger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="avatar">{user ? initials(user.name) : '?'}</span>
          <span className="profile-name">{user?.name}</span>
        </button>

        {open && (
          <div className="dropdown" role="menu">
            <Link to="/perfil" onClick={() => setOpen(false)} role="menuitem">
              <UserRound size={16} />
              Perfil
            </Link>
            {isDirectoryAdmin && (
              <>
                <Link to="/usuarios" onClick={() => setOpen(false)} role="menuitem">
                  <Users size={16} />
                  Usuarios
                </Link>
                <Link to="/accesos" onClick={() => setOpen(false)} role="menuitem">
                  <KeyRound size={16} />
                  Accesos
                </Link>
              </>
            )}
            <button type="button" className="danger" onClick={handleLogout} role="menuitem">
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
