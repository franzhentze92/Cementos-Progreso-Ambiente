import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { CarbonFootprintPage } from './CarbonFootprintPage'
import { AgroConsumoAguaReportPage } from './AgroConsumoAguaReportPage'
import { AgroResiduosReportPage } from './AgroResiduosReportPage'
import { AgroInspeccionesReportPage } from './AgroInspeccionesReportPage'
import { AgroIncidentesReportPage } from './AgroIncidentesReportPage'
import { AgroCapacitacionesReportPage } from './AgroCapacitacionesReportPage'
import { AgroLicenciasReportPage } from './AgroLicenciasReportPage'
import { AgroCompostajeReportPage } from './AgroCompostajeReportPage'
import { AgroNdaCascoVerdeReportPage } from './AgroNdaCascoVerdeReportPage'
import { AgroNdaGeneralReportPage } from './AgroNdaGeneralReportPage'
import { AgroGestionTramitesReportPage } from './AgroGestionTramitesReportPage'
import { MonitoreoAmbientalReportPage } from './MonitoreoAmbientalReportPage'
import { ModulePlaceholder } from '../components/ModulePlaceholder'
import {
  ProjectScopeFilter,
  useSelectedProjectScope,
} from '../components/ProjectScopeFilter'
import {
  ALL_PROJECTS,
  getOperationalModule,
  isProjectScope,
  resolveScopesForSelection,
  type ProjectScope,
} from '../data/operationalModules'
import { useAuth } from '../context/AuthContext'

function renderScopedReport(scope: ProjectScope, moduleId: string) {
  if (scope === 'planta-alicon' && moduleId === 'huella-de-carbono') {
    return <CarbonFootprintPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'consumo-de-agua') {
    return <AgroConsumoAguaReportPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'gestion-de-residuos') {
    return <AgroResiduosReportPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'capacitaciones') {
    return <AgroCapacitacionesReportPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'licencias-ambientales') {
    return <AgroLicenciasReportPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'compostaje') {
    return <AgroCompostajeReportPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'nda-casco-verde') {
    return <AgroNdaCascoVerdeReportPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'nda-general') {
    return <AgroNdaGeneralReportPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'gestion-de-tramites') {
    return <AgroGestionTramitesReportPage />
  }
  return null
}

function renderMultiScopeReport(scopes: ProjectScope[], moduleId: string) {
  if (moduleId === 'inspeccion-ambiental') {
    return <AgroInspeccionesReportPage scopes={scopes} />
  }
  if (moduleId === 'incidentes-ambientales') {
    return <AgroIncidentesReportPage scopes={scopes} />
  }
  if (moduleId === 'monitoreo-ambiental') {
    return <MonitoreoAmbientalReportPage scopes={scopes} />
  }
  if (scopes.length === 1) {
    return renderScopedReport(scopes[0], moduleId)
  }
  return null
}

/** Redirige /operaciones/:scope/:moduleId → /operaciones/:moduleId?proyecto= */
export function LegacyOperacionesRedirect() {
  const { scope = '', moduleId = '' } = useParams()
  if (isProjectScope(scope) && getOperationalModule(moduleId)) {
    return (
      <Navigate
        to={`/operaciones/${moduleId}?proyecto=${scope}`}
        replace
      />
    )
  }
  return <Navigate to="/operaciones/gestion-de-residuos" replace />
}

export function OperacionesPage() {
  const { moduleId = '' } = useParams()
  const [params] = useSearchParams()
  const { canAccessModule, accessibleScopesFor } = useAuth()
  const def = getOperationalModule(moduleId)
  const selection = useSelectedProjectScope('operaciones', moduleId)

  void params

  if (!def || !def.operaciones) {
    return (
      <ModulePlaceholder
        section="Operaciones"
        title="Módulo no encontrado"
        description="Este módulo no existe en Operaciones."
      />
    )
  }

  if (!canAccessModule(`operaciones.${moduleId}`)) {
    return (
      <ModulePlaceholder
        section="Operaciones"
        title={def.label}
        description="No tienes acceso a este módulo."
      />
    )
  }

  const available = accessibleScopesFor('operaciones', moduleId)
  if (available.length === 0) {
    return (
      <ModulePlaceholder
        section="Operaciones"
        title={def.label}
        description="No hay proyectos disponibles para tu rol en este módulo."
      />
    )
  }

  const scopes = resolveScopesForSelection(selection, available)
  const body = renderMultiScopeReport(scopes, moduleId)

  return (
    <div className="module-with-scope">
      <ProjectScopeFilter section="operaciones" moduleId={moduleId} />
      {body ?? (
        <ModulePlaceholder
          section="Operaciones"
          title={def.label}
          description="Visualización de indicadores operativos ambientales."
        />
      )}
    </div>
  )
}

export { ALL_PROJECTS }
