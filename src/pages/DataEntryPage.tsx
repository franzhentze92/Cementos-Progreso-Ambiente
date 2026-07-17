import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AgroConsumoAguaPage } from './AgroConsumoAguaPage'
import { AgroResiduosPage } from './AgroResiduosPage'
import { AgroInspeccionesPage } from './AgroInspeccionesPage'
import { AgroIncidentesPage } from './AgroIncidentesPage'
import { AgroMonitoreosPage } from './AgroMonitoreosPage'
import { AgroCapacitacionesPage } from './AgroCapacitacionesPage'
import { AgroLicenciasPage } from './AgroLicenciasPage'
import { AgroCompostajePage } from './AgroCompostajePage'
import { AgroNdaCascoVerdePage } from './AgroNdaCascoVerdePage'
import { AgroNdaGeneralPage } from './AgroNdaGeneralPage'
import { AgroGestionTramitesPage } from './AgroGestionTramitesPage'
import { AliconIncidentesPage } from './AliconIncidentesPage'
import { AliconInspeccionesPage } from './AliconInspeccionesPage'
import { DescargaBarcosInspeccionesPage } from './DescargaBarcosInspeccionesPage'
import { AliconMonitoreosPage } from './AliconMonitoreosPage'
import { CarbonDataEntryPage } from './CarbonDataEntryPage'
import { ModulePlaceholder } from '../components/ModulePlaceholder'
import {
  ProjectScopeFilter,
  useSelectedProjectScope,
} from '../components/ProjectScopeFilter'
import {
  getOperationalModule,
  isProjectScope,
  type ProjectScope,
} from '../data/operationalModules'
import { useAuth } from '../context/AuthContext'

function renderScopedEntry(scope: ProjectScope, moduleId: string) {
  if (scope === 'agroprogreso' && moduleId === 'consumo-de-agua') {
    return <AgroConsumoAguaPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'gestion-de-residuos') {
    return <AgroResiduosPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'inspeccion-ambiental') {
    return <AgroInspeccionesPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'incidentes-ambientales') {
    return <AgroIncidentesPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'monitoreo-ambiental') {
    return <AgroMonitoreosPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'capacitaciones') {
    return <AgroCapacitacionesPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'licencias-ambientales') {
    return <AgroLicenciasPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'compostaje') {
    return <AgroCompostajePage />
  }
  if (scope === 'agroprogreso' && moduleId === 'nda-casco-verde') {
    return <AgroNdaCascoVerdePage />
  }
  if (scope === 'agroprogreso' && moduleId === 'nda-general') {
    return <AgroNdaGeneralPage />
  }
  if (scope === 'agroprogreso' && moduleId === 'gestion-de-tramites') {
    return <AgroGestionTramitesPage />
  }
  if (scope === 'planta-alicon' && moduleId === 'incidentes-ambientales') {
    return <AliconIncidentesPage />
  }
  if (scope === 'planta-alicon' && moduleId === 'inspeccion-ambiental') {
    return <AliconInspeccionesPage />
  }
  if (scope === 'descarga-barcos' && moduleId === 'inspeccion-ambiental') {
    return <DescargaBarcosInspeccionesPage />
  }
  if (scope === 'planta-alicon' && moduleId === 'monitoreo-ambiental') {
    return <AliconMonitoreosPage />
  }
  if (scope === 'planta-alicon' && moduleId === 'huella-de-carbono') {
    return <CarbonDataEntryPage />
  }
  return null
}

/** Redirige /entrada-datos/:scope/:moduleId → /entrada-datos/:moduleId?proyecto= */
export function LegacyEntradaRedirect() {
  const { scope = '', moduleId = '' } = useParams()
  if (isProjectScope(scope) && getOperationalModule(moduleId)) {
    return (
      <Navigate
        to={`/entrada-datos/${moduleId}?proyecto=${scope}`}
        replace
      />
    )
  }
  return <Navigate to="/entrada-datos/gestion-de-residuos" replace />
}

export function DataEntryPage() {
  const { moduleId = '' } = useParams()
  const [params] = useSearchParams()
  const { canAccessModule, accessibleScopesFor } = useAuth()
  const def = getOperationalModule(moduleId)
  const scope = useSelectedProjectScope('entrada-datos', moduleId)

  void params

  if (!def || !def.entrada) {
    return (
      <ModulePlaceholder
        section="Entrada de Datos"
        title="Módulo no encontrado"
        description="Este módulo no existe en Entrada de Datos."
        mode="entry"
      />
    )
  }

  if (!canAccessModule(`entrada-datos.${moduleId}`)) {
    return (
      <ModulePlaceholder
        section="Entrada de Datos"
        title={def.label}
        description="No tienes acceso a este módulo."
        mode="entry"
      />
    )
  }

  const available = accessibleScopesFor('entrada-datos', moduleId)
  if (available.length === 0) {
    return (
      <ModulePlaceholder
        section="Entrada de Datos"
        title={def.label}
        description="No hay proyectos disponibles para tu rol en este módulo."
        mode="entry"
      />
    )
  }

  const body =
    scope && isProjectScope(scope)
      ? renderScopedEntry(scope, moduleId)
      : null

  return (
    <div className="module-with-scope">
      <ProjectScopeFilter section="entrada-datos" moduleId={moduleId} />
      {body ?? (
        <ModulePlaceholder
          section="Entrada de Datos"
          title={def.label}
          mode="entry"
        />
      )}
    </div>
  )
}
