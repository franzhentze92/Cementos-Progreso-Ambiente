import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  NAV_SECTIONS,
  pathMatchesPrefixes,
  type NavBranch,
  type NavLeaf,
  type NavNode,
  type NavSection,
} from '../data/navTree'

function isBranch(node: NavNode): node is NavBranch {
  return node.kind === 'branch'
}

function isLeaf(node: NavNode): node is NavLeaf {
  return node.kind === 'leaf'
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

  const visibleSections = useMemo(() => {
    const see = (leaf: NavLeaf) => {
      if (leaf.alwaysShow) return true
      if (leaf.directoryAdminOnly && !isDirectoryAdmin) return false
      return canAccessPath(leaf.to)
    }
    return NAV_SECTIONS.map((section) => {
      const items = section.items
        .map((node) => {
          if (isLeaf(node)) {
            return see(node) ? node : null
          }
          const children = node.children.filter(see)
          if (children.length === 0) return null
          return { ...node, children }
        })
        .filter((n): n is NavNode => n != null)

      return { ...section, items }
    }).filter((s) => s.items.length > 0)
  }, [canAccessPath, isDirectoryAdmin])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {}
      for (const s of NAV_SECTIONS) {
        init[s.id] = pathMatchesPrefixes(path, s.matchPrefixes)
      }
      // Inicio abierto por defecto si no hay match
      if (!Object.values(init).some(Boolean)) init.inicio = true
      return init
    },
  )

  const [openBranches, setOpenBranches] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {}
      for (const s of NAV_SECTIONS) {
        for (const node of s.items) {
          if (isBranch(node)) {
            init[node.id] = pathMatchesPrefixes(path, node.matchPrefixes)
          }
        }
      }
      return init
    },
  )

  // Al navegar: solo la sección/rama de la ruta activa queda abierta.
  useEffect(() => {
    const nextSections: Record<string, boolean> = {}
    let matchedSection = false
    for (const s of NAV_SECTIONS) {
      const open = pathMatchesPrefixes(path, s.matchPrefixes)
      nextSections[s.id] = open
      if (open) matchedSection = true
    }
    if (!matchedSection) nextSections.inicio = true
    setOpenSections(nextSections)

    const nextBranches: Record<string, boolean> = {}
    for (const s of NAV_SECTIONS) {
      for (const node of s.items) {
        if (isBranch(node)) {
          nextBranches[node.id] = pathMatchesPrefixes(path, node.matchPrefixes)
        }
      }
    }
    setOpenBranches(nextBranches)
  }, [path])

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const willOpen = !prev[id]
      if (!willOpen) return { ...prev, [id]: false }
      // Accordion: al abrir una sección, se cierran las demás
      const next: Record<string, boolean> = {}
      for (const s of NAV_SECTIONS) next[s.id] = s.id === id
      return next
    })
  }

  function toggleBranch(id: string) {
    setOpenBranches((prev) => {
      const willOpen = !prev[id]
      if (!willOpen) return { ...prev, [id]: false }
      // Accordion entre ramas del mismo nivel
      const next: Record<string, boolean> = { ...prev }
      for (const s of NAV_SECTIONS) {
        for (const node of s.items) {
          if (isBranch(node)) next[node.id] = node.id === id
        }
      }
      return next
    })
  }

  function renderLeaf(leaf: NavLeaf, nested = false) {
    return (
      <NavLink
        key={leaf.to}
        to={leaf.to}
        end={nested}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        title={leaf.title ?? leaf.label}
        onClick={onNavigate}
      >
        <leaf.icon size={nested ? 14 : 20} />
        <span className="nav-label">{leaf.label}</span>
      </NavLink>
    )
  }

  function renderBranch(branch: NavBranch) {
    const active = pathMatchesPrefixes(path, branch.matchPrefixes)
    const open = !!openBranches[branch.id]
    return (
      <div key={branch.id} className="nav-nested-group">
        <button
          type="button"
          className={`nav-group-btn nav-group-btn--nested${active ? ' active' : ''}${open ? ' expanded' : ''}`}
          onClick={() => toggleBranch(branch.id)}
          title={branch.title ?? branch.label}
          aria-expanded={open}
        >
          <branch.icon />
          <span className="nav-label">{branch.label}</span>
          <ChevronRight
            className={`nav-chevron${open ? ' open' : ''}`}
            size={16}
          />
        </button>
        <div className={`nav-sub nav-sub--nested${open ? ' open' : ''}`}>
          {branch.children.map((child) => renderLeaf(child, true))}
        </div>
      </div>
    )
  }

  function renderSection(section: NavSection) {
    const sectionActive = pathMatchesPrefixes(path, section.matchPrefixes)
    const open = !!openSections[section.id]
    const SectionIcon = section.icon

    return (
      <div key={section.id} className="nav-section">
        <button
          type="button"
          className={`nav-section-btn${sectionActive ? ' active' : ''}${open ? ' expanded' : ''}`}
          onClick={() => toggleSection(section.id)}
          title={section.label}
          aria-expanded={open}
          aria-label={section.label}
        >
          <SectionIcon className="nav-section-icon" size={20} />
          <span className="nav-section-label">{section.label}</span>
          <ChevronRight
            className={`nav-chevron${open ? ' open' : ''}`}
            size={14}
          />
        </button>
        <div className={`nav-section-body${open ? ' open' : ''}`}>
          {section.items.map((node) =>
            isBranch(node) ? renderBranch(node) : renderLeaf(node),
          )}
        </div>
      </div>
    )
  }

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

      <nav className="sidebar-nav">{visibleSections.map(renderSection)}</nav>
    </aside>
  )
}
