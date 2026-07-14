import { useParams } from 'react-router-dom'
import { Database, Sparkles } from 'lucide-react'
import { CarbonDataEntryPage } from './CarbonDataEntryPage'

const TITLES: Record<string, string> = {
  db1: 'DB1',
  db2: 'DB2',
  db3: 'DB3',
  db4: 'DB4',
  'huella-de-carbono': 'Huella de Carbono',
}

export function DataEntryPage() {
  const { entryId = 'db1' } = useParams()

  if (entryId === 'huella-de-carbono') {
    return <CarbonDataEntryPage />
  }

  const title = TITLES[entryId] ?? 'Entrada de Datos'

  return (
    <div className="coming-soon-page">
      <div className="page-header">
        <h1>Entrada de Datos — {title}</h1>
        <p>Módulo de captura para indicadores y reportes ambientales.</p>
      </div>

      <div className="coming-soon-card">
        <div className="coming-soon-glow" aria-hidden />
        <div className="coming-soon-icon-wrap">
          <Database size={36} strokeWidth={1.6} />
          <span className="coming-soon-badge">
            <Sparkles size={14} />
            Pronto
          </span>
        </div>

        <p className="coming-soon-kicker">{title}</p>
        <h2>Entrada de Datos para Reportes — Próximamente</h2>
        <p className="coming-soon-copy">
          Estamos preparando este espacio para la captura y carga de datos
          ambientales. Muy pronto podrás registrar indicadores para tus reportes
          desde aquí.
        </p>

        <div className="coming-soon-bars" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
