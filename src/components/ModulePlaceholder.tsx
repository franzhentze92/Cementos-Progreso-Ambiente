import { Database, FileBarChart2, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function ModulePlaceholder({
  section,
  title,
  description,
  mode = 'view',
}: {
  section: string
  title: string
  description?: string
  mode?: 'view' | 'entry'
}) {
  const Icon: LucideIcon = mode === 'entry' ? Database : FileBarChart2
  const defaultCopy =
    mode === 'entry'
      ? 'Estamos preparando este espacio para la captura de datos ambientales. Muy pronto podrás registrar indicadores desde aquí.'
      : 'Esta sección está lista para conectar la visualización del módulo. Por ahora muestra un placeholder mientras integramos los datos del Excel de Desempeño Ambiental.'

  return (
    <div className="coming-soon-page">
      <div className="page-header">
        <h1>
          {section} — {title}
        </h1>
        <p>
          {description ??
            (mode === 'entry'
              ? 'Módulo de captura para indicadores y reportes ambientales.'
              : 'Visualización y análisis del módulo ambiental seleccionado.')}
        </p>
      </div>

      <div className="coming-soon-card">
        <div className="coming-soon-glow" aria-hidden />
        <div className="coming-soon-icon-wrap">
          <Icon size={36} strokeWidth={1.6} />
          <span className="coming-soon-badge">
            <Sparkles size={14} />
            Pronto
          </span>
        </div>

        <p className="coming-soon-kicker">{section}</p>
        <h2>{title}</h2>
        <p className="coming-soon-copy">{defaultCopy}</p>

        <div className="coming-soon-bars" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
