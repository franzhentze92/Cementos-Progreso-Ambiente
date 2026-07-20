import { AgroMonitoreosReportPage } from './AgroMonitoreosReportPage'
import { AliconMonitoreosReportPage } from './AliconMonitoreosReportPage'
import {
  PROJECT_SCOPE_LABELS,
  scopesLabel,
  type ProjectScope,
} from '../data/operationalModules'

/**
 * Monitoreo Agro y Alicón usan modelos distintos; en “Todos”
 * se muestran ambos reportes apilados.
 */
export function MonitoreoAmbientalReportPage({
  scopes,
}: {
  scopes: ProjectScope[]
}) {
  const showAgro = scopes.includes('agroprogreso')
  const showAlicon = scopes.includes('planta-alicon')
  const multi = scopes.length > 1

  if (!showAgro && !showAlicon) {
    return (
      <div className="carbon-page">
        <p className="agro-report-footnote">
          No hay proyectos de monitoreo disponibles para tu rol.
        </p>
      </div>
    )
  }

  if (showAgro && !showAlicon) return <AgroMonitoreosReportPage />
  if (showAlicon && !showAgro) return <AliconMonitoreosReportPage />

  return (
    <div className="module-aggregate-stack">
      <div className="module-aggregate-banner">
        <strong>{scopesLabel(scopes)}</strong>
        <span>
          Cumplimiento / control: Agroprogreso y Alicón muestran primero
          resultados de laboratorio; el cronograma de ejecuciones Alicón es
          aparte.
        </span>
      </div>
      {showAgro ? (
        <section className="module-aggregate-section">
          {multi ? (
            <h2 className="module-aggregate-title">
              {PROJECT_SCOPE_LABELS.agroprogreso}
            </h2>
          ) : null}
          <AgroMonitoreosReportPage />
        </section>
      ) : null}
      {showAlicon ? (
        <section className="module-aggregate-section">
          {multi ? (
            <h2 className="module-aggregate-title">
              {PROJECT_SCOPE_LABELS['planta-alicon']}
            </h2>
          ) : null}
          <AliconMonitoreosReportPage />
        </section>
      ) : null}
    </div>
  )
}
