import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { EnvironmentalChatbot } from './EnvironmentalChatbot'
import { ModuleGuard } from './ModuleGuard'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuth } from '../context/AuthContext'

const MOBILE_MQ = '(max-width: 1100px), (hover: none) and (pointer: coarse)'

function useIsMobileNav() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const isMobile = useIsMobileNav()
  const location = useLocation()
  const { canAccessModule } = useAuth()
  const showChatbot = canAccessModule('chatbot')

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    if (!isMobile) return
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, sidebarOpen])

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  function clearCloseTimer() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function openSidebar() {
    clearCloseTimer()
    setSidebarOpen(true)
  }

  function closeSidebar() {
    clearCloseTimer()
    setSidebarOpen(false)
  }

  function toggleSidebar() {
    clearCloseTimer()
    setSidebarOpen((v) => !v)
  }

  function scheduleCloseSidebar() {
    if (isMobile) return
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => {
      setSidebarOpen(false)
      closeTimer.current = null
    }, 180)
  }

  return (
    <div
      className={`app-shell${sidebarOpen ? ' sidebar-open' : ''}${isMobile ? ' is-mobile' : ''}`}
    >
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Cerrar menú"
        tabIndex={sidebarOpen ? 0 : -1}
        onClick={closeSidebar}
      />

      <Sidebar
        onMouseEnter={isMobile ? undefined : openSidebar}
        onMouseLeave={isMobile ? undefined : scheduleCloseSidebar}
        onNavigate={isMobile ? closeSidebar : undefined}
      />

      <TopBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

      <main className="main-content" ref={mainRef}>
        <div className="main-content-body">
          <ModuleGuard>
            <Outlet />
          </ModuleGuard>
        </div>
        <footer className="app-footer">
          <img src="/logo-mark.svg" alt="" aria-hidden />
          <span>Powered by Cementos Progreso</span>
        </footer>
      </main>

      {showChatbot && <EnvironmentalChatbot />}
    </div>
  )
}
