import { useParams } from 'react-router-dom'
import { FileBarChart2 } from 'lucide-react'
import { CarbonFootprintPage } from './CarbonFootprintPage'

const TITLES: Record<string, string> = {
  'reporte-1': 'Reporte 1',
  'reporte-2': 'Reporte 2',
  'reporte-3': 'Reporte 3',
  'reporte-4': 'Reporte 4',
  'desempeno-ambiental': 'Desempeño Ambiental',
  'huella-de-carbono': 'Huella de Carbono',
}

const DESEMPENO_AMBIENTAL_EMBED_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiMDIzMTZmODktOGI1NC00YjI4LWI4MTYtMTRmZjAxZTgzZDRiIiwidCI6IjlmMmQzMzdhLTQ5Y2QtNDczZi1iZDI4LTI5NGNkNWYzMThhYiIsImMiOjR9'

export function ReportPage() {
  const { reportId = 'reporte-1' } = useParams()
  const title = TITLES[reportId] ?? 'Reporte'
  const isDesempeno = reportId === 'desempeno-ambiental'

  if (reportId === 'huella-de-carbono') {
    return <CarbonFootprintPage />
  }

  if (isDesempeno) {
    return (
      <div className="report-page report-page--desempeno">
        <div className="page-header page-header--compact">
          <h1>{title}</h1>
        </div>
        <div className="report-embed-panel report-embed-panel--wide">
          <iframe
            className="report-embed-frame report-embed-frame--wide"
            src={DESEMPENO_AMBIENTAL_EMBED_URL}
            title="Reporte Desempeño Ambiental CEMPRO"
            width={1024}
            height={1060}
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <p>Visualización y análisis del reporte ambiental seleccionado.</p>
      </div>

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
    </div>
  )
}
