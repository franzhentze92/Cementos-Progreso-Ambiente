import { useParams } from 'react-router-dom'
import { FileBarChart2 } from 'lucide-react'
import { CarbonFootprintPage } from './CarbonFootprintPage'

const TITLES: Record<string, string> = {
  'reporte-1': 'Reporte 1',
  'reporte-2': 'Reporte 2',
  'reporte-3': 'Reporte 3',
  'reporte-4': 'Reporte 4',
  'huella-de-carbono': 'Huella de Carbono',
}

const POWER_BI_EMBED_URL =
  'https://app.powerbi.com/singleSignOn?bookmarkGuid=326ef15e-776c-4d0b-9b94-6e703353a785&Context=share-report&ctid=411bbe47-fbe5-4025-a6ae-27963dadb346&pbi_source=mobile_ios&disablecdnExpiration=1784083726'

const EMBEDDED_REPORTS = new Set([
  'reporte-1',
  'reporte-2',
  'reporte-3',
  'reporte-4',
])

export function ReportPage() {
  const { reportId = 'reporte-1' } = useParams()
  const title = TITLES[reportId] ?? 'Reporte'
  const showEmbed = EMBEDDED_REPORTS.has(reportId)

  if (reportId === 'huella-de-carbono') {
    return <CarbonFootprintPage />
  }

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <p>Visualización y análisis del reporte ambiental seleccionado.</p>
      </div>

      {showEmbed ? (
        <div className="report-embed-panel">
          <iframe
            className="report-embed-frame"
            src={POWER_BI_EMBED_URL}
            title={`Power BI — ${title}`}
            allowFullScreen
          />
        </div>
      ) : (
        <div className="content-panel">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileBarChart2 size={22} color="#047935" />
            {title}
          </h2>
          <p>
            Esta sección está lista para conectar la visualización de datos del{' '}
            {title.toLowerCase()}. Por ahora muestra un placeholder para la
            navegación del módulo de Reportes.
          </p>
        </div>
      )}
    </div>
  )
}
