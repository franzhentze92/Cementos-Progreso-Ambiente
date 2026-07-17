import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export type HubLink = {
  to: string
  label: string
  description: string
  icon: LucideIcon
}

export function SectionHubPage({
  kicker,
  title,
  description,
  links,
}: {
  kicker: string
  title: string
  description: string
  links: HubLink[]
}) {
  const { canAccessPath, isDirectoryAdmin } = useAuth()

  const visible = links.filter((link) => {
    if (link.to === '/biblioteca' && !isDirectoryAdmin) return false
    return canAccessPath(link.to)
  })

  return (
    <div className="carbon-page fase1-page section-hub-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <section className="carbon-section">
        <div className="section-hub-grid">
          {visible.map((link) => (
            <Link key={link.to} to={link.to} className="section-hub-card">
              <span className="section-hub-card-icon">
                <link.icon size={22} />
              </span>
              <span className="section-hub-card-body">
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </span>
            </Link>
          ))}
        </div>
        {visible.length === 0 && (
          <p className="section-hub-empty">
            No tiene acceso a los módulos de esta sección. Contacte al
            administrador.
          </p>
        )}
      </section>
    </div>
  )
}
