import { useParams } from 'react-router-dom'
import { FileBarChart2 } from 'lucide-react'

const TITLES: Record<string, string> = {
  'reporte-1': 'Reporte 1',
  'reporte-2': 'Reporte 2',
  'reporte-3': 'Reporte 3',
  'reporte-4': 'Reporte 4',
  'huella-de-carbono': 'Huella de Carbono',
}

export function ReportPage() {
  const { reportId = 'reporte-1' } = useParams()
  const title = TITLES[reportId] ?? 'Reporte'

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
